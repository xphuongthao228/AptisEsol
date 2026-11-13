const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/mockTestFilters.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, context);
const { hasCompletedMockCard, mockCardPriority, readingPeopleWithNames, selectFreePlacementCard } = context.exports;
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
const placementCards = [
  { id: 'paid', skill: 'FULL', ready: true, accessible: true, accessOrder: 3, title: 'Test 3', complete: true },
  { id: 'second', skill: 'FULL', ready: true, accessible: true, accessOrder: 2, title: 'Test 2', complete: true },
  { id: 'first', skill: 'FULL', ready: true, accessible: true, accessOrder: 1, title: 'Test 1', complete: true }
];
assert.equal(selectFreePlacementCard(placementCards, c => c.complete).id, 'first');
assert.equal(selectFreePlacementCard(placementCards.map(c => ({ ...c, complete: c.id !== 'first' })), c => c.complete).id, 'second');
assert.equal(selectFreePlacementCard(placementCards.filter(c => c.id === 'paid'), c => c.complete), null);
assert.equal(selectFreePlacementCard(placementCards.map(c => ({ ...c, accessible: false })), c => c.complete), null);
console.log('Placement uses a complete free test even for Pro users; never falls back to a paid test.');
const people = ['A','B','C','D'].map(label => ({label,text:label+' passage'}));
assert.equal(JSON.stringify(readingPeopleWithNames(people, ['Anna','Ben','Chloe','David'], []).map(p=>p.label)), JSON.stringify(['Anna','Ben','Chloe','David']));
assert.equal(JSON.stringify(readingPeopleWithNames(people, [], ['Anna','Ben','Anna','David','Chloe','David','Chloe']).map(p=>p.label)), JSON.stringify(['Anna','Ben','Chloe','David']));
assert.equal(readingPeopleWithNames(people, [], ['Anna','Alice','Ben','David'])[0].label, 'A');
assert.equal(readingPeopleWithNames(people, ['A','B','C','D'], ['A'])[0].label, 'A');
console.log('Reading names: imported options, older named answer keys, and ambiguous metadata checked.');
