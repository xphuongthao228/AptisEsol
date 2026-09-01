const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const root = path.resolve(__dirname, '..', 'frontend', 'src');
const extensions = new Set(['.ts', '.tsx', '.css', '.html']);
const decoder = new TextDecoder('utf-8', { fatal: false });

const cp1252Reverse = new Map([
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

const suspiciousToken = /(?:[ÃÄÅÆÂ][\u0080-\u00ff\u0100-\u017f\u0192\u02c6\u02dc\u2018-\u201e\u2020-\u2026\u2030\u2039\u203a\u20ac]?|á[º»][\u0080-\u00ff]?|â[\u0080-\u009f])+/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist'].includes(entry.name)) walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function toByte(char) {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0xff) return code;
  return cp1252Reverse.get(code);
}

function decodeToken(token) {
  const bytes = [];
  for (const char of token) {
    const byte = toByte(char);
    if (byte === undefined) return token;
    bytes.push(byte);
  }
  const decoded = decoder.decode(Uint8Array.from(bytes));
  return decoded.includes('\uFFFD') ? token : decoded;
}

function fixText(text) {
  let current = text;
  for (let index = 0; index < 3; index += 1) {
    const next = current.replace(suspiciousToken, decodeToken);
    if (next === current) break;
    current = next;
  }
  return current;
}

const changed = [];
for (const file of walk(root)) {
  const original = fs.readFileSync(file, 'utf8');
  const fixed = fixText(original);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed, 'utf8');
    changed.push(path.relative(path.resolve(__dirname, '..'), file));
  }
}

console.log(`Changed files: ${changed.length}`);
for (const file of changed) console.log(`- ${file}`);
