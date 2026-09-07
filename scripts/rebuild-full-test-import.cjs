const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../frontend/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'frontend/src/pages/student/MockTests.tsx'), 'utf8');
const ast = ts.createSourceFile('MockTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const ctx = vm.createContext({ repairUserText: v => String(v ?? ''), mockCardMeta: { FULL: {}, SPEAKING: {}, LISTENING: {}, GRAMMAR: {}, READING: {}, WRITING: {} } });
const run = code => vm.runInContext(ts.transpileModule(code, { fileName: 'check.tsx', compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText, ctx);
for (const n of ast.statements) {
  if (ts.isFunctionDeclaration(n) && n.name?.text !== 'MockTests') run(n.getText(ast));
  if (ts.isVariableStatement(n) && ['emptyReadingTestData', 'writingParts', 'grammarQuestions', 'listeningMatchingOptions', 'listeningSpeakerOptions'].includes(n.declarationList.declarations[0].name.getText(ast))) run(n.getText(ast));
}
const generator = fs.readFileSync(path.join(__dirname, 'create-distinct-full-mock-csv.cjs'), 'utf8');
vm.runInContext(generator.slice(generator.indexOf('function parseCsv('), generator.indexOf('function cleanObject(')), ctx);
const input = process.argv[2];
const output = path.join(root, 'generated/aptis_25_full_tests_ready_import.csv');
const rows = ctx.parseCsv(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(rows.length, 25);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MockTests');
const urlEffect = component.body.statements.find(n => ts.isExpressionStatement(n)
  && ts.isCallExpression(n.expression) && n.expression.expression.getText(ast) === 'useEffect'
  && n.getText(ast).includes('const params = new URLSearchParams();'));
ctx.URLSearchParams = URLSearchParams;
ctx.screen = 'part2Question';
ctx.selectedMockCard = null;
let restoredUrl = '?screen=part2Question&mockId=api-aptis-full-17&full=1';
ctx.setSearchParams = params => { restoredUrl = '?' + params.toString(); };
run(`(${urlEffect.expression.arguments[0].getText(ast)})()`);
assert.equal(restoredUrl, '?screen=part2Question&mockId=api-aptis-full-17&full=1', 'Keep selected test identity during reload');
run(component.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'startFullSpeaking').getText(ast));
Object.assign(ctx, {
  toast: { error: () => {} }, resetSpeakingSection() {},
  setScreen: screen => { ctx.screen = screen; },
  selectedMockCardLoading: false, selectedMockCard: null,
  isFullMock: true, activeSpeakingCard: null,
  nextFullScreenAfter: () => 'fullResult'
});
ctx.screen = 'fullStart';
ctx.startFullSpeaking();
assert.equal(ctx.screen, 'fullStart', 'Missing card must not open results');
ctx.selectedMockCard = { skill: 'FULL', questionData: '[]' };
ctx.startFullSpeaking();
assert.equal(ctx.screen, 'fullStart', 'Unreadable Full Test must not open results');
ctx.activeSpeakingCard = {};
ctx.activeSpeakingData = {};
ctx.hasAnySpeakingData = () => true;
ctx.startFullSpeaking();
assert.equal(ctx.screen, 'start', 'Loaded Speaking starts the test');
const report = [];
const speakingImages = new Set();
for (const row of rows) {
  const flat = [];
  for (const section of JSON.parse(row.questionData)) {
    for (const part of section.parts) {
      for (const question of part.questions) {
        if (section.skill === 'WRITING') {
          for (const club of question.clubs) club.parts.forEach((task, i) => {
            task.prompts.forEach((prompt, j) => flat.push({
              skill: 'WRITING', part: String(i + 1), template: 'WRITING_TASK',
              clubName: club.clubName, heading: task.instructions.replace(/\s*\([^)]*\?[^)]*\)/g, ''),
              context: task.mainText || '', prompt, question: prompt,
              sampleAnswer: task.sampleAnswers?.[j] || ''
            }));
          });
        } else if (section.skill === 'SPEAKING') {
          for (const child of question.questions) {
            const { questions, ...parent } = question;
            if (child.question && child.question === child.question1) delete child.question;
            flat.push(ctx.normalizeImportedQuestionAliases({ ...parent, ...child, skill: section.skill, part: String(part.part) }));
          }
        } else {
          if (section.skill === 'LISTENING' && Number(part.part) === 3) {
            question.statements = [1, 2, 3, 4].map(i => question['question' + i]);
            question.correctAnswers = [1, 2, 3, 4].map(i => question['correct_answer' + i] || question['answer' + question['correct_index' + i]]);
            assert.ok(question.statements.every(Boolean) && question.correctAnswers.every(Boolean), row.id);
          }
          flat.push(ctx.normalizeImportedQuestionAliases({ ...question, skill: section.skill, part: String(part.part) }));
        }
      }
    }
  }
  row.questionData = JSON.stringify(flat);
  row.skill = 'FULL';
  row.questions = '5 kỹ năng';
  row.minutes = '162 phút';
  row.description = 'Thi thử Full Test: Speaking, Listening, Grammar & Vocabulary, Reading và Writing.';
  const card = skill => ctx.skillCardFromFullMockCard({ id: row.id, skill: 'FULL', questionData: row.questionData }, skill);
  const speaking = ctx.getSpeakingTestDataFromCard(card('SPEAKING'));
  assert.ok(speaking.part2Image, row.id + ': Speaking image');
  speakingImages.add(speaking.part2Image);
  const reading = ctx.getReadingTestDataFromCard(card('READING'));
  const writing = ctx.writingPartsFromCard(card('WRITING'));
  const counts = {
    id: row.id,
    speaking: [speaking.part1.length, speaking.part2.length, speaking.part3.length, speaking.part4.questions.length],
    listening: [ctx.listeningQuestionsFromCard(card('LISTENING')).length, ctx.getListeningMatchingDataFromCard(card('LISTENING')).speakers.length, ctx.getListeningShortDataFromCard(card('LISTENING')).statements.length, ctx.getListeningMonologuesFromCard(card('LISTENING')).length],
    grammar: ctx.grammarQuestionsFromCard(card('GRAMMAR')).length,
    reading: [reading.gaps.length, reading.cohesion.length, reading.opinion.questions.length, reading.long.paragraphs.length],
    writing: writing.length
  };
  assert.ok(counts.speaking.every(n => n === 3), row.id + ': Speaking ' + JSON.stringify(counts.speaking));
  assert.ok(counts.listening.every(n => n > 0), row.id + ': Listening');
  assert.ok(counts.reading.every(n => n > 0), row.id + ': Reading');
  assert.ok(counts.grammar > 0 && counts.writing === 4, row.id);
  report.push(counts);
}
const headers = Object.keys(rows[0]);
assert.equal(speakingImages.size, 25, 'Each imported test must have its own Speaking Part 2 image');
const csv = [headers.join(','), ...rows.map(row => headers.map(h => ctx.csvEscape(row[h])).join(','))].join('\r\n') + '\r\n';
assert.equal(ctx.parseCsv(csv.replace(/^\uFEFF/, '')).length, 25);
fs.writeFileSync(output, csv, 'utf8');
fs.writeFileSync(output.replace('.csv', '.validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, tests: rows.length, first: report[0], last: report.at(-1) }, null, 2));
