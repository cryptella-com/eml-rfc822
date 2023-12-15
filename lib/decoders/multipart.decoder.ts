import { getHeader, parseHeaders } from '../headers.js';
import { AB_CR_LF, AB_LF, CHAR_EM } from '../consts.js';
import { concat, compare, decode, encode, readLine } from '../helpers.js';
import { getBodyDecoder } from '../index.js';
import type { IHeader } from '../headers.js';
import type { IParseOptions, ParseCtx, TBodyDecoder } from '../index.js';

export interface IMultipartDecoderOptions {
  deep?: boolean;
}

function parseMultipartBody(
  options: IParseOptions,
  decoderOptions: IMultipartDecoderOptions,
  boundary: Uint8Array,
  onPart: (parsedHeaders: IHeader[], body: Uint8Array, headers: Uint8Array, ctx: ParseCtx) => Promise<void> | void
) {
  let headers = new Uint8Array();
  let body = new Uint8Array();
  let parsedHeaders: IHeader[] = [];
  let readingHeaders = false;
  let readingBody = false;
  let tmp = new Uint8Array();
  let decoder: TBodyDecoder | null = null;
  return async (chunk: Uint8Array | null, ctx: ParseCtx) => {
    ctx.boundary = boundary;
    let lastPos = 0;
    if (chunk === null) {
      if (parsedHeaders.length) {
        await onPart(parsedHeaders, body, headers, ctx);
      }
      return;
    }
    tmp = concat(tmp, chunk);
    for (let { cr, cursor, line } of readLine(tmp)) {
      const nl =  cr ? AB_CR_LF : AB_LF;
      lastPos = cursor;
      if (
        line[0] === CHAR_EM &&
        line[1] === CHAR_EM &&
        compare(line.subarray(2, boundary.length + 2), boundary)
      ) {
        const terminator = line[line.length - 1] === CHAR_EM && line[line.length - 2] === CHAR_EM;
        if (!terminator) {
          readingHeaders = true;
        }
        if (parsedHeaders.length && readingBody) {
          await onPart(parsedHeaders, body, headers, ctx);
        }
        parsedHeaders = [];
        readingBody = false;
        headers = new Uint8Array();
        body = new Uint8Array();
        if (decoder) {
          await decoder(null, ctx);
          ctx.boundary = boundary;
        }
        decoder = null;
      } else if (line.length === 0 && headers.length && !readingBody) {
        parsedHeaders = parseHeaders(decode(headers), options.parseHeaderParams);
        if (decoderOptions?.deep !== false) {
          if (options.decoders) {
            decoder = getBodyDecoder(parsedHeaders, options);
          }
        } else {
          body = concat(body, nl);
        }
        readingBody = true;
      } else if (readingBody) {
        body = body.length ? concat(body, nl, line) : line;
        if (decoder) {
          await decoder(concat(line, nl), ctx);
          ctx.boundary = boundary;
        }

      } else if (readingHeaders) {
        headers = headers.length
          ? concat(headers, nl, line)
          : line;
      }
    }
    tmp = tmp.subarray(lastPos);
  };
}

export function multipartDecoder(
  onPart: (parsedHeaders: IHeader[], body: Uint8Array, headers: Uint8Array, ctx: ParseCtx) => Promise<void> | void,
  decoderOptions: IMultipartDecoderOptions = {},
) {
  return (headers: IHeader[], options: IParseOptions) => {
    const contentType = getHeader(headers, 'content-type', true);
    if (contentType?.value.startsWith('multipart/')) {
      return parseMultipartBody(
        options,
        decoderOptions,
        encode(contentType.params!.boundary!),
        onPart,
      );
    }
    return null;
  };
}
