const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/Renewal.tsx'), 'utf8');
const ast = ts.createSourceFile('Renewal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'Renewal');
const handler = component.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'applyDiscount');
const code = ts.transpileModule(handler.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function setup(result) {
  const requests = [], successes = [], errors = [];
  const auth = { user: { id: 1, proExpiresAt: null }, setUser: user => { auth.user = user; } };
  const context = vm.createContext({
    Date, Math, discountInput: ' PRO1DAY ', selectedPackage: { days: 0 }, creating: false,
    applyLock: { current: false }, quoteVersion: { current: 0 }, quote: null,
    api: { post: async (url, payload) => { requests.push({ url, payload }); return typeof result === 'function' ? result() : result; } },
    unwrap: async promise => promise,
    setApplying: value => { context.applying = value; },
    setPayment: value => { context.payment = value; },
    setQuote: value => { context.quote = value; },
    setGiftApplied: value => { context.gift = value; },
    setDiscountInput: value => { context.discountInput = value; },
    setServerSubscription: value => { context.subscription = value; },
    saveSubscriptionUntil: value => { context.expiry = value; },
    useAuthStore: { getState: () => auth },
    toast: { success: value => successes.push(value), error: value => errors.push(value) }
  });
  vm.runInContext(code, context);
  return { context, requests, successes, errors, auth };
}
(async () => {
  const gift = { code: 'PRO1DAY', days: 1, expiresAt: '2030-01-02T12:00:00' };
  const free = setup({ type: 'PRO_DAYS', gift });
  await free.context.applyDiscount();
  assert.equal(free.requests.length, 1);
  assert.equal(free.requests[0].url, '/discounts/apply');
  assert.equal(free.requests[0].payload.code, 'PRO1DAY');
  assert.equal(free.requests[0].payload.days, 0);
  assert.equal(free.context.expiry, gift.expiresAt);
  assert.equal(free.auth.user.proExpiresAt, gift.expiresAt);
  assert.equal(free.context.subscription.proActive, true);
  assert.equal(free.context.quote, null);
  assert.equal(free.context.discountInput, '');

  const quote = { originalAmount: 140000, amount: 126000, discountAmount: 14000, discountCode: 'SALE10' };
  const paid = setup({ type: 'PAYMENT', quote });
  paid.context.discountInput = 'SALE10'; paid.context.selectedPackage.days = 30;
  await paid.context.applyDiscount();
  assert.equal(paid.context.quote, quote);
  assert.equal(paid.auth.user.proExpiresAt, null);

  const invalid = setup(() => { throw { response: { data: { message: 'Already used' } } }; });
  await invalid.context.applyDiscount();
  assert.deepEqual(invalid.errors, ['Already used']);
  assert.equal(invalid.auth.user.proExpiresAt, null);
  assert.equal(invalid.context.applyLock.current, false);

  let resolve;
  const pending = setup(() => new Promise(done => { resolve = done; }));
  const first = pending.context.applyDiscount();
  await pending.context.applyDiscount();
  assert.equal(pending.requests.length, 1, 'Repeated clicks send one redemption request');
  resolve({ type: 'PRO_DAYS', gift }); await first;
  console.log('Unified code checks passed: free Pro activation, payment discount, errors and repeated-click protection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
