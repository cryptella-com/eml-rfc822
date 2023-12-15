import { encode } from './helpers.js';
import { serializeHeaders } from './headers.js';
import type { IHeader } from './headers.js';

export type TMultiPart = {
  headers?: IHeader[];
  body: string | Blob | Uint8Array | ReadableStream;
};

export type TBodyEncoder = (
  chunk: Uint8Array | TMultiPart | null
) => (Uint8Array | ReadableStream | TMultiPart | null)[];

export type TBody = string | Blob | Uint8Array | ReadableStream | TMultiPart[];

export interface ISerializeOptions {
  body: TBody;
  crlf?: boolean;
  encoders?: ((
    headers: IHeader[],
    options: ISerializeOptions
  ) => TBodyEncoder | null)[];
  headers?: IHeader[];
}

export function getBodyEncoder(headers: IHeader[], options: ISerializeOptions) {
  if (options.encoders) {
    for (let fn of options.encoders) {
      const encoder = fn(headers, options);
      if (encoder) {
        return encoder;
      }
    }
  }
  return (chunk: Uint8Array | TMultiPart | null) => [chunk];
}

function bodyToStream(body: TBody) {
  if (typeof body === 'string' || body instanceof Uint8Array) {
    return new Blob([body]).stream();
  }
  if (body instanceof Blob) {
    return body.stream();
  }
  if (Array.isArray(body)) {
    return new ReadableStream({
      start(ctrl) {
        for (let part of body) {
          ctrl.enqueue({
            body: part.body,
            headers: part.headers,
          });
        }
        ctrl.enqueue(null);
        ctrl.close();
      },
    });
  }
  return body;
}

async function encodeStream(
  input: ReadableStream,
  output: ReadableStreamController<Uint8Array | TMultiPart | null>,
  encoder: TBodyEncoder
) {
  const reader = input.getReader();
  let done: boolean;
  let value: Uint8Array;
  while (({ done, value } = await reader.read())) {
    if (done) {
      break;
    }
    const chunks = encoder(value);
    for (let chunk of chunks) {
      if (chunk && chunk instanceof ReadableStream) {
        const chunkReader = chunk.getReader();
        while (({ done, value } = await chunkReader.read())) {
          if (done) {
            break;
          }
          if (value !== null) {
            output.enqueue(value);
          }
        }
      } else if (chunk && 'headers' in chunk) {
        // TODO:
      } else if (chunk !== null) {
        output.enqueue(chunk as any);
      }
    }
  }
}

export function serialize(options: ISerializeOptions): ReadableStream {
  const encoder = getBodyEncoder(options.headers || [], options);
  return new ReadableStream({
    start(ctrl) {
      if (options.headers) {
        ctrl.enqueue(
          encode(
            serializeHeaders(options.headers, options.crlf) +
              (options.crlf ? '\r' : '') +
              '\n'
          )
        );
      }
      encodeStream(bodyToStream(options.body), ctrl, encoder).then(() => {
        ctrl.close();
      });
    },
  });
}
