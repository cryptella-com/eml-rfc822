import { describe, expect, it } from 'bun:test';
import { serialize } from '../lib/serializer';
import { multipartEncoder } from '../lib/encoders/multipart.encoder';
import { base64Encoder } from '../lib/encoders/base64.encoder';

describe('Serializer', () => {
  it('should return a stream and serialize a simple eml', async () => {
    const stream = serialize({
      body: 'Hello world',
      headers: [{
        name: 'subject',
        params: null,
        value: 'Hello',
      }, {
        name: 'content-type',
        params: null,
        value: 'text/plain',
      }],
    });
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(await Bun.readableStreamToText(stream)).toEqual([
      'subject: Hello',
      'content-type: text/plain',
      '',
      'Hello world',
    ].join('\n'));
  });

  it('should return a stream and serialize a simple eml with CRLF', async () => {
    const stream = serialize({
      crlf: true,
      body: 'Hello world',
      headers: [{
        name: 'subject',
        params: null,
        value: 'Hello',
      }, {
        name: 'content-type',
        params: null,
        value: 'text/plain',
      }],
    });
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(await Bun.readableStreamToText(stream)).toEqual([
      'subject: Hello',
      'content-type: text/plain',
      '',
      'Hello world',
    ].join('\r\n'));
  });


  describe('Encoders', () => {
    describe('Mutlipart', () => {
      it('should serialize multipart body', async() => {
        const boundary = 'abc123';
        const stream = serialize({
          encoders: [
            multipartEncoder(),
          ],
          body: [{
            body: 'Part 1',
            headers: [{
              name: 'content-type',
              params: null,
              value: 'text/plain',
            }],
          }, {
            body: 'Part 2',
            headers: [{
              name: 'content-type',
              params: null,
              value: 'text/plain',
            }],
          }],
          headers: [{
            name: 'content-type',
            params: null,
            value: `multipart/mixed; boundary="${boundary}"`,
          }],
        });
        expect(await Bun.readableStreamToText(stream)).toEqual([
          `content-type: multipart/mixed; boundary="${boundary}"`,
          '',
          '',
          `--${boundary}`,
          'content-type: text/plain',
          '',
          'Part 1',
          `--${boundary}`,
          'content-type: text/plain',
          '',
          'Part 2',
        ].join('\n'));
      });
    });

    describe('Base64', () => {
      it('should encode body with base64 and add content-transfer-encoding header', async () => {
        const stream = serialize({
          encoders: [
            base64Encoder({
              mimeTypes: ['text/plain'],
            }),
          ],
          body: 'Hello World',
          headers: [{
            name: 'content-type',
            params: null,
            value: 'text/plain',
          }],
        });
        expect(await Bun.readableStreamToText(stream)).toEqual([
          'content-type: text/plain',
          'content-transfer-encoding: base64',
          '',
          btoa('Hello World'),
        ].join('\n'));
      });
    });

    describe('Multipart with Base64 attachments', () => {
      it('should serialize multipart body with base64 encoded attachments', async () => {
        const boundary = 'abc123';
        const stream = serialize({
          encoders: [
            multipartEncoder(),
            base64Encoder({
              attachments: true,
            }),
          ],
          body: [{
            body: 'Hello World',
            headers: [{
              name: 'content-type',
              params: null,
              value: 'text/plain',
            }, {
              name: 'content-disposition',
              params: null,
              value: 'attachment; filename="text.txt"'
            }],
          }],
          headers: [{
            name: 'content-type',
            params: null,
            value: `multipart/mixed; boundary="${boundary}"`,
          }],
        });
        expect(await Bun.readableStreamToText(stream)).toEqual([
          `content-type: multipart/mixed; boundary="${boundary}"`,
          '',
          '',
          `--${boundary}`,
          'content-type: text/plain',
          'content-disposition: attachment; filename="text.txt"',
          'content-transfer-encoding: base64',
          '',
          btoa('Hello World'),
        ].join('\n'))
      });
    });
  });

  it('should serialize a stream', async () => {
    const stream = Bun.file('./fixtures/unicode.txt').stream();
    const result = await serialize({
      body: stream,
      headers: [{
        name: 'content-type',
        params: null,
        value: 'text/plain',
      }],
    });
  });
});