export const CHAR_EQ = '='.charCodeAt(0);
export const CHAR_EM = '-'.charCodeAt(0);
export const CHAR_LF = '\n'.charCodeAt(0);
export const CHAR_CR = '\r'.charCodeAt(0);
export const AB_LF = new Uint8Array([CHAR_LF]);
export const AB_CR_LF = new Uint8Array([CHAR_CR, CHAR_LF]);
export const HEADER_PARAMS_RX = /(^|[\;\,]?\s{1,})[\w\-\_]+\=/;
