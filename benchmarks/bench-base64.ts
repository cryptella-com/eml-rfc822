import { base64 } from '@scure/base';
import { decodeBase64ArrayBuffer, encodeBase64ArrayBuffer } from '../lib/base64';
import { benchmark } from './helpers';

const str = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const b64 = btoa(str);
const strAb = new TextEncoder().encode(str);
const b64Ab = new TextEncoder().encode(b64);

await benchmark('Base64 Decode', (bench) => {
  bench
    .add('atob()', () => {
      atob(b64);
    })
    .add('@scure/base - decode()', () => {
      base64.decode(b64)
    })
    .add('decodeBase64ArrayBuffer()', () => {
      decodeBase64ArrayBuffer(b64Ab);
    });
});

await benchmark('Base64 Encode', (bench) => {
  bench
    .add('btoa()', () => {
      btoa(str);
    })
    .add('@scure/base - encode()', () => {
      base64.encode(strAb)
    })
    .add('encodeBase64ArrayBuffer()', () => {
      encodeBase64ArrayBuffer(strAb);
    });
});
