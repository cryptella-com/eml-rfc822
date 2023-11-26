import { CHAR_CR, CHAR_LF } from './consts.js';

export function decode(ab: Uint8Array) {
  return new TextDecoder().decode(ab);
}

export function encode(str: string) {
  return new TextEncoder().encode(str);
}

export function* readLine(ab: Uint8Array) {
  const len = ab.length;
  let offset = 0;
  while (offset < len) {
    const start = offset;
    offset = ab.indexOf(CHAR_LF, offset);
    if (offset < 0) {
      offset = len;
    }
    const cr = ab[offset - 1] === CHAR_CR;
    const cursor = offset + 1;
    yield {
      cr,
      cursor,
      line: ab.subarray(start, cr ? offset - 1 : offset),
      start,
    };
    offset = cursor;
  }
  return null;
}

export function concat(...args: Uint8Array[]) {
  const r = new Uint8Array(args.reduce((acc, a) => acc + a.length, 0));
  let offset = 0;
  for (let i = 0; i < args.length; i++) {
    r.set(args[i], offset);
    offset += args[i].length;
  }
  return r;
}

export function compare(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i in a) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
