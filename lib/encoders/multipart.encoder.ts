import { getHeader, parseHeaderValueParams } from '../headers.js';
import type { IHeader } from '../headers.js';
import { encode } from '../helpers.js';
import { serialize } from '../serializer.js';
import type {
  ISerializeOptions,
  TBodyEncoder,
  TMultiPart,
} from '../serializer.js';

function randomBoundary() {
  return Math.round(Math.random() * 1e14).toString(16);
}

export function multipartEncoder(): (
  headers: IHeader[],
  options: ISerializeOptions
) => TBodyEncoder | null {
  return (headers: IHeader[], options: ISerializeOptions) => {
    const nl = (options.crlf ? '\r' : '') + '\n';
    const contentType = getHeader(headers, 'content-type');
    if (contentType?.value.startsWith('multipart/')) {
      const { params } = parseHeaderValueParams(contentType.value);
      let boundary = params?.boundary;
      if (!boundary) {
        boundary = randomBoundary();
        contentType.params = { ...contentType.params, boundary };
      }
      return (chunk: Uint8Array | TMultiPart | null) => {
        if (chunk && 'body' in chunk) {
          return [
            encode(`${nl}--${boundary}${nl}`),
            serialize({
              crlf: options.crlf,
              encoders: options.encoders,
              ...chunk,
            }),
          ];
        } else if (chunk === null) {
          return [encode(`${nl}--${boundary}--`)];
        }
        return [];
      };
    }
    return null;
  };
}
