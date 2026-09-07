const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual component's navigation and timer callbacks without a browser.
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/MockTests.tsx'), 'utf8');
const ast = ts.createSourceFile('MockTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'MockTests');
const context = vm.createContext({
  mockCardMeta: { FULL: {}, SPEAKING: {}, LISTENING: {}, GRAMMAR: {}, READING: {}, WRITING: {} },
  fullRequiredSkills: ['SPEAKING', 'LISTENING', 'GRAMMAR', 'READING', 'WRITING'],
  activeListeningCard: {}, activeGrammarCard: {}, activeReadingCard: {}, activeWritingCard: {},
  activeListeningPart1Questions: [], activeListeningMatchingData: { options: [], speakers: [] },
  activeListeningShortData: { statements: [], options: [] }, activeListeningMonologues: [],
  activeReadingData: { gaps: [], cohesion: [], opinion: { questions: [] }, long: { paragraphs: [] } },
  activeGrammarQuestions: [{}], activeWritingParts: [{ heading: 'Imported task', prompt: '', questions: [] }],
  isFullMock: true, screen: '', readingSeconds: 12, listeningSeconds: 12, grammarSeconds: 12, writingSeconds: 12,
  setScreen: value => { context.screen = value; },
  setListeningQuestionIndex: value => { context.listeningQuestionIndex = value; },
  setReadingCohesionIndex: value => { context.readingCohesionIndex = value; },
  submitWritingForAi: value => { context.submittedTo = value; },
  window: { setInterval: callback => { context.tick = callback; return 1; }, clearInterval() {} }
});
for (const skill of ['Reading', 'Listening', 'Grammar', 'Writing']) {
  const key = `${skill.toLowerCase()}Seconds`;
  context[`set${skill}Seconds`] = value => { context[key] = typeof value === 'function' ? value(context[key]) : value; };
}
const run = code => vm.runInContext(ts.transpileModule(code, {
  fileName: 'check.tsx', compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React }
}).outputText, context);
context.repairUserText = value => String(value ?? '');
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && node.name?.text !== 'MockTests') run(node.getText(ast));
}
for (const node of ast.statements) {
  if (!ts.isVariableStatement(node)) continue;
  const name = node.declarationList.declarations[0].name.getText(ast);
  if (['emptyReadingTestData', 'fallbackReadingTestData', 'writingParts', 'grammarQuestions',
    'listeningPart1AnswerKey', 'listeningMatchingOptions', 'listeningMatchingAnswerKey',
    'listeningShortStatements', 'listeningSpeakerOptions', 'listeningShortAnswerKey',
    'listeningMonologues', 'listeningMonologueAnswerKey'].includes(name)) run(node.getText(ast));
}
const names = ['hasActiveListeningData', 'hasActiveReadingData', 'nextFullScreenAfter',
  'hasActiveListeningMatchingData', 'hasActiveListeningShortData', 'firstListeningQuestionScreen',
  'nextListeningScreenAfter', 'firstReadingQuestionScreen', 'nextReadingScreenAfter',
  'previousListeningScreenBefore', 'previousReadingScreenBefore'];
for (const node of component.body.statements) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name.text)) run(node.getText(ast));
}
assert.equal(context.nextFullScreenAfter('SPEAKING'), 'grammarStart');
context.activeGrammarCard = null;
assert.equal(context.nextFullScreenAfter('SPEAKING'), 'writingInstructions');
context.activeWritingCard = null;
assert.equal(context.nextFullScreenAfter('SPEAKING'), 'fullResult');
context.activeWritingCard = {};
context.activeListeningPart1Questions = [{}, {}];
assert.equal(context.previousListeningScreenBefore('monologues'), 'listeningQuestion');
assert.equal(context.listeningQuestionIndex, 1);
context.activeListeningMonologues = [{}];
assert.equal(context.nextListeningScreenAfter('part1'), 'listeningMonologues');
context.activeReadingData.long.paragraphs = ['text'];
assert.equal(context.firstReadingQuestionScreen(), 'readingLong');
assert.equal(context.previousReadingScreenBefore('long'), 'readingInstructions');
context.activeReadingData.cohesion = [{}, {}];
assert.equal(context.previousReadingScreenBefore('long'), 'readingCohesion');
assert.equal(context.readingCohesionIndex, 1);

