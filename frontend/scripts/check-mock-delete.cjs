const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminMockTests.tsx'), 'utf8');
const start = source.indexOf('async function deleteMockTestItems(');
const end = source.indexOf('\nfunction toApiMockTest(', start);
assert.ok(start > 0 && end > start);
let serverItems = [{ id: 42, externalId: 'import-full-1' }];
const deleted = [];
let unavailable = false;
const context = vm.createContext({
  identityExternalId: item => item.externalId || (/^\d+$/.test(item.id) ? '' : item.id),
  unwrap: value => value,
  api: {
    get: async () => { if (unavailable) throw Error('Unavailable'); return serverItems; },
    delete: async url => { deleted.push(url); if (url.endsWith('/43')) throw Error('Forbidden'); }
  }
});
vm.runInContext(ts.transpile(source.slice(start, end), { target: ts.ScriptTarget.ES2020 }), context);
(async () => {
  const result = await context.deleteMockTestItems([{ id: 'import-full-1' }, { id: 'local-only' }, { id: '999' }]);
  assert.deepEqual(deleted, ['/mock-tests/42']);
  assert.ok(result.every(item => item.status === 'fulfilled'));
  serverItems = [{ id: 42 }, { id: 43 }];
  const partial = await context.deleteMockTestItems([{ id: '42' }, { id: '43' }]);
  assert.equal(partial[0].status, 'fulfilled');
  assert.equal(partial[1].status, 'rejected');
  unavailable = true;
  const before = deleted.length;
  await assert.rejects(context.deleteMockTestItems([{ id: 'local-only' }]));
  assert.equal(deleted.length, before);
  console.log('Passed: external IDs, local-only and stale entries, partial failures, no clearing when server list fails.');
})().catch(error => { console.error(error); process.exitCode = 1; });
