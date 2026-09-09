const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/MockTests.tsx'), 'utf8');
const ast = ts.createSourceFile('MockTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const ctx = vm.createContext({ listeningMonologues: [], mockCardMeta: { LISTENING: {}, FULL: {} } });
const run = node => vm.runInContext(ts.transpileModule(node.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React }
}).outputText, ctx);
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && node.name && node.name.text !== 'MockTests') run(node);
}
const question = { question: 'Why?', options: ['A', 'B'], correctAnswer: 'B' };
for (const section of ['q16', 'q17', 'q16_17']) {
  const card = { questionData: JSON.stringify({ listening: {
    q15: { statements: ['Opinion'], options: ['Man', 'Woman'] },
    [section]: [{ audioUrl: '/audio.mp3', questions: [question, question] }]
  } }) };
  const recordings = ctx.getListeningMonologuesFromCard(card);
  assert.equal(recordings.flatMap(r => r.questions).length, 2, section);
  assert.ok(recordings.every(r => r.audioUrl === '/audio.mp3'));
  assert.ok(Object.values(ctx.getListeningMonologueAnswerKey(recordings)).every(a => a === 'B'));
  ctx.activeListeningMonologues = recordings;
  ctx.isFullMock = false;
  const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MockTests');
  run(component.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'nextListeningScreenAfter'));
  assert.equal(ctx.nextListeningScreenAfter('short'), 'listeningMonologues');
  assert.equal(ctx.nextListeningScreenAfter('monologues'), 'listeningResult');
}
const indexed = ctx.getListeningMonologuesFromCard({ questionData: JSON.stringify([{
  type: 'LISTENING_PART4', audio_url: '/indexed.mp3',
  question1: 'First?', q1_answer1: 'A', q1_answer2: 'B', correct_answer1: 'B',
  question2: 'Second?', q2_answer1: 'C', q2_answer2: 'D', correct_answer2: 'C'
}]) });
assert.equal(indexed.length, 1);
assert.equal(indexed[0].questions.length, 2);
assert.equal(JSON.stringify(indexed[0].questions.map(q => q.options)), '[["A","B"],["C","D"]]');
assert.equal(JSON.stringify(ctx.getListeningMonologueAnswerKey(indexed)), '{"0-0":"B","0-1":"C"}');
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MockTests');
for (const name of ['hasActiveListeningMatchingData', 'hasActiveListeningShortData', 'firstListeningQuestionScreen']) {
  run(component.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name));
}
Object.assign(ctx, { listeningMatchingOptions: [], listeningMatchingAnswerKey: {}, listeningShortStatements: [], listeningShortAnswerKey: [], listeningSpeakerOptions: ['Man', 'Woman', 'Both'] });
const matching = { template: 'LISTENING_PEOPLE_MATCH', questions: ['Person 1', 'Person 2', 'Person 3', 'Person 4'], options: ['A', 'B', 'C', 'D', 'E', 'F'] };
const short = { template: 'LISTENING_OPINION_MATCH', questions: ['One', 'Two', 'Three', 'Four'], options: ['Man', 'Woman', 'Both'], correctAnswer: ['Man', 'Woman', 'Both', 'Man'] };
function checkAllParts(data) {
  const card = { questionData: JSON.stringify(data) };
  ctx.activeListeningPart1Questions = ctx.listeningQuestionsFromCard(card);
  ctx.activeListeningMatchingData = ctx.getListeningMatchingDataFromCard(card);
  ctx.activeListeningShortData = ctx.getListeningShortDataFromCard(card);
  ctx.activeListeningMonologues = ctx.getListeningMonologuesFromCard(card);
  assert.ok(ctx.activeListeningPart1Questions.length > 0);
  assert.equal(ctx.activeListeningMatchingData.speakers.length, 4);
  assert.ok(ctx.activeListeningMatchingData.options.length >= 4);
  assert.equal(ctx.activeListeningShortData.statements.length, 4);
  assert.equal(ctx.activeListeningShortData.answerKey.length, 4);
  assert.ok(ctx.activeListeningMonologues.length > 0);
  assert.equal(ctx.firstListeningQuestionScreen(), 'listeningQuestion');
  assert.equal(ctx.nextListeningScreenAfter('part1'), 'listeningMatching');
  assert.equal(ctx.nextListeningScreenAfter('matching'), 'listeningShort');
  assert.equal(ctx.nextListeningScreenAfter('short'), 'listeningMonologues');
  assert.equal(ctx.nextListeningScreenAfter('monologues'), 'listeningResult');
}
checkAllParts({ skill: 'LISTENING', parts: [
  { part: 1, questions: [question] },
  { part: 2, questions: [matching] },
  { part: 3, questions: [short] },
  { part: 4, questions: [question, question] }
] });
if (process.argv[2]) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
  const cards = Array.isArray(input) ? input : [input];
  for (const card of cards) checkAllParts(JSON.parse(card.questionData));
  console.log(`Checked all four parts in ${cards.length} imported tests`);
}
console.log('Listening Parts 1 → 2 → 3 → 4 → result checks passed');
Object.assign(ctx, {
  activeListeningPart1Questions: [],
  activeListeningMatchingData: { speakers: [], options: [] },
  activeListeningShortData: { statements: [], options: [] },
  activeListeningMonologues: []
});
assert.equal(ctx.firstListeningQuestionScreen(), 'listeningQuestion', 'Missing/loading data must never submit the test');
assert.equal(ctx.nextListeningScreenAfter('part1'), 'listeningMatching', 'Do not silently skip Part 2');
assert.equal(ctx.nextListeningScreenAfter('matching'), 'listeningShort', 'Do not silently skip Part 3');
assert.equal(ctx.nextListeningScreenAfter('short'), 'listeningMonologues', 'Do not silently skip Part 4');
for (const name of ['resetListeningSection', 'openListeningTest']) {
  run(component.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name));
}
Object.assign(ctx, {
  listeningSeconds: 0,
  requireLoginToStart: () => true,
  requireProToStart: () => true,
  hydrateAssessmentCard: async card => card,
  setSelectedMockCard() {}, setIsFullMock() {}, setSelectedSkill() {},
  setListeningQuestionIndex() {}, setListeningAnswers() {}, setListeningMatchingAnswers() {},
  setListeningShortAnswers() {}, setListeningMonologueIndex() {}, setListeningMonologueAnswers() {},
  setListeningSeconds: seconds => { ctx.listeningSeconds = seconds; },
  setScreen: screen => { ctx.screen = screen; }
});
ctx.openListeningTest({ skill: 'LISTENING', questionData: '[{}]' }).then(() => {
  assert.equal(ctx.listeningSeconds, 2400, 'Opening a new test resets the expired clock');
  assert.equal(ctx.screen, 'listeningStart');
  console.log('Missing data, part order, and expired timer regression checks passed');
}).catch(error => { console.error(error); process.exitCode = 1; });