const effects = component.body.statements.filter(node => ts.isExpressionStatement(node)
  && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'useEffect');
for (const [skill, screens, destination] of [
  ['reading', ['readingQuestion', 'readingCohesion', 'readingOpinion', 'readingLong'], 'writingInstructions'],
  ['listening', ['listeningQuestion', 'listeningMatching', 'listeningShort', 'listeningMonologues'], 'readingStart'],
  ['grammar', ['grammarQuestion'], 'readingStart'],
  ['writing', ['writingPart'], 'fullResult']
]) {
  const effect = effects.find(node => node.getText(ast).includes(`${skill}Seconds <= 0`));
  assert.ok(effect, `${skill} must handle expiry`);
  const callback = effect.expression.arguments[0].getText(ast);
  for (const screen of screens) {
    context.screen = screen;
    context[`${skill}Seconds`] = 12;
    run(`(${callback})()`);
    context.tick();
    assert.equal(context[`${skill}Seconds`], 11, `${screen} counts down`);
    context[`${skill}Seconds`] = 0;
    run(`(${callback})()`);
    assert.equal(skill === 'writing' ? context.submittedTo : context.screen, destination, `${screen} finishes at zero`);
  }
}
console.log('Full Test regression checks passed: missing sections, backward navigation, all timed screens and expiry.');

const card = (skill, rows) => ({ skill, questionData: JSON.stringify(rows) });
for (const input of [null, { questionData: 'broken JSON' }, { questionData: '[]' }]) {
  assert.equal(context.getSpeakingTestDataFromCard(input).part1.length, 0);
  assert.equal(context.getSpeakingTestDataFromCard(input).part4.questions.length, 0);
  assert.equal(context.getReadingTestDataFromCard(input).gaps.length, 0);
  assert.equal(context.grammarQuestionsFromCard(input).length, 0);
  assert.equal(context.writingPartsFromCard(input).length, 0);
  assert.equal(context.listeningQuestionsFromCard(input).length, 0);
  assert.equal(context.getListeningMatchingDataFromCard(input).options.length, 0);
  assert.equal(context.getListeningShortDataFromCard(input).statements.length, 0);
  assert.equal(context.getListeningMonologuesFromCard(input).length, 0);
}
const importedWriting = context.writingPartsFromCard(card('WRITING', [
  { skill: 'WRITING', part: 2, heading: 'Unique imported heading', prompt: 'Unique imported prompt' }
]));
assert.equal(importedWriting[1].prompt, 'Unique imported prompt');
for (const index of [0, 2, 3]) {
  assert.equal(context.hasWritingPartData(importedWriting[index]), false);
  assert.equal(importedWriting[index].questions.length, 0);
  assert.equal(importedWriting[index].sampleAnswers, undefined);
}
const grammar = [{ prompt: 'Imported grammar', options: ['a', 'b'], answer: 'a' }];
assert.equal(context.normalizeGrammarVocabularyScreens(grammar, true).length, 1, 'No vocabulary filler');
const matching = context.getListeningMatchingDataFromCard(card('LISTENING', [{ skill: 'LISTENING', part: 2 }]));
assert.equal(matching.options.length, 0);
assert.equal(matching.prompt, '');
const short = context.getListeningShortDataFromCard(card('LISTENING', [{ skill: 'LISTENING', part: 3 }]));
assert.equal(short.statements.length, 0);
assert.equal(short.answerKey.length, 0);
assert.equal(context.getListeningMonologueAnswerKey([{ questions: [{ prompt: 'Imported question', options: ['A', 'B'] }] }])['0-0'], '');
assert.equal(context.sameAnswer('', ''), false, 'An absent answer key cannot award marks');
assert.equal(context.scoreListeningAnswers({}, {}, {}, {}).total, 0);
assert.equal(context.scoreListeningAnswers({}, {}, {}, {}).score, 0);
console.log('Imported-only checks passed: empty/malformed data, partial Writing, no vocabulary filler, no sample Listening keys.');
