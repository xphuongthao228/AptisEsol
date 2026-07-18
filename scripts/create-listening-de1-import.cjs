const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'templates', 'AptisKey', 'BoDe', 'BoDeLis', 'de1.txt');
const outputPath = path.join(root, 'templates', 'listening_de1_import.csv');
const baseAssetUrl = 'https://www.aptiskey.com/';

function normalizeAssetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return baseAssetUrl + String(value).replace(/^\/+/, '');
}

function csv(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function rowFromObject(headers, row) {
  return headers.map((header) => csv(row[header] ?? '')).join(',');
}

function correctIndex(options, correctAnswer) {
  const index = options.findIndex((option) => option === correctAnswer);
  return index >= 0 ? index + 1 : 1;
}

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const headers = [
  'type',
  'topic',
  'audio_url',
  'script_text',
  'content',
  'instructions',
  'total',
  'explanation',
  'points',
  'sort_order',
  'answer1',
  'answer2',
  'answer3',
  'answer4',
  'answer5',
  'answer6',
  'answer7',
  'answer8',
  'correct_index',
  'correct_index_person1',
  'correct_index_person2',
  'correct_index_person3',
  'correct_index_person4',
  'statement1',
  'statement2',
  'statement3',
  'statement4',
  'correct_statement1',
  'correct_statement2',
  'correct_statement3',
  'correct_statement4',
  'question1',
  'question2',
  'q1_answer1',
  'q1_answer2',
  'q1_answer3',
  'q1_answer4',
  'q2_answer1',
  'q2_answer2',
  'q2_answer3',
  'q2_answer4',
  'correct_answer1',
  'correct_answer2'
];

const rows = [];
let sortOrder = 1;

for (const item of data.q1_13 ?? []) {
  const options = item.options ?? [];
  rows.push({
    type: 'LISTENING_AUDIO_MC',
    topic: '',
    audio_url: normalizeAssetUrl(item.audioUrl),
    script_text: item.transcript,
    content: '',
    total: 17,
    points: 1,
    sort_order: sortOrder++,
    question1: item.question,
    q1_answer1: options[0] ?? '',
    q1_answer2: options[1] ?? '',
    q1_answer3: options[2] ?? '',
    q1_answer4: options[3] ?? '',
    correct_answer1: item.correctAnswer ?? options[0] ?? ''
  });
}

const q14Options = data.q14?.options ?? [];
rows.push({
  type: 'LISTENING_PART2',
  topic: data.q14?.topic ?? 'Protect the environment',
  audio_url: normalizeAssetUrl(data.q14?.audioUrl),
  script_text: data.q14?.transcript ?? '',
  content: data.q14?.topic ?? 'Protect the environment',
  instructions: 'Four people are discussing their views on Protect the environment. Complete the sentences. Use each answer only once. You will not need two of the answers.',
  total: 17,
  points: 4,
  sort_order: sortOrder++,
  answer1: q14Options[0] ?? '',
  answer2: q14Options[1] ?? '',
  answer3: q14Options[2] ?? '',
  answer4: q14Options[3] ?? '',
  answer5: q14Options[4] ?? '',
  answer6: q14Options[5] ?? '',
  correct_index_person1: 1,
  correct_index_person2: 2,
  correct_index_person3: 3,
  correct_index_person4: 4
});

const q15Questions = data.q15?.questions ?? [];
const q15Answers = data.q15?.correctAnswer ?? [];
rows.push({
  type: 'LISTENING_PART3',
  topic: data.q15?.topic ?? 'Changes in the workplace',
  audio_url: normalizeAssetUrl(data.q15?.audioUrl),
  script_text: data.q15?.transcript ?? '',
  content: 'Listen to two colleagues discussing potential changes in the workplace. Read the statements and decide whose opinion matches the best: the man\'s, the woman\'s or both. Who expresses which opinion?',
  instructions: 'Listen to two colleagues discussing potential changes in the workplace. Read the statements and decide whose opinion matches the best: the man\'s, the woman\'s or both. Who expresses which opinion?',
  total: 17,
  points: 4,
  sort_order: sortOrder++,
  answer1: 'Man',
  answer2: 'Woman',
  answer3: 'Both',
  statement1: q15Questions[0] ?? '',
  statement2: q15Questions[1] ?? '',
  statement3: q15Questions[2] ?? '',
  statement4: q15Questions[3] ?? '',
  correct_statement1: q15Answers[0] ?? '',
  correct_statement2: q15Answers[1] ?? '',
  correct_statement3: q15Answers[2] ?? '',
  correct_statement4: q15Answers[3] ?? ''
});

const inferredPart4Answers = [
  [
    "He wasn't ready to start higher education",
    'To gain life experience.'
  ],
  [
    'It uses simple language to describe complex ideas.',
    'It is similar to the previous book about the scientist.'
  ]
];

for (const [index, item] of (data.q16_17 ?? []).entries()) {
  const group1 = item.questions?.[0] ?? {};
  const group2 = item.questions?.[1] ?? {};
  rows.push({
    type: 'LISTENING_PART4',
    topic: item.topic ?? '',
    audio_url: normalizeAssetUrl(item.audioUrl),
    script_text: item.transcript ?? '',
    content: item.topic ?? '',
    total: 17,
    points: 2,
    sort_order: sortOrder++,
    question1: `${group1.id ? `${group1.id} ` : ''}${group1.question ?? ''}`.trim(),
    question2: `${group2.id ? `${group2.id} ` : ''}${group2.question ?? ''}`.trim(),
    q1_answer1: group1.options?.[0] ?? '',
    q1_answer2: group1.options?.[1] ?? '',
    q1_answer3: group1.options?.[2] ?? '',
    q1_answer4: group1.options?.[3] ?? '',
    q2_answer1: group2.options?.[0] ?? '',
    q2_answer2: group2.options?.[1] ?? '',
    q2_answer3: group2.options?.[2] ?? '',
    q2_answer4: group2.options?.[3] ?? '',
    correct_answer1: inferredPart4Answers[index]?.[0] ?? '',
    correct_answer2: inferredPart4Answers[index]?.[1] ?? ''
  });
}

const output = [headers.join(','), ...rows.map((row) => rowFromObject(headers, row))].join('\n') + '\n';
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Created ${outputPath}`);
console.log(`Rows: ${rows.length}`);
