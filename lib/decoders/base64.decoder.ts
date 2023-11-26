import { getHeader } from '@cryptella/utils/headers';
import { concat } from '../helpers.js';
import { decodeBase64ArrayBuffer } from '../base64.js';
import type { IHeader } from '@cryptella/utils/headers';
import type { IParseOptions } from '../index.js';

export function base64Decoder(
  onPart: (headers: IHeader[], body: Uint8Array) => void
) {
  return (headers: IHeader[], options: IParseOptions) => {
    const encoding = getHeader(headers, 'content-transfer-encoding');
    if (encoding?.value === 'base64') {
      let buf = new Uint8Array();
      return async (chunk: Uint8Array | null) => {
        if (chunk) {
          buf = concat(buf, decodeBase64ArrayBuffer(chunk));
        } else {
          onPart(headers, buf);
        }
      };
    }
    return null;
  };
}

export function base64DecoderStream(
  onPart: (headers: IHeader[], stream: ReadableStream<Uint8Array>) => void
) {
  return (headers: IHeader[], options: IParseOptions) => {
    const encoding = getHeader(headers, 'content-transfer-encoding');
    if (encoding?.value === 'base64') {
      let streamController: ReadableStreamController<any> | null = null;
      const stream = new ReadableStream({
        start(ctrl) {
          streamController = ctrl;
        },
      });
      onPart(headers, stream);
      return async (chunk: Uint8Array | null) => {
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
