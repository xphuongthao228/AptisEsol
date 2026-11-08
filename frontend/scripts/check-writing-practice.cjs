const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/PracticeRunner.tsx'), 'utf8');
const ast = ts.createSourceFile('PracticeRunner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const runner = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PracticeRunner');
const handler = runner.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'checkWritingWithAi');
const gate = runner.body.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === 'canCheckCurrent'));
let requests = [];
const result = { overallScore: 38, cefrLevel: 'B2' };
const context = vm.createContext({
  writingScoringLock: { current: false }, writingPartIndex: 3, selectedWritingClubIndex: 1,
  writingScoreLoading: false, isWritingClubQuestion: true,
  mergedTemplateData: { clubs: [{}, { clubName: 'Art Club', parts: [
    { instructions: 'Short answers', prompts: ['Name?', 'Age?'] },
    { instructions: '20-30 words', prompts: ['Why join?'] },
    { prompts: ['Comment 1', 'Comment 2', 'Comment 3'] },
    { mainText: 'Meeting cancelled', prompts: ['Email friend', 'Email manager'] }
  ] }] },
  activeSavedAnswer: { '0-1-p2': 'Other club', '1-0-p1-0': 'Anna', '1-0-p1-1': 'Twenty', '1-1-p2': 'I enjoy art.', '1-2-p3-0': 'First', '1-2-p3-1': 'Second', '1-2-p3-2': 'Third', '1-3-p4-0': 'Hi friend', '1-3-p4-1': 'Dear manager' },
  api: { post: async (url, payload, config) => { requests.push({ url, payload, config }); return result; } },
  unwrap: async value => value,
  setWritingScore: value => { context.score = value; },
  setWritingScoreLoading: value => { context.writingScoreLoading = value; },
  setWritingScoreError: value => { context.error = value; },
  setWritingResultOpen: value => { context.open = value; },
  toast: { error: value => { context.validation = value; } }
});
vm.runInContext(ts.transpileModule(handler.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
const canCheck = () => vm.runInContext(`(() => { ${gate.getText(ast)} return canCheckCurrent; })()`, context);
(async () => {
  for (let page = 0; page < 3; page++) {
    context.writingPartIndex = page;
    assert.equal(canCheck(), false);
    await context.checkWritingWithAi();
  }
  assert.equal(requests.length, 0);
  context.writingPartIndex = 3;
  assert.equal(canCheck(), true);
  const first = context.checkWritingWithAi();
  assert.equal(canCheck(), false);
  await context.checkWritingWithAi();
  await first;
  assert.equal(requests.length, 1, 'Duplicate clicks must not create another AI request');
  const { url, payload } = requests[0];
  assert.equal(url, '/ai/writing/score');
  assert.equal(payload.parts.length, 4);
  assert.match(payload.parts[0].answer, /Anna/);
  assert.equal(payload.parts[1].answer, 'I enjoy art.');
  assert.match(payload.parts[2].answer, /Third/);
  assert.match(payload.parts[3].answer, /Dear manager/);
  assert.match(payload.parts[3].prompt, /Meeting cancelled/);
  assert.ok(!JSON.stringify(payload).includes('Other club'));
  assert.equal(context.score, result);
  assert.equal(context.writingScoreLoading, false);
  context.api.post = async () => { throw { response: { data: { message: 'AI unavailable' } } }; };
  await context.checkWritingWithAi();
  assert.equal(context.error, 'AI unavailable');
  assert.equal(context.score, null);
  assert.equal(context.writingScoringLock.current, false);
  context.activeSavedAnswer = {};
  await context.checkWritingWithAi();
  assert.ok(context.validation);
  console.log('Writing practice: page gate, four-part payload, AI result, duplicate guard and errors passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
