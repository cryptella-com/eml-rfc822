import { AB_CR_LF, AB_LF } from './consts.js';
import { concat, decode, readLine } from './helpers.js';
import { multipartDecoder, base64Decoder } from './decoders';
import { getHeader, parseHeaders } from './headers.js';
import type { IHeader } from './headers.js';

export type TBodyDecoder = (chunk: Uint8Array | null, ctx: ParseCtx) => Promise<void>;

export interface Multipart {
  attachment?: string;
  boundary: string;
  body: Uint8Array;
  contentType?: string;
  headers: IHeader[];
  parts: Multipart[];
  rawHeaders: Uint8Array;
}

export type ParseCtx = Record<string, any>;

export interface IParseOptions {
  decoders?: ((
    headers: IHeader[],
    options: IParseOptions
  ) => TBodyDecoder | null)[];
  onBodyChunk?: (chunk: Uint8Array | null, ctx: ParseCtx) => Promise<void> | void;
  onHeaders?: (headers: IHeader[], ctx: ParseCtx) => Promise<void> | void;
  parseHeaderParams?: boolean;
  readBody?: boolean;
}

export function getBodyDecoder(headers: IHeader[], options: IParseOptions) {
  if (options.decoders) {
    for (let fn of options.decoders) {
      const decoder = fn(headers, options);
      if (decoder) {
        return decoder;
      }
    }
  }
  return null;
}

export async function parse(
  stream: ReadableStream,
  options: IParseOptions = {}
) {
  let onBodyChunk: typeof options.onBodyChunk | null = options.onBodyChunk;
  let decoder: TBodyDecoder | null = null;
  let readingBody = false;
  let rawHeaders = new Uint8Array();
  let headers: IHeader[] = [];
  let body = new Uint8Array();
  let tmp = new Uint8Array();
  let canceled: boolean = false;
  let offset: number = 0;
  let ctx: ParseCtx = {};
  const read = async () => {
    let line: { cr: boolean; cursor: number; line: Uint8Array } | null = null;
    if (readingBody && onBodyChunk) {
      const chunk = !offset ? tmp.subarray(rawHeaders.length) : tmp;
      body = concat(body, chunk);
      await onBodyChunk(chunk, ctx);
      if (decoder || options.readBody === false) {
        return tmp.length;
      }
    }
    for (line of readLine(tmp)) {
      if (line.line.length === 0 && rawHeaders.length && !readingBody) {
        // end of headers
        headers = parseHeaders(decode(rawHeaders), options.parseHeaderParams);
        if (options.onHeaders) {
          await options.onHeaders(headers, ctx);
        }
        readingBody = true;
        if (options.readBody === false && !onBodyChunk && !decoder) {
          return false;
        }
        if (options.decoders?.length) {
          decoder = getBodyDecoder(headers, options);
          if (decoder) {
            onBodyChunk = decoder;
            break;
          }
        }
        if (options.readBody === false) {
          break;
        }
      } else if (readingBody) {
        body = body.length
          ? concat(body, line.cr ? AB_CR_LF : AB_LF, line.line)
          : line.line;
      } else {
        rawHeaders = rawHeaders.length
          ? concat(rawHeaders, line.cr ? AB_CR_LF : AB_LF, line.line)
          : line.line;
      }
    }
    return line
      ? line.cursor + (line.cr ? AB_CR_LF.length : AB_LF.length)
      : null;
  };
  try {
    const reader = stream.getReader();
    let done: boolean;
    let value: Uint8Array | undefined;
    while ({ done, value } = await reader.read()) {
      if (done) {
        break;
      }
      if (value) {
        tmp = concat(tmp, value);
        const pos = await read();
        if (pos === false) {
          canceled = true;
          await stream.cancel();
          break;
        }
        if (pos) {
          offset = pos;
          tmp = tmp.subarray(pos);
        }
      }
    }
    if (!canceled) {
      await read();
    }
    if (onBodyChunk) {
      await onBodyChunk(null, ctx);
    }
  } catch (err) {
    if (!canceled) {
      throw err;
    }
  }
  return {
    body,
    headers,
    rawHeaders,
  };
}

export async function parseMultipart(eml: ReadableStream<Uint8Array>) {
  const message: Multipart = {
    boundary: '',
    body: new Uint8Array(),
    headers: [],
    parts: [],
    rawHeaders: new Uint8Array(),
  };
  let parts: Record<string, Multipart[]> = {};
  const getParts = (boundary: string) => {
    return (parts[boundary] || []).map((part) => {
      const partBoundary = getHeader(part.headers, 'content-type', true)?.params?.boundary || '';
      part.parts = getParts(partBoundary);
      return part;
    });
  };
  const { headers, body, rawHeaders } = await parse(eml, {
    decoders: [
      base64Decoder(async (headers, body, ctx) => {
        const boundary = ctx.boundary ? decode(ctx.boundary) : '';
        const filename = getHeader(headers, 'content-disposition', true)?.params?.filename || '';
        if (parts[boundary]) {
          const part = parts[boundary][parts[boundary].length - 1];
          if (part) {
            part.attachment = filename;
            part.body = body;
          }
        }
      }),
      multipartDecoder(async (headers, body, rawHeaders, ctx) => {
        const contentType = getHeader(headers, 'content-type', true)?.value;
        const boundary = ctx.boundary ? decode(ctx.boundary) : '';
        if (!parts[boundary]) {
          parts[boundary] = [];
        }
        parts[boundary].push({
          boundary,
          body,
          contentType,
          headers,
          parts: [],
          rawHeaders,
        });
      }),
    ],
    onHeaders(headers) {
      const contentTypeHeader = getHeader(headers, 'content-type', true);
      message.boundary = getHeader(headers, 'content-type', true)?.params?.boundary || '';
      if (contentTypeHeader?.value) {
        message.contentType = contentTypeHeader.value;
      }
    },
    parseHeaderParams: true,
  });
  message.headers = headers;
  message.body = body;
  message.rawHeaders = rawHeaders;
  message.parts = getParts(message.boundary);
  return message;
}
