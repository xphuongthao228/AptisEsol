const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/MockTests.tsx'), 'utf8');
const ast = ts.createSourceFile('MockTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const ctx = vm.createContext({ exports: {}, listeningMonologues: [], mockCardMeta: { LISTENING: {}, FULL: {} } });
const run = node => vm.runInContext(ts.transpileModule(node.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS }
}).outputText, ctx);
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && node.name && node.name.text !== 'MockTests') run(node);
}
// Full_Test_01_ALL.csv uses section/exam_part rather than skill/part.
const csvRows = [{
  section: 'Listening', exam_part: 'Part 1', type: 'SINGLE_CHOICE',
  content: 'When is the appointment?', audio_url: '/appointment.wav',
  answer1: 'Sunday', answer2: 'Friday', answer3: 'Monday', correct_index: '2'
}, {
  section: 'Listening', exam_part: 'Part 4', type: 'LISTENING_PART4',
  content: 'A different part', answer1: 'A', answer2: 'B'
}];
for (const rows of [csvRows, csvRows.map(row => ({ ...row, skill: 'LISTENING', template: row.type }))]) {
  const questions = ctx.listeningQuestionsFromCard({ questionData: JSON.stringify(rows) });
  assert.equal(questions.length, 1);
  assert.equal(questions[0].prompt, 'When is the appointment?');
  assert.equal(questions[0].audioUrl, '/appointment.wav');
  assert.equal(questions[0].correctAnswer, 'Friday');
  assert.equal(JSON.stringify(questions[0].options), '["Sunday","Friday","Monday"]');
}
console.log('Listening CSV Part 1: prompt, options, answer and audio passed');
