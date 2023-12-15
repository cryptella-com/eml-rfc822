import { getHeader } from '../headers.js';
import { encodeBase64ArrayBuffer } from '../base64.js';
import type { IHeader } from '../headers.js';
import type {
  ISerializeOptions,
  TBodyEncoder,
  TMultiPart,
} from '../serializer.js';

export interface IBase64EncoderOptions {
  attachments?: boolean;
  mimeTypes?: string[];
  lineWidth?: number;
}

function matchBase64Encoder(
  headers: IHeader[],
  options: IBase64EncoderOptions
) {
  if (options.attachments !== false) {
    const contentDisposition = getHeader(headers, 'content-disposition');
    if (contentDisposition?.value?.startsWith('attachment')) {
      return true;
    }
  }
  if (options.mimeTypes) {
    const contentType = getHeader(headers, 'content-type');
    if (contentType && options.mimeTypes.includes(contentType.value)) {
      return true;
    }
  }
  return false;
}

export function base64Encoder(
  encoderOptions: IBase64EncoderOptions = {}
): (headers: IHeader[], options: ISerializeOptions) => TBodyEncoder | null {
  const lineWidth = encoderOptions.lineWidth || 77;
  return (headers: IHeader[], options: ISerializeOptions) => {
    if (matchBase64Encoder(headers, encoderOptions)) {
      let offset = 0;
      if (!getHeader(headers, 'content-transfer-encoding')) {
        headers.push({
          name: 'content-transfer-encoding',
          params: null,
          value: 'base64',
        });
      }
      return (chunk: Uint8Array | TMultiPart | null) => {
        if (chunk instanceof Uint8Array) {
          const result = encodeBase64ArrayBuffer(
            chunk,
            lineWidth,
            offset ? lineWidth - (offset % lineWidth) : 0
          );
          offset += result.length;
          return [result];
        }
        return [];
      };
    }
    return null;
  };
}
