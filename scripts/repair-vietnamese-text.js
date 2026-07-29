const fs = require("fs");
const path = require("path");

const sourceRoot = path.resolve(__dirname, "..", "frontend", "src");
const reportFile = path.resolve(__dirname, "..", "frontend", "mojibake-fix-report.txt");
const extensions = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".json", ".html"]);

const cp1252 = new Map([
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
  [0x0178, 0x9f],
]);

function isTextFile(filePath) {
  return extensions.has(path.extname(filePath).toLowerCase());
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (entry.isFile() && isTextFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function suspiciousScore(text) {
  const matches = text.match(/[ÃÂÄÅÆÐðâ]|á[º»]|[\u0080-\u009f]|\uFFFD/g);
  return matches ? matches.length : 0;
}

function hasSuspiciousText(text) {
  return suspiciousScore(text) > 0;
}

function charToByte(char) {
  const code = char.codePointAt(0);
  if (code <= 0xff) {
    return code;
  }
  if (cp1252.has(code)) {
    return cp1252.get(code);
  }
  return null;
}

function decodeAsUtf8FromCp1252(text) {
  const bytes = [];
  for (const char of text) {
    const byte = charToByte(char);
    if (byte === null) {
      return null;
    }
    bytes.push(byte);
  }
  return Buffer.from(bytes).toString("utf8");
}

function repairLine(line) {
  if (!hasSuspiciousText(line)) {
    return line;
  }

  let best = line;
  let bestScore = suspiciousScore(line);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const decoded = decodeAsUtf8FromCp1252(best);
    if (!decoded) {
      break;
    }

    const decodedScore = suspiciousScore(decoded);
    if (decodedScore < bestScore && !decoded.includes("\uFFFD")) {
      best = decoded;
      bestScore = decodedScore;
      continue;
    }
    break;
  }

  return best;
}

function repairText(text) {
  return text
    .split(/(\r?\n)/)
    .map((part) => (part === "\n" || part === "\r\n" ? part : repairLine(part)))
    .join("");
}

const changed = [];

for (const filePath of walk(sourceRoot)) {
  const original = fs.readFileSync(filePath, "utf8");
  const repaired = repairText(original);

  if (repaired !== original) {
    fs.writeFileSync(filePath, repaired, "utf8");
    changed.push(path.relative(path.resolve(__dirname, ".."), filePath));
  }
}

const report = [
  `Changed files: ${changed.length}`,
  ...changed.map((file) => `- ${file}`),
  "",
].join("\n");

fs.writeFileSync(reportFile, report, "utf8");
console.log(report.trim());
