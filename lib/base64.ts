import { CHAR_EQ } from './consts.js';
import { decode, encode } from './helpers.js';

/**
 * Base64 decode based on https://github.com/niklasvh/base64-arraybuffer
 */

const BASE64_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Uint8Array(256);

for (let i = 0; i < BASE64_CHARSET.length; i++) {
  BASE64_LOOKUP[BASE64_CHARSET.charCodeAt(i)] = i;
}

export function decodeBase64ArrayBuffer(b64: Uint8Array) {
  let bufferLength = b64.length * 0.75,
    len = b64.length,
    p = 0,
    i,
    encoded1,
    encoded2,
    encoded3,
    encoded4;
  if (b64[b64.length - 1] === CHAR_EQ) {
    bufferLength--;
    if (b64[b64.length - 2] === CHAR_EQ) {
      bufferLength--;
    }
  }
  const bytes = new Uint8Array(bufferLength);
  for (i = 0; i < len; i += 4) {
    encoded1 = BASE64_LOOKUP[b64[i]];
    encoded2 = BASE64_LOOKUP[b64[i + 1]];
    encoded3 = BASE64_LOOKUP[b64[i + 2]];
    encoded4 = BASE64_LOOKUP[b64[i + 3]];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

// https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
export function encodeBase64ArrayBuffer(
  ab: Uint8Array,
  splitByLineWidth: number = 0,
  splitByLineWidthOffset: number = 0,
  crlf: boolean = false
) {
  let str = btoa(
    encodeURIComponent(decode(ab)).replace(/%([0-9A-F]{2})/g, (_, p) => {
      // @ts-ignore
      return String.fromCharCode('0x' + p);
    })
  );
  if (splitByLineWidth) {
    str =
      str.slice(0, splitByLineWidthOffset) +
      str
        .slice(splitByLineWidthOffset)
        .replace(/(.{80})/g, '$1' + (crlf ? '\r' : '') + '\n');
  }
  return encode(str);
}
