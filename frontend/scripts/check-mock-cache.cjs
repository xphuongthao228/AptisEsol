const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminMockTests.tsx'), 'utf8');
const start = source.indexOf('function cacheMockTests(');
const end = source.indexOf('\nfunction fromApiMockTest(', start);
assert.ok(start >= 0 && end > start);
let stored;
let full = false;
const context = vm.createContext({
  STORAGE_KEY: 'aptis-admin-mock-tests',
  isBackendId: id => /^\d+$/.test(id),
  window: { localStorage: { setItem: (key, value) => {
    assert.equal(key, 'aptis-admin-mock-tests');
    if (full) throw Error('QuotaExceededError');
    stored = JSON.parse(value);
  } } }
});
vm.runInContext(ts.transpile(source.slice(start, end), { target: ts.ScriptTarget.ES2020 }), context);
const items = [{ id: '42', title: 'Server test', questionData: 'large JSON' }, { id: 'local-test', questionData: 'local JSON' }];
assert.equal(context.cacheMockTests(items), true);
assert.equal(stored[0].questionData, undefined);
assert.equal(stored[1].questionData, 'local JSON');
assert.equal(items[0].questionData, 'large JSON', 'In-memory editor keeps all questions');
full = true;
assert.equal(context.cacheMockTests(items), false, 'Quota failure does not throw into server mutation flow');
console.log('Passed: compact server cache, local questions preserved, editor data intact, quota failure handled.');
