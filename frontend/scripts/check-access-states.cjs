const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const path = require('node:path');
function render(file, name, states, auth, props) {
  const source = fs.readFileSync(path.join(__dirname, '../src/routes', file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(ast)).join('\n');
  const store = () => auth;
  store.persist = { hasHydrated: () => true };
  const ctx = vm.createContext({ exports: {}, useAuthStore: store,
    useState: () => [states.shift(), () => {}], useEffect: () => {},
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    Navigate: 'Navigate', Outlet: 'Outlet', Crown: 'Crown', Link: 'Link', userHasRole: () => true });
  vm.runInContext(ts.transpileModule(code, { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020
  } }).outputText, ctx);
  return ctx.exports[name](props);
}
const pending = render('ProtectedRoute.tsx', 'ProtectedRoute', [true, false, false], { user: null, refreshToken: 'pending' }, {});
assert.equal(pending.type, 'div', 'Wait for session restoration before redirecting');
const guest = render('ProtectedRoute.tsx', 'ProtectedRoute', [true, false, false], {}, {});
assert.equal(guest.type, 'Navigate');
const failed = render('SubscriptionGate.tsx', 'SubscriptionGate', [false, false, true], {}, { requirePro: true });
assert.equal(failed.type, 'div', 'Network failure must show an error, not an upgrade notice');
assert.ok(JSON.stringify(failed).includes('Không kiểm tra được'));
console.log('Access-state checks passed');
