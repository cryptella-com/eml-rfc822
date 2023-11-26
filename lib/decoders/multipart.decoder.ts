import { getHeader, parseHeaders, parseHeaderValueParams } from '@cryptella/utils/headers';
import { AB_CR_LF, AB_LF, CHAR_EM } from '../consts.js';
import { concat, compare, decode, encode, readLine } from '../helpers.js';
import { getBodyDecoder } from '../index.js';
import type { IHeader } from '@cryptella/utils/headers';
import type { IParseOptions, TBodyDecoder } from '../index.js';

export interface IMultipartDecoderOptions {
  deep?: boolean;
}

function parseMultipartBody(
  options: IParseOptions,
  decoderOptions: IMultipartDecoderOptions,
  boundary: Uint8Array,
  onPart: (parsedHeaders: IHeader[], body: Uint8Array, headers: Uint8Array) => Promise<void> | void
) {
  let headers = new Uint8Array();
  let body = new Uint8Array();
  let parsedHeaders: IHeader[] = [];
  let readingHeaders = false;
  let readingBody = false;
  let tmp = new Uint8Array();
  let prevBoundaries: Uint8Array[] = [];
  let decoder: TBodyDecoder | null = null;
  return async (chunk: Uint8Array | null) => {
    let lastPos = 0;
    if (chunk === null) {
      if (parsedHeaders.length) {
        await onPart(parsedHeaders, body, headers);
      }
      return;
    }
    tmp = concat(tmp, chunk);
    for (let { cr, cursor, line } of readLine(tmp)) {
      lastPos = cursor;
      if (
        line[0] === CHAR_EM &&
        line[1] === CHAR_EM &&
        compare(line.subarray(2, boundary.length + 2), boundary)
      ) {
        if (
          line[line.length - 1] === CHAR_EM &&
          line[line.length - 2] === CHAR_EM
        ) {
          // terminator
          if (prevBoundaries.length) {
            boundary = prevBoundaries.pop()!;
          }
        } else {
          // start
          readingHeaders = true;
        }
        if (parsedHeaders.length && readingBody) {
          if (decoder) {
            await decoder(null);
          }
          await onPart(parsedHeaders, body, headers);
        }
        parsedHeaders = [];
        readingBody = false;
        headers = new Uint8Array();
        body = new Uint8Array();
      } else if (line.length === 0 && headers.length && !readingBody) {
        parsedHeaders = parseHeaders(decode(headers));
        if (decoderOptions?.deep !== false) {
          if (options.decoders) {
            decoder = getBodyDecoder(parsedHeaders, options);
          }
          const contentType = getHeader(parsedHeaders, 'content-type');
          if (contentType?.value.startsWith('multipart/')) {
            const { params } = parseHeaderValueParams(contentType.value);
            if (params?.boundary) {
              prevBoundaries.push(boundary);
              boundary = encode(params.boundary);
            }
          }
        } else {
          body = concat(body, cr ? AB_CR_LF : AB_LF);
        }
        readingBody = true;
      } else if (readingBody) {
        if (decoder) {
          await decoder(line);
        } else {
          body = body.length ? concat(body, cr ? AB_CR_LF : AB_LF, line) : line;
        }
      } else if (readingHeaders) {
        headers = headers.length
          ? concat(headers, cr ? AB_CR_LF : AB_LF, line)
          : line;
      }
    }
    tmp = tmp.subarray(lastPos);
  };
}

export function multipartDecoder(
  onPart: (parsedHeaders: IHeader[], body: Uint8Array, headers: Uint8Array) => Promise<void> | void,
  decoderOptions: IMultipartDecoderOptions = {},
) {
  return (headers: IHeader[], options: IParseOptions) => {
    const contentType = getHeader(headers, 'content-type');
    if (contentType?.value.startsWith('multipart/')) {
      const { params } = parseHeaderValueParams(contentType.value);
      return parseMultipartBody(
        options,
        decoderOptions,
        encode(params!.boundary!),
        onPart,
      );
    }
    return null;
  };
}
