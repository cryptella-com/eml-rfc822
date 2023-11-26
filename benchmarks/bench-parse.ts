import path from 'node:path';
import { base64Decoder } from '../lib/decoders/base64.decoder';
import { multipartDecoder } from '../lib/decoders/multipart.decoder';
import { parse } from '../lib/parser';
import { benchmark, getStream } from './helpers';

const FIXTURE = path.resolve(import.meta.url, '../fixtures/sample-multipart-attachments.eml');
const FIXTURE_LARGE = path.resolve(import.meta.url, '../fixtures/sample-multipart-large.eml');

await benchmark('Parser - simple', (bench) => {
  const str = 'content-type: text/plain\n\nHello World.';
  let stream: ReadableStream;

  bench
    .add('parse()', async () => {
      await parse(stream);
    }, {
      beforeEach() {
        stream = new Blob([str]).stream();
      },
    });
});

await benchmark('Parser - fixture - no decoders', (bench) => {
  let stream: ReadableStream;

  bench
    .add('parse()', async () => {
      await parse(stream);
    }, {
      beforeEach() {
        stream = getStream(FIXTURE);
      },
    });
});

await benchmark('Parser - fixture - multipart + base64 decoders', (bench) => {
  let stream: ReadableStream;

  bench
    .add('parse()', async () => {
      await parse(stream, {
        decoders: [
          base64Decoder(() => {

          }),
          multipartDecoder(() => {
            
          }),
        ],
      });
    }, {
      beforeEach() {
        stream = getStream(FIXTURE);
      },
    });
});

await benchmark('Parser - fixture - large - multipart + base64 decoders', (bench) => {
  let stream: ReadableStream;

  bench
    .add('parse()', async () => {
      await parse(stream, {
        decoders: [
          /*
          base64Decoder(() => {

          }),
          multipartDecoder((h, b) => {
            console.log(h)
          }),
          */
        ],
      });
    }, {
      beforeEach() {
        stream = getStream(FIXTURE_LARGE);
      },
    });
});


