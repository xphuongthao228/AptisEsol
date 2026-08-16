const cp1252Reverse = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f]
]);

function badScore(value: string) {
  const matches = value.match(/[ÃÂÄÅÆ]|á[º»]|\uFFFD|â[\u0080-\u009f]/g);
  return matches ? matches.length : 0;
}

function cp1252Bytes(value: string) {
  const bytes: number[] = [];
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0xff) {
      bytes.push(code);
    } else if (cp1252Reverse.has(code)) {
      bytes.push(cp1252Reverse.get(code)!);
    } else {
      return null;
    }
  }
  return bytes;
}

function decodeOnce(value: string) {
  if (!/[ÃÂÄÅÆáâ]/.test(value)) return value;
  const bytes = cp1252Bytes(value);
  if (!bytes) return value;
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  if (!decoded || decoded.includes('\uFFFD')) return value;
  return badScore(decoded) < badScore(value) ? decoded : value;
}

export function repairMojibake(value?: string | null) {
  if (!value) return '';
  let current = value;
  for (let index = 0; index < 2; index += 1) {
    const next = decodeOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}
