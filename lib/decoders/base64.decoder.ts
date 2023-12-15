import { getHeader } from '../headers.js';
import { concat } from '../helpers.js';
import { decodeBase64ArrayBuffer } from '../base64.js';
import type { IHeader } from '../headers.js';
import type { IParseOptions, ParseCtx } from '../index.js';

export function base64Decoder(
  onPart: (headers: IHeader[], body: Uint8Array, ctx: ParseCtx) => void
) {
  return (headers: IHeader[], options: IParseOptions) => {
    const encoding = getHeader(headers, 'content-transfer-encoding');
    if (encoding?.value === 'base64') {
      let buf = new Uint8Array();
      return async (chunk: Uint8Array | null, ctx: ParseCtx) => {
        if (chunk) {
          buf = concat(buf, decodeBase64ArrayBuffer(chunk));
        } else {
          onPart(headers, buf, ctx);
        }
      };
    }
    return null;
  };
}

export function base64DecoderStream(
  onPart: (headers: IHeader[], stream: ReadableStream<Uint8Array>, ctx: ParseCtx) => void
) {
  return (headers: IHeader[], _options: IParseOptions) => {
    const encoding = getHeader(headers, 'content-transfer-encoding');
    if (encoding?.value === 'base64') {
      let streamController: ReadableStreamController<any> | null = null;
      let started = false;
      const stream = new ReadableStream({
        start(ctrl) {
          streamController = ctrl;
        },
      });
      return async (chunk: Uint8Array | null, ctx: ParseCtx) => {
        if (!started) {
          onPart(headers, stream, ctx);
          started = true;
        }
        if (streamController) {
          if (chunk) {
            streamController.enqueue(decodeBase64ArrayBuffer(chunk));
          } else {
            streamController.close();
          }
        }
      };
    }
    return null;
  };
}
