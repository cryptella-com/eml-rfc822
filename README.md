# @cryptella/eml-rfc822


## What

This package offers a streaming, high-performance parser and serializer for the RFC822 (EML) format. Built on top [Web Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API), this package works in modern browsers, Bun and Node.js.

## Compatibility

- Bun 1+
- Node.js 16+
- Modern browsers

## Usage

```js
import { parse } from '@cryptella/eml-rfc822';
import { multipartDecoder } from '@cryptella/eml-rfc822/decoders';

const stream = new ReadableStream(); // get stream somehow...

// `headers` is always an array IHeader[] ({ name: string; value: string; params?: Record<string, string> }[])
// `body` is a ReadableStream<UInt8Array>

const { headers, body } = await parse(stream, {
  decoders: [
    multipartDecoder(async (headers, body) => {
      // consume nested parts here...
    }),
  ],
});
```

Or use a simple `parseMultipart()` function that returns ArrayBuffers instead of streams and includes base64 decoder:

```ts
import { parseMultipart } from '@cryptella/eml-rfc822';

const message: Multipart = await parseMultipart(stream);
```

```ts
interface Multipart = {
  boundary: string;
  body: Uint8Array;
  headers: IHeader[];
  parts: Multipart[];
  rawHeaders: Uint8Array;
}
```

## Sponsor

This project is sponsored by [bausw.com](https://bausw.com/) - no-code business apps for the construction industry.

## License

MIT
