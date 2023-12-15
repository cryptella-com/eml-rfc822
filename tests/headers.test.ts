import { describe, expect, it } from '@jest/globals';
import { parseHeaderLine, parseHeaders, recordToHeadersArray, serializeHeaders, serializeHeaderLine, serializeHeaderParams } from '../lib/headers.js';

describe('Headers', () => {
  describe('serializeHeaderParams()', () => {
    it('should serialize with quotes if value contains a space', () => {
      expect(serializeHeaderParams({ p: 'hello world' })).toEqual(`p="hello world"`);
    });

    it('should serialize with quotes if value contains a semicolon', () => {
      expect(serializeHeaderParams({ p: 'hello;world' })).toEqual(`p="hello;world"`);
    });

    it('should serialize with quotes if value contains a double quote', () => {
      expect(serializeHeaderParams({ p: '"hello"' })).toEqual(`p="\\"hello\\""`);
    });

    it('should serialize simple params', () => {
      expect(serializeHeaderParams({ p1: 'abc', p2: 'uvw xyz', p3: '' })).toEqual(`p1=abc; p2="uvw xyz"; p3=`);
    });
  });

  describe('serializeHeaderLine()', () => {
    it('should serialize a simple header', () => {
      expect(serializeHeaderLine('x-test', 'hello world')).toEqual('x-test: hello world');
    });

    it('should serialize a header with params', () => {
      expect(serializeHeaderLine('x-test', 'hello world', { p1: 'test', p2: 'abc def' })).toEqual('x-test: hello world; p1=test; p2="abc def"');
    });
  });

  describe('serializeHeaders()', () => {
    it('should serialize headers', () => {
      expect(serializeHeaders([
        {
          name: 'x-test-1',
          value: 'hello world',
        },
        {
          name: 'x-test-2',
          value: 'test',
          params: {
            p1: 'abc',
          },
        },
        {
          name: 'content-type',
          value: 'text/plain',
        }
      ])).toEqual(`x-test-1: hello world\nx-test-2: test; p1=abc\ncontent-type: text/plain\n`);
    });

    it('should serialize headers from key-value object', () => {
      expect(serializeHeaders(recordToHeadersArray({
        'x-test-1': 'hello',
        'x-test-2': 'world',
      }))).toEqual(`x-test-1: hello\nx-test-2: world\n`);
    });

    it('should omit headers with undefined value', () => {
      expect(serializeHeaders(recordToHeadersArray({
        'x-test-1': 'hello',
        'x-test-2': void 0,
        'x-test-3': 'world',
      }))).toEqual(`x-test-1: hello\nx-test-3: world\n`);
    });
  });

  describe('parseHeaderLine()', () => {
    const name = 'some-header-name';
    const value = 'value/test:123;param1=123; param2="test=12;33"; param3=999';
    const header = `${name}: ${value}`;

    it('should parse a header line and return name and value without params', () => {
      const result = parseHeaderLine(header);
      expect(result.name).toEqual(name);
      expect(result.value).toEqual(value);
      expect(result.params).toEqual(null);
    });

    it('should parse a header line and parse params', () => {
      const result = parseHeaderLine(header, true);
      expect(result.name).toEqual(name);
      expect(result.value).toEqual('value/test:123');
      expect(result.params).toEqual({
        param1: '123',
        param2: 'test=12;33',
        param3: '999',
      });
    });
  });
  
  describe('parseHeaders()', () => {
    const headers = [
      ['From', 'test@example.com'],
      ['Subject', 'Some test subject'],
      ['Multi-line', 'very long text\n  on multiple lines\n  should be parsed as one header'],
      ['Content-Type', 'text/plain']
    ];
    const headersStr = headers.map(([name, value]) => `${name}: ${value}`).join('\n');

    it('should parse multiple headers', () => {
      const result = parseHeaders(headersStr);
      expect(result.length).toEqual(headers.length);
      for (let i = 0; i < headers.length; i ++) {
        expect(result[i].name).toEqual(headers[i][0]);
        expect(result[i].value).toEqual(headers[i][1].replace(/\n\s/g, ''));
      }
    });
  });
});