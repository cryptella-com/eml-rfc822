import { describe, expect, it, beforeEach } from '@jest/globals';
import { encode, decode } from '../lib/helpers.js';
import { parse } from '../lib/parser.js';
import { base64DecoderStream } from '../lib/decoders/base64.decoder.js';
import { multipartDecoder } from '../lib/decoders/multipart.decoder.js';
import { getStream } from './utils.js';
import type { IHeader } from '@cryptella/utils/headers';

describe('Eml', () => {

  describe('parse()', () => {
    it('should parse basic eml', async () => {
      const eml = `subject: test\ncontent-type: text/plain\n\nHello World\n\nEnd of message.`;
      const stream = new Blob([encode(eml)]).stream();
      const result = await parse(stream);
      expect(result.headers).toEqual([{
        name: 'subject',
        params: null,
        value: 'test',
      }, {
        name: 'content-type',
        params: null,
        value: 'text/plain',
      }]);
      expect(decode(result.body)).toEqual('Hello World\n\nEnd of message.');
    });

    it('should parse basic non-multipart eml with configured decoders', async () => {
      const eml = `subject: test\ncontent-type: text/plain\n\nHello World\n\nEnd of message.`;
      const stream = new Blob([encode(eml)]).stream();
      const result = await parse(stream, {
        decoders: [
          multipartDecoder(async () => {
            // noop
          }),
        ],
      });
      expect(result.headers).toEqual([{
        name: 'subject',
        params: null,
        value: 'test',
      }, {
        name: 'content-type',
        params: null,
        value: 'text/plain',
      }]);
      expect(decode(result.body)).toEqual('Hello World\n\nEnd of message.');
    });

    describe('Basic multipart', () => {
      let stream: ReadableStream;

      beforeEach(() => {
        stream = getStream('./fixtures/sample-multipart-simple.eml');
      });

      it('should read multipart body', async () => {
        const parts: { headers: IHeader[], body: string }[] = [];
        const result = await parse(stream, {
          decoders: [
            multipartDecoder(async (headers: IHeader[], body: Uint8Array) => {
              parts.push({ headers, body: decode(body) });
            }),
          ],
        });
        expect(result.headers).toEqual([{
          name: 'subject',
          params: null,
          value: 'Test email',
        }, {
          name: 'from',
          params: null,
          value: 'test@example.com',
        }, {
          name: 'content-type',
          params: null,
          value: 'multipart/mixed; boundary="xxxxxx"',
        }]);
        expect(result.body.length).toEqual(0);
        expect(parts[0].headers).toEqual([{
          name: 'content-type',
          params: null,
          value: 'text/plain',
        }]);
        expect(parts[0].body).toEqual('Hello World');
        expect(parts[1].headers).toEqual([{
          name: 'content-type',
          params: null,
          value: 'text/html',
        }]);
        expect(parts[1].body).toEqual(`<h1>Heading 1</h1>\n\n<p>Paragraph</p>`);
      });
    });

    describe('Attachments', () => {
      let stream: ReadableStream;

      beforeEach(() => {
        stream = getStream('./fixtures/sample-multipart-attachments.eml');
      });

      it('should read multipart', async () => {
        const attachments: { headers: IHeader[], body: ReadableStream }[] = []
        const parts: { headers: IHeader[], body: string }[] = [];
        const result = await parse(stream, {
          decoders: [
            base64DecoderStream((headers: IHeader[], body) => {
              attachments.push({ headers, body });
            }),
            multipartDecoder(async (headers: IHeader[], body: Uint8Array) => {
              parts.push({ headers, body: decode(body) });
            }),
          ],
        });
        expect(result.headers.length).toEqual(12);
        expect(result.body.length).toEqual(0);
        expect(parts.length).toEqual(3);
        expect(attachments.length).toEqual(2);
        expect(attachments[0].body).toBeInstanceOf(ReadableStream);
        expect(attachments[1].body).toBeInstanceOf(ReadableStream);
      });
    });

    describe('Multipart multipart/related; multipart/alternative', () => {
      let stream: ReadableStream;

      beforeEach(() => {
        stream = getStream('./fixtures/sample-multipart-related.eml');
      });

      it('should read multipart body with nested boundaries (multipart/related; multipart/alternative)', async () => {
        const parts: { headers: IHeader[], body: string }[] = [];
        const result = await parse(stream, {
          decoders: [
            multipartDecoder(async (headers: IHeader[], body: Uint8Array) => {
              parts.push({ headers, body: decode(body) });
            }),
          ],
        });
        expect(result.headers.length).toEqual(11);
        expect(result.body.length).toEqual(0);
        expect(parts.length).toEqual(7);
        expect(parts[0].body.length).toEqual(0);
        expect(parts[1].body.length).toEqual(0);
        expect(parts[2].body).toEqual('This is an HTML message. Please use an HTML capable mail program to read\nthis message.\n');
        expect(parts[3].body).toContain('<html>');
      });
    });

    // takes too long
    describe.skip('Multipart large', () => {
      let stream: ReadableStream;

      beforeEach(() => {
        stream = getStream('./fixtures/sample-multipart-large.eml');
      });

      it('should read large multipart body', async () => {
        const parts: { headers: IHeader[], body: string }[] = [];
        const result = await parse(stream, {
          decoders: [
            multipartDecoder(async (headers: IHeader[], body: Uint8Array) => {
              parts.push({ headers, body: decode(body) });
            }),
          ],
        });
        expect(result.headers.length).toEqual(10);
        expect(result.body.length).toEqual(0);
        expect(parts.length).toEqual(6);
      });
    });
  });
});
