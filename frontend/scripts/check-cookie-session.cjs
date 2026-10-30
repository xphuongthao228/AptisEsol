const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/api/client.ts'), 'utf8');
const ast = ts.createSourceFile('client.ts', source, ts.ScriptTarget.Latest, true);
const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'restoreCookieSession');
const code = ts.transpileModule(fn.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 }
}).outputText;
const failure = status => ({ isAxiosError: true, response: { status } });

async function check(sessionStatus, refreshStatus) {
  let cleared = false;
  let refreshed = 0;
  const auth = { accessToken: 'new-token', refreshToken: 'new-refresh' };
  const ctx = vm.createContext({
    axios: { isAxiosError: error => error.isAxiosError === true },
    useAuthStore: { getState: () => ({ clearAuth: () => { cleared = true; } }) },
    authApi: {
      get: async () => {
        if (sessionStatus) throw failure(sessionStatus);
        return { data: { data: auth } };
      },
      post: async (...args) => {
        assert.deepEqual(args, ['/auth/refresh-token']);
        refreshed++;
        if (refreshStatus) throw failure(refreshStatus);
        return { data: { data: auth } };
      }
    }
  });
  vm.runInContext(code, ctx);
  let result, error;
  try { result = await ctx.restoreCookieSession(); } catch (caught) { error = caught; }
  return { cleared, refreshed, result, error };
}

(async () => {
  assert.equal((await check()).refreshed, 0);
  assert.equal((await check(401)).result.accessToken, 'new-token');
  assert.equal((await check(401, 400)).cleared, true);
  assert.equal((await check(401, 401)).cleared, true);
  const unavailable = await check(503);
  assert.equal(unavailable.refreshed, 0);
  assert.equal(unavailable.cleared, false);
  const refreshUnavailable = await check(401, 503);
  assert.equal(refreshUnavailable.cleared, false);
  assert.equal(refreshUnavailable.error.response.status, 503);
  const forbidden = await check(403);
  assert.equal(forbidden.refreshed, 0);
  assert.equal(forbidden.cleared, false);
  console.log('Cookie session recovery checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
