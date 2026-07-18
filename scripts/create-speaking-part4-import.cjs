const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'templates', 'AptisKey', 'Speaking', 'speaking_part4.txt');
const outputPath = path.join(root, 'templates', 'speaking_part4_import.csv');

const raw = fs.readFileSync(sourcePath, 'utf8');
const match = raw.match(/const\s+questions\s*=\s*\[[\s\S]*?\]\s*;/);

if (!match) {
  throw new Error('Cannot find "const questions = [...]" in speaking_part4.txt');
}

const sandbox = {};
vm.runInNewContext(`${match[0]}\nthis.__questions = questions;`, sandbox, { timeout: 1000 });

function cleanQuestion(value, index) {
  const text = String(value || '').trim();
  if (index === 0) return 'Mẫu form chung cho toàn bộ câu hỏi';
  return text.replace(/\s*\([^)]*\)\s*$/g, '').trim();
}

function cleanAnswer(value) {
  const text = String(value || '').trim();
  const firstEnglishBlock = text.split('<br><br>')[0]?.trim();
  return firstEnglishBlock || text;
}

const questions = (sandbox.__questions || [])
  .map((item, index) => ({
    question: cleanQuestion(item.question, index),
    answer1: cleanAnswer(item.answer1)
  }))
  .filter((item) => item.question);

const content = {
  template: 'SPEAKING_PART4',
  total: questions.length,
  title: 'Speaking Part 4',
  part: 'Part 4',
  instructions: 'Discuss personal experience and give opinions on abstract topics. You have 1 minute to prepare and 2 minutes to speak.',
  questions
};

const headers = ['type', 'topic', 'content', 'explanation', 'points', 'sort_order'];
const row = [
  'SPEAKING_PART4',
  'Speaking Part 4',
  JSON.stringify(content),
  'Speaking Part 4 question bank',
  1,
  1
];

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

fs.writeFileSync(
  outputPath,
  `${headers.join(',')}\r\n${row.map(csvCell).join(',')}\r\n`,
  'utf8'
);

console.log(`Created ${outputPath} with ${questions.length} questions`);
