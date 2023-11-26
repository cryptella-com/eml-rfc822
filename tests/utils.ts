import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

export function getStream(file: string) {
  return Readable.toWeb(createReadStream(file)) as ReadableStream;
}

export async function streamToUint8Array(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let buf = new Uint8Array();
  let done: boolean;
  let value: Uint8Array | undefined;
  while ({ done, value } = await reader.read()) {
    if (done) {
      break;
    }
    if (value?.length) {
      buf = new Uint8Array([...buf, ...value]);
    }
  }
  return buf;
}
