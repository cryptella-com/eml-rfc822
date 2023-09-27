import { serialize } from '../lib/serializer';
import { benchmark, streamToString } from './helpers';

await benchmark('Serializer', (bench) => {
  bench
    .add('serialize()', async () => {
      await streamToString(serialize({
        body: 'Hello world',
        headers: [{
          name: 'content-type',
          params: null,
          value: 'text/plain',
        }],
      }));
    });
});
