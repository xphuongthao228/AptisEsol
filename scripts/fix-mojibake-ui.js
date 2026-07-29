const fs = require("fs");
const path = require("path");

const srcRoot = path.resolve(__dirname, "..", "frontend", "src");
const reportPath = path.resolve(__dirname, "..", "frontend", "mojibake-fix-report.txt");
const extensions = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".html"]);

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
  [0x0178, 0x9f],
]);

function asCp1252Bytes(value) {
  const bytes = [];
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    if (cp1252Reverse.has(code)) {
      bytes.push(cp1252Reverse.get(code));
      continue;
    }
    return null;
  }
  return bytes;
}

function badScore(value) {
  const matches = value.match(/[ÃÂÄÅÆ]|á[º»]|\uFFFD|â[€\u0080-\u009f]/g);
  return matches ? matches.length : 0;
}

function decodeCp1252Utf8(value) {
  if (!/[ÃÂÄÅÆáâ]/.test(value)) return value;
  const bytes = asCp1252Bytes(value);
  if (!bytes) return value;

  const decoded = Buffer.from(bytes).toString("utf8");
  if (!decoded || decoded.includes("\uFFFD")) return value;
  return badScore(decoded) < badScore(value) ? decoded : value;
}

const exactFixes = [
  ["â€“", "-"],
  ["â€”", "-"],
  ["â€˜", "'"],
  ["â€™", "'"],
  ["â€œ", '"'],
  ["â€", '"'],
  ["â€¦", "..."],
  ["Â ", " "],
  ["Â", ""],
  ["Ä\u0090", "Đ"],
  ["Ä\u0091", "đ"],
  ["Ä", "Đ"],
  ["Ä‘", "đ"],
];

const commonWords = new Map([
  ["Cháº¿ Ä‘á»™ Ã´n thi", "Chế độ ôn thi"],
  ["Cháº¿ Ä‘á»™ thi Ä‘ang báº­t", "Chế độ thi đang bật"],
  ["Tá»•ng quan", "Tổng quan"],
  ["Trang chá»§", "Trang chủ"],
  ["BÃ i há»c", "Bài học"],
  ["Luyá»‡n táº­p", "Luyện tập"],
  ["Äá» thi", "Đề thi"],
  ["Dá»± Ä‘oÃ¡n Ä‘á»", "Dự đoán đề"],
  ["Tiáº¿n Ä‘á»™", "Tiến độ"],
  ["Gia háº¡n", "Gia hạn"],
  ["CÃ i Ä‘áº·t", "Cài đặt"],
  ["Trá»£ giÃºp", "Trợ giúp"],
  ["ÄÄƒng xuáº¥t", "Đăng xuất"],
  ["NÃ¢ng cáº¥p Pro", "Nâng cấp Pro"],
  ["Sáºµn sÃ ng nÃ¢ng cáº¥p?", "Sẵn sàng nâng cấp?"],
  ["CÃ²n", "Còn"],
  ["TÃ¬m tÃ i liá»‡u", "Tìm tài liệu"],
  ["TÃ¬m kiáº¿m", "Tìm kiếm"],
  ["CÃ¢u", "Câu"],
  ["Chá»§ Ä‘á»", "Chủ đề"],
  ["Äá»c hiá»ƒu", "Đọc hiểu"],
  ["Chá»n cÃ¢u há»i", "Chọn câu hỏi"],
  ["Báº¥m sá»‘ cÃ¢u Ä‘á»ƒ chuyá»ƒn nhanh", "Bấm số câu để chuyển nhanh"],
  ["Nghe audio cÃ¢u há»i", "Nghe audio câu hỏi"],
  ["Chá»n Ä‘Ã¡p Ã¡n Ä‘Ãºng", "Chọn đáp án đúng"],
  ["Tráº£ lá»i tá»± luáº­n", "Trả lời tự luận"],
  ["Nháº­p cÃ¢u tráº£ lá»i", "Nhập câu trả lời"],
  ["Xem script", "Xem script"],
  ["áº¨n script", "Ẩn script"],
  ["Xem Ä‘Ã¡p Ã¡n", "Xem đáp án"],
  ["áº¨n Ä‘Ã¡p Ã¡n", "Ẩn đáp án"],
  ["Kiá»ƒm tra", "Kiểm tra"],
  ["Káº¿ tiáº¿p", "Kế tiếp"],
  ["LÃ m láº¡i", "Làm lại"],
  ["Quay láº¡i", "Quay lại"],
  ["HoÃ n thÃ nh", "Hoàn thành"],
]);

function fixExact(value) {
  let result = value;
  for (const [bad, good] of exactFixes) {
    result = result.split(bad).join(good);
  }
  for (const [bad, good] of commonWords) {
    result = result.split(bad).join(good);
  }
  return result;
}

function fixMojibake(value) {
  let result = fixExact(value);

  result = result.replace(/[^\x00-\x7F]{2,}/g, (match) => {
    const decoded = decodeCp1252Utf8(match);
    return fixExact(decoded);
  });

  result = result.replace(/[A-Za-zÀ-ỹ0-9 _.,:;!?'"()/#&+\-[\]{}|\\\n\r\t]{0,80}[ÃÂÄÅÆáâ][A-Za-zÀ-ỹ0-9 _.,:;!?'"()/#&+\-[\]{}|\\\n\r\t]{0,80}/g, (match) => {
    const decoded = decodeCp1252Utf8(match);
    return fixExact(decoded);
  });

  return fixExact(result);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") walk(fullPath, files);
      continue;
    }
    if (extensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

const changed = [];

for (const file of walk(srcRoot)) {
  const original = fs.readFileSync(file, "utf8");
  const fixed = fixMojibake(original);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed, "utf8");
    changed.push(path.relative(path.resolve(__dirname, ".."), file));
  }
}

fs.writeFileSync(
  reportPath,
  [
    `Changed files: ${changed.length}`,
    ...changed.map((file) => `- ${file}`),
    "",
  ].join("\n"),
  "utf8",
);
