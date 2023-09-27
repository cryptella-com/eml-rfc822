import { HEADER_PARAMS_RX } from './consts';

export interface IHeader {
  name: string;
  params: Record<string, string> | null;
  value: string;
}

export function getHeader(headers: IHeader[], name: string) {
  name = name.toLowerCase();
  return headers.find((h) => h.name.toLowerCase() === name);
}

export function parseHeaders(
  headers: string,
  parseParams: boolean = false
): IHeader[] {
  const lines = headers.split(/\r?\n/).filter((l) => !!l.trim());
  const result: any[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (lines[i + 1]?.match(/^\s+/)) {
      line += lines[i + 1].slice(1);
      i += 1;
    }
    result.push(parseHeaderLine(line, parseParams));
  }
  return result;
}

export function parseHeaderLine(
  header: string,
  parseParams: boolean = false
): IHeader {
  const colIdx = header.indexOf(':');
  const name = header.slice(0, colIdx);
  let params: Record<string, string> | null = null;
  let value = header.slice(colIdx + 1).trim();
  if (parseParams) {
    const valueParams = parseHeaderValueParams(value);
    if (valueParams.params) {
      params = valueParams.params;
      value = valueParams.value;
    }
  }
  return {
    name,
    params,
    value,
  };
}

export function parseHeaderValueParams(value: string): {
  params: Record<string, string> | null;
  value: string;
} {
  const match = value.match(HEADER_PARAMS_RX);
  let params: Record<string, string> | null = null;
  if (match) {
    let str = value.slice(match.index! + match[1].length);
    params = {};
    value = value.slice(0, match.index);
    while (str.length) {
      const splitIdx = str.indexOf('=');
      const name = str.slice(0, splitIdx).trim();
      if (str[splitIdx + 1] === '"') {
        // quoted value
        const quoteIdx = str.indexOf('"', splitIdx + 2);
        params[name] = str.slice(splitIdx + 2, quoteIdx);
        str = str.slice(quoteIdx + 2);
      } else {
        const semicolIdx = str.indexOf(';');
        const endPos = semicolIdx < 0 ? str.length : semicolIdx;
        params[name] = str.slice(splitIdx + 1, endPos);
        str = str.slice(endPos + 1);
      }
    }
  }
  return {
    params,
    value,
  };
}

export function recordToHeadersArray(
  headers: Record<string, string | null | undefined>
) {
  return Object.keys(headers)
    .map((name) => ({
      name,
      value: (headers as Record<string, string>)[name],
    }))
    .filter(({ name, value }) => !!name && value !== null && value !== void 0);
}

export function serializeHeaders(
  headers: Partial<IHeader>[],
  crlf: boolean = false
) {
  const nl = (crlf ? '\r' : '') + '\n';
  return (
    (headers as IHeader[])
      .filter(({ name, value }) => !!name && value !== null && value !== void 0)
      .map((header) =>
        serializeHeaderLine(header.name!, header.value!, header.params)
      )
      .join(nl) + nl
  );
}

export function serializeHeaderLine(
  name: string,
  value: string,
  params?: Record<string, string> | null
) {
  return `${name}: ${value}${
    params ? '; ' + serializeHeaderParams(params) : ''
  }`;
}

export function serializeHeaderParams(params: Record<string, string>) {
  const parts: string[] = [];
  for (let name in params) {
    let value = params[name];
    if (value.match(/[^\w]/)) {
      // add quotes
      value = `"${value.replace(/\"/g, '\\"')}"`;
    }
    parts.push(`${name}=${value}`);
  }
  return parts.join('; ');
}
