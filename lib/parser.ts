import { AB_CR_LF, AB_LF } from './consts';
import { concat, decode, readLine } from './helpers';
import { parseHeaders } from './headers';
import type { IHeader } from './headers';

export type TBodyDecoder = (chunk: Uint8Array | null) => Promise<void>;

export interface IParseOptions {
  decoders?: ((
    headers: IHeader[],
    options: IParseOptions
  ) => TBodyDecoder | null)[];
  onBodyChunk?: (chunk: Uint8Array | null) => Promise<void> | void;
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
  let headers = new Uint8Array();
  let parsedHeaders: IHeader[] = [];
  let body = new Uint8Array();
  let tmp = new Uint8Array();
  let chunk: Uint8Array;
  let canceled: boolean = false;
  let offset: number = 0;
  const read = async () => {
    let line: { cr: boolean; cursor: number; line: Uint8Array } | null = null;
    if (readingBody && onBodyChunk) {
      await onBodyChunk(!offset ? tmp.subarray(headers.length) : tmp);
      if (decoder || options.readBody === false) {
        return tmp.length;
      }
    }
    for (line of readLine(tmp)) {
      if (line.line.length === 0 && headers.length && !readingBody) {
        // end of headers
        parsedHeaders = parseHeaders(decode(headers));
        readingBody = true;
        if (options.readBody === false && !onBodyChunk && !decoder) {
          return false;
        }
        if (options.decoders?.length) {
          decoder = getBodyDecoder(parsedHeaders, options);
          if (decoder) {
            onBodyChunk = decoder;
          }
          break;
        }
        if (options.readBody === false) {
          break;
        }
      } else if (readingBody) {
        body = body.length
          ? concat(body, line.cr ? AB_CR_LF : AB_LF, line.line)
          : line.line;
      } else {
        headers = headers.length
          ? concat(headers, line.cr ? AB_CR_LF : AB_LF, line.line)
          : line.line;
      }
    }
    return line
      ? line.cursor + (line.cr ? AB_CR_LF.length : AB_LF.length)
      : null;
  };
  try {
    for await (chunk of stream) {
      tmp = concat(tmp, chunk);
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
    if (!canceled) {
      await read();
    }
    if (onBodyChunk) {
      await onBodyChunk(null);
    }
  } catch (err) {
    if (!canceled) {
      throw err;
    }
  }
  return {
    body,
    headers: parsedHeaders,
  };
}
