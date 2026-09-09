const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/MockTests.tsx'), 'utf8');
const ast = ts.createSourceFile('MockTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const ctx = vm.createContext({
  authenticated: true, proActive: false, selectedSkill: 'FULL',
  visibleCards: [{ id: '1', ready: true, accessible: true }, { id: '2', ready: true, accessible: true }, { id: '3', ready: true, accessible: false }],
  toast: { error() {}, success() {} }, navigate() {}, setCreatingRandom() {},
  window: { setTimeout: callback => callback() }, onOpenFull: card => { ctx.opened = card; }
});
function run(node) {
  vm.runInContext(ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText, ctx);
}
for (const node of ast.statements) {
  if (ts.isFunctionDeclaration(node) && ['canOpenMockCard', 'aiScoringError', 'compareMockCards', 'getMockCardOrderNumber'].includes(node.name?.text)) run(node);
}
const select = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MockSelect');
run(select.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'createRandomMockTest'));
assert.equal(ctx.canOpenMockCard({ accessible: true }, false), true);
assert.equal(ctx.canOpenMockCard({ accessible: false }, false), false);
assert.equal(ctx.canOpenMockCard({}, false), false, 'Missing server access must not grant a free slot');
assert.equal(ctx.canOpenMockCard({ accessible: false }, true), false, 'Server denial wins over stale Pro state');
assert.equal(ctx.canOpenMockCard({}, true), true, 'Pro can still open the protected question bank');
for (let i = 0; i < 100; i++) {
  ctx.createRandomMockTest();
  assert.ok(['1', '2'].includes(ctx.opened.id), 'Random must never open test 3 for Free');
}
ctx.visibleCards = [{ id: '3', ready: true, accessible: false }];
ctx.opened = null;
ctx.createRandomMockTest();
assert.equal(ctx.opened, null);
assert.ok(ctx.compareMockCards({ accessOrder: 1 }, { accessOrder: 3, featured: true }) < 0);
assert.match(ctx.aiScoringError({ response: { status: 403 } }, 'Writing'), /gia hạn/);
assert.doesNotMatch(ctx.aiScoringError({ response: { status: 403 } }, 'Writing'), /thử lại/);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MockTests');
ctx.subscription = { proActive: false };
ctx.selectedMockCard = { accessible: true };
run(component.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'requireProToStart'));
assert.equal(ctx.requireProToStart(), true, 'Retry reuses the selected free test');
assert.equal(ctx.requireProToStart({ accessible: false }), false);
Object.assign(ctx, {
  correctToAptis25: () => 10, clampScore50: value => value, cefrFromAptisTotal: () => 'B1',
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  CheckCircle2: 'CheckCircle2', FullResultStat: 'FullResultStat', ArrowLeft: 'ArrowLeft', RotateCcw: 'RotateCcw'
});
run(ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'FullResult'));
const resultProps = {
  grammar: { score: 20, cefr: 'A2' }, reading: { score: 20, cefr: 'A2', correct: 10, total: 25 },
  listening: { score: 20, cefr: 'A2', correct: 10, total: 25 }, totalScore: 40,
  speaking: null, writing: null, speakingError: 'Cần gia hạn', writingError: 'Cần gia hạn'
};
const result = JSON.stringify(ctx.FullResult(resultProps));
assert.ok(result.includes('Chưa đủ kết quả'));
assert.ok(result.includes('Cần gia hạn'));
assert.ok(!result.includes('A1'), 'Missing AI scores must not be classified as A1');
assert.ok(!result.includes('40/200'), 'Missing AI scores must not produce a final total');
console.log('Mock access checks passed: free slots, locked/missing access, random, stable order, AI permission errors');
