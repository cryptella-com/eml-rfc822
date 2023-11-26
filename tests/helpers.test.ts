import { describe, expect, it } from '@jest/globals';
import { compare, concat, decode, encode, readLine } from '../lib/helpers.js';

describe('Helpers', () => {
  describe('encode()', () => {
    it('should encode string to Uint8Array', () => {
      const str = 'Hello World';
      expect(encode(str)).toEqual(new TextEncoder().encode(str));
    });
  });

  describe('decode()', () => {
    it('should decode Uint8Array to string', () => {
      const str = 'Hello World';
      const ab = new TextEncoder().encode(str);
      expect(decode(ab)).toEqual(str);
    });
  });

  describe('concat()', () => {
    it('should concatenate instances of Uint8Array', () => {
      expect(concat(encode('ABC'), encode('D'), encode('EF'), encode('G'))).toEqual(encode('ABCDEFG'));
    });
  });

  describe('compare()', () => {
    it('should return true if instances of Uint8Array are equal', () => {
      expect(compare(encode('ABC'), encode('ABC'))).toEqual(true);
    });
    it('should return fase if instances of Uint8Array have different size', () => {
      expect(compare(encode('ABC'), encode('AB'))).toEqual(false);
    });
    it('should return fase if instances of Uint8Array are not equal', () => {
      expect(compare(encode('ABC'), encode('ABD'))).toEqual(false);
    });
  });

  describe('readLine()', () => {
    it('should read line by line', async () => {
      const inp = ['line 1', 'line 2', '', 'line 4'];
      const lines = [...readLine(encode(inp.join('\n')))];
      expect(lines.map(({ line }) => decode(line))).toEqual(inp);
    });
  });
});