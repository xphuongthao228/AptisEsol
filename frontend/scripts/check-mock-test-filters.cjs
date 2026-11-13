const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/mockTestFilters.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, context);
const { hasCompletedMockCard, mockCardPriority } = context.exports;
const card = { id: 'api-full-01', skill: 'FULL' };
assert.equal(hasCompletedMockCard(card, [], []), false);
assert.equal(hasCompletedMockCard(card, [{ mockTestId: card.id, skill: 'FULL' }], []), true);
assert.equal(hasCompletedMockCard(card, [{ mockTestId: card.id, skill: 'LISTENING' }], []), false);
assert.equal(hasCompletedMockCard(card, [{ mockTestId: 'api-full-02', skill: 'FULL' }], []), false);
assert.equal(hasCompletedMockCard({ ...card, practiceTestId: 12 }, [], [{ testId: 12 }]), false);
assert.equal(hasCompletedMockCard({ id: 'test-12', skill: 'READING', practiceTestId: 12 }, [], [{ testId: 12 }]), true);
assert.equal(mockCardPriority({ priority: 'NOTABLE', featured: true }), 'NOTABLE');
assert.equal(mockCardPriority({ featured: true }), 'IMPORTANT');
assert.equal(mockCardPriority({}), 'REFERENCE');
assert.equal(mockCardPriority({ title: 'Aptis Full Test 17 - Đáng chú ý', priority: 'REFERENCE' }), 'NOTABLE');
assert.equal(mockCardPriority({ title: 'Aptis Full Test 01 - Quan trọng' }), 'IMPORTANT');
assert.equal(mockCardPriority({ title: 'Aptis Full Test 21 - Tham khảo' }), 'REFERENCE');
console.log('Mock filters passed: saved results, skill isolation, submissions and priority fallback.');
