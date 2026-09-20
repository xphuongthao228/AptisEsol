const fs = require('fs');

const filePath = process.argv[2] || 'generated/aptis_full_tests_25_distinct_mock_import_part1_fixed.csv';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows
    .filter((items) => items.some((item) => String(item).trim()))
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ''])));
}

const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
const bad = [];

rows.forEach((row, index) => {
  const data = JSON.parse(row.questionData);
  const listening = data.find((section) => section.skill === 'LISTENING');
  const listeningPart4 = listening?.parts?.find((part) => String(part.part) === '4');
  const recordings = new Map();
  for (const question of listeningPart4?.questions ?? []) {
    const key = String(question.section || question.recording || question.recordingIndex || question.group || question.audio_url || question.audioUrl || question.topic || recordings.size);
    const subQuestionCount = (question.question1 ? 1 : 0) + (question.question2 ? 1 : 0) || 1;
    recordings.set(key, (recordings.get(key) || 0) + subQuestionCount);
  }

  const reading = data.find((section) => section.skill === 'READING');
  const readingPart2 = reading?.parts?.find((part) => String(part.part) === '2');
  const readingPart3 = reading?.parts?.find((part) => String(part.part) === '3');
  const part2Count = (readingPart2?.questions?.[0]?.correctSentences ?? []).length;
  const part3Count = (readingPart3?.questions?.[0]?.correctSentences ?? []).length;

  if (recordings.size < 2 || [...recordings.values()].some((count) => count < 2) || part2Count < 6 || part3Count < 6) {
    bad.push({ test: index + 1, listeningPart4: [...recordings.values()], readingPart2: part2Count, readingPart3: part3Count });
  }
});

console.log(JSON.stringify({ rows: rows.length, badCount: bad.length, bad: bad.slice(0, 10) }, null, 2));
process.exitCode = bad.length ? 1 : 0;
