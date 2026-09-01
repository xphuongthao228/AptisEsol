const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'frontend', 'src');
const extensions = new Set(['.ts', '.tsx', '.css']);

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

const suspicious = /[ÃÂÄÅÆáâ]|�/;
const vietnameseChars = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist'].includes(entry.name)) walk(fullPath, files);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function toCp1252Byte(char) {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0xff) return code;
  return cp1252Reverse.get(code);
}

function score(value) {
  const bad = (value.match(/[ÃÂÄÅÆ]|á[º»]|�|â[\u0080-\u009f]/g) ?? []).length;
  const viet = (value.match(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g) ?? []).length;
  return bad * 6 - viet;
}

function decodeCp1252(value) {
  const bytes = [];
  for (const char of value) {
    const byte = toCp1252Byte(char);
    if (byte === undefined) return value;
    bytes.push(byte);
  }
  const decoded = Buffer.from(bytes).toString('utf8');
  return decoded.includes('�') ? value : decoded;
}

function repair(value) {
  let result = value;
  for (const char of vietnameseChars) {
    const mojibake = [...Buffer.from(char, 'utf8')]
      .map((byte) => {
        for (const [codePoint, mappedByte] of cp1252Reverse) {
          if (mappedByte === byte) return String.fromCodePoint(codePoint);
        }
        return String.fromCharCode(byte);
      })
      .join('');
    result = result.split(mojibake).join(char);
  }

  return result.replace(/[^\s'"`<>{}=()[\],;]+/g, (token) => {
    if (!suspicious.test(token)) return token;
    let current = token;
    for (let index = 0; index < 3; index += 1) {
      const decoded = decodeCp1252(current);
      if (decoded === current || score(decoded) >= score(current)) break;
      current = decoded;
    }
    return current;
  });
}

const changed = [];
for (const file of walk(root)) {
  const original = fs.readFileSync(file, 'utf8');
  const fixed = repair(original);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed, 'utf8');
    changed.push(path.relative(path.resolve(__dirname, '..'), file));
  }
}

console.log(`Changed files: ${changed.length}`);
for (const file of changed) console.log(`- ${file}`);
