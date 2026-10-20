const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/student', name + '.ts'), 'utf8');
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const { mergeSpeakingBank } = load('speaking-bank-prompts');
const { speakingLevelForms } = load('speaking-level-forms');
const row = (id, topic, question, text, bank = 'samples', level = '') => ({
  id, part: 'Speaking Part 3', topic, question, text, bank, level, vi: '', tag: 'Opening', section: 'body',
});
const rows = [];
for (const n of [1, 2, 26]) for (const q of [1, 2, 3]) {
  rows.push(row(`part3_${String(n).padStart(2, '0')}_q${q}`, `Topic ${n}`, q === 1 ? 'Compare the pictures.' : `Question ${q}?`, `Answer ${n}-${q}`));
}
const groups = mergeSpeakingBank([], rows);
assert.equal(groups.length, 3);
assert.equal(groups[0].subQuestions.length, 3);
assert.equal(groups[0].subQuestions[0].forms.length, 1);
assert.equal(groups[0].subQuestions[0].forms[0].suggested_answer, 'Answer 1-1');
assert.equal(groups[1].subQuestions[0].forms[0].suggested_answer, 'Answer 2-1');
assert.equal(groups[0].images[0], '/images/speaking/part3/de01_1.png');
assert.equal(groups[2].images.length, 0, 'Missing assets are not exposed as broken URLs');
const practice = [{ id: 'old', part: 'Speaking Part 3', topic: 'Topic 1', question: 'Compare the pictures.', vi: '', images: [], samples: [] }];
assert.equal(mergeSpeakingBank(practice, rows).length, 3, 'Imported groups replace matching legacy practice groups');
assert.equal(mergeSpeakingBank([{ ...practice[0], part: 'Speaking Part 2' }], []).length, 0);
const samples = [row('P4-2', 'Experience', 'Experience?\nFeelings?', 'Form'), row('answer-id', 'Experience', 'Experience?', 'B1 answer.', 'answers', 'B1')]
  .map(r => ({ ...r, part: 'Speaking Part 4' }));
const prompt = mergeSpeakingBank([], samples)[0];
assert.equal(prompt.levelSamples.B1, 'B1 answer.', 'Answers can have a different ID from sample forms');
assert.equal(speakingLevelForms('First sentence. Second sentence!', 'B2').length, 2);
assert.equal(speakingLevelForms(undefined, 'C1').length, 0);
console.log('PASS: scoped forms, grouped Part 3, bank-only answers, duplicate prevention, missing assets and level forms');
