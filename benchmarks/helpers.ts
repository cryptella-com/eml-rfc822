import { Bench } from 'tinybench';

const NAME_MAX_LEN = 40;
const TEXT_DECODER = new TextDecoder();

export async function benchmark(name: string, initFn: (bench: Bench) => void, duration: number = 500) {
  const bench = new Bench({
    time: duration,
  });
  initFn(bench);
  await bench.run();
  console.log('>', name);
  for (let row of bench.table()) {
    if (row) {
      console.log(
        '-',
        row['Task Name'].slice(0, NAME_MAX_LEN).padEnd(NAME_MAX_LEN, '.'),
        row['ops/sec'].padStart(10, ' '),
        'ops/s',
        row['Margin'],
      );
    }
  }
  console.log('');
}

export async function streamToString(stream: ReadableStream) {
  const reader = stream.getReader();
  let str = '';
  let done: boolean;
  let value: Uint8Array | null;
  while ({ done, value } = await reader.read()) {
    if (done) {
      break;
    }
    if (value !== null) {
      str += TEXT_DECODER.decode(value);
    }
  }
  return str;
}
