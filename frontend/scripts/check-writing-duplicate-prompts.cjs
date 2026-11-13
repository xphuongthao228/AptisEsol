const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/MockTests.tsx'), 'utf8');
const start = source.indexOf('function writingPartsFromCard(');
const end = source.indexOf('function hasWritingPartData(', start);
assert.ok(start >= 0 && end > start);
const rows = [{ part: 3, questions: ['1. Bedroom?', '2. City?', '3. City?'], sampleAnswers: ['Bedroom answer', 'City answer', 'Duplicate answer'] }];
const context = vm.createContext({
  hasImportedQuestionData: () => true,
  parseQuestionDataArray: () => rows,
  repairUserText: value => value,
  writingParts: Array.from({ length: 4 }, () => ({ heading: '', content: '', prompt: '', questions: [], helper: '' }))
});
vm.runInContext(ts.transpile(source.slice(start, end), { target: ts.ScriptTarget.ES2020 }), context);
const result = context.writingPartsFromCard({})[2];
assert.deepEqual(Array.from(result.questions), ['Bedroom?', 'City?', 'City?']);
assert.deepEqual(Array.from(result.sampleAnswers), ['Bedroom answer', 'City answer', 'Duplicate answer']);
assert.equal(rows[0].questions.length, 3, 'Original import is unchanged');
rows[0].questions = ['First?', 'Second?', 'Third?'];
assert.equal(context.writingPartsFromCard({})[2].questions.length, 3);
rows[0].part = 1;
rows[0].questions = ['Name?', 'Name?'];
assert.equal(context.writingPartsFromCard({})[0].questions.length, 2);
rows.splice(0, rows.length, ...['Bedroom?', 'City?', 'City?'].map((question, index) => ({
  part: 3, question, prompt: question, sampleAnswer: `Answer ${index + 1}`
})));
const flatResult = context.writingPartsFromCard({})[2];
assert.deepEqual(Array.from(flatResult.questions), ['Bedroom?', 'City?', 'City?']);
assert.deepEqual(Array.from(flatResult.sampleAnswers), ['Answer 1', 'Answer 2', 'Answer 3']);
console.log('Passed: all three Part 3 tasks preserved, prompt aliases ignored, numbering and sample answers aligned.');
