const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.resolve(__dirname, '../generated/aptis_full_tests_25_distinct_mock_import.csv');
const outputPath = process.argv[3] || path.resolve(__dirname, '../generated/aptis_full_tests_25_distinct_mock_import_part1_fixed.csv');

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
      continue;
    }

    if (char === '"') {
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

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function splitPart1Question(question) {
  const value = String(question ?? '').trim();
  if (!value) return [];
  const parts = value.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts : [value];
}

function questionText(row) {
  if (!row || typeof row !== 'object') return '';
  return String(row.question || row.prompt || row.question1 || row.topic || '').trim();
}

function part1QuestionTexts(section) {
  const part1 = section.parts?.find((part) => String(part.part) === '1');
  if (!part1 || !Array.isArray(part1.questions)) return [];

  return part1.questions.flatMap((item) => {
    if (Array.isArray(item.questions)) {
      return item.questions.flatMap((question) => splitPart1Question(questionText(question)));
    }
    return splitPart1Question(questionText(item));
  }).filter(Boolean);
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePart1(section, questions) {
  const part1 = section.parts?.find((part) => String(part.part) === '1');
  if (!part1) return;

  const firstItem = Array.isArray(part1.questions) && part1.questions[0] && typeof part1.questions[0] === 'object'
    ? part1.questions[0]
    : {};

  part1.questions = [{
    ...firstItem,
    template: firstItem.template || 'SPEAKING_PART1',
    type: firstItem.type || 'SPEAKING_PART1',
    title: firstItem.title || 'Speaking Part 1',
    part: firstItem.part || 'Part 1',
    topic: questions[0],
    questions: questions.map((question) => ({ question }))
  }];
}

function main() {
  const rows = parseCsv(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
  const parsedRows = rows.map((row) => ({
    ...row,
    data: JSON.parse(row.questionData)
  }));

  const part1Bank = unique(parsedRows.flatMap((row) => {
    const speaking = row.data.find((section) => section.skill === 'SPEAKING');
    return speaking ? part1QuestionTexts(speaking) : [];
  }));

  const outputRows = parsedRows.map((row, rowIndex) => {
    const speaking = row.data.find((section) => section.skill === 'SPEAKING');
    if (speaking) {
      const ownQuestions = part1QuestionTexts(speaking);
      const fallbackQuestions = Array.from({ length: part1Bank.length }, (_, offset) => part1Bank[(rowIndex + offset + 1) % part1Bank.length]);
      const questions = unique([...ownQuestions, ...fallbackQuestions]).slice(0, 3);
      normalizePart1(speaking, questions);
    }

    const { data, ...csvRow } = row;
    return {
      ...csvRow,
      questionData: JSON.stringify(data)
    };
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const headers = ['id', 'skill', 'title', 'description', 'questions', 'questionData', 'minutes', 'status', 'featured', 'updatedAt'];
  fs.writeFileSync(outputPath, [
    headers.join(','),
    ...outputRows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\r\n'), 'utf8');

  console.log(`Wrote ${outputRows.length} rows`);
  console.log(outputPath);
}

main();
