// Visual/interaction check with isolated fixtures; never writes to the real backend.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../reports/referral-withdrawals');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5188', '--strictPort'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9248', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-roadmap-')), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let doneReading = false; let legacyReferral = false; let lowBalance = true; let pendingRequest = null; let postCount = 0;
const user = { id: 99001, email: 'roadmap@example.invalid', fullName: 'Học viên thử nghiệm', roles: ['STUDENT'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00' };
const full = { id: 1, title: 'Full Test đầu vào', mockTestId: 'full-01', skill: 'FULL', score: 164, maxScore: 200, createdAt: '2026-11-04T08:00:00', resultJson: JSON.stringify({ reading: { score: 44 }, listening: { score: 38 }, speaking: { overallScore: 40 }, writing: { overallScore: 42 }, grammar: { score: 46 } }) };
(async () => {
  let targets;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5188')).ok) targets = await (await fetch('http://127.0.0.1:9248/json')).json();
      if (targets) break;
    } catch {}
    await delay(200);
  }
  assert.ok(targets, 'Preview and Chrome must start');
  ws = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let nextId = 1; const pending = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p?.reject(message.error) : p?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const url = new URL(request.url); let data = [];
      if (!url.pathname.startsWith('/api/')) { send('Fetch.continueRequest', { requestId }); return; }
      if (url.pathname.endsWith('/auth/me')) data = user;
      else if (url.pathname.endsWith('/auth/heartbeat')) data = { user, visitorId: 'roadmap-test', onlineCount: 1 };
      else if (url.pathname.endsWith('/subscription/me')) data = { active: true, proActive: true, expiresAt: user.proExpiresAt, daysLeft: 999 };
      else if (url.pathname.endsWith('/payments/referral/withdrawals') && request.method === 'POST') {
        const payload = JSON.parse(request.postData); assert.equal(payload.amount, 60000); assert.equal(payload.accountNumber, '00123456789'); assert.ok(payload.requestKey); postCount++;
        pendingRequest = { id: 1, ...payload, accountNumber: '••••6789', status: 'PENDING', createdAt: '2026-11-04T16:00:00' }; data = pendingRequest;
      }
      else if (url.pathname.endsWith('/payments/referral/withdrawals/me')) data = { items: pendingRequest ? [pendingRequest] : [], page: 0, totalPages: pendingRequest ? 1 : 0, totalElements: pendingRequest ? 1 : 0 };
      else if (url.pathname.endsWith('/payments/referral/me')) data = legacyReferral ? { code: 'REFEXAMPLE', discountPercent: 5 } : { code: 'REFEXAMPLE', discountPercent: 5, commissionPercent: 5, totalCommission: lowBalance ? 1900 : 100000, availableCommission: lowBalance ? 1900 : pendingRequest ? 40000 : 100000, pendingWithdrawal: pendingRequest ? 60000 : 0, withdrawnCommission: 0, minimumWithdrawal: 60000, commissionOrders: 1, recentCommissions: [{ id: 1, orderId: 7, packageLabel: '1 Tuần', baseAmount: 38000, amount: 1900 }] };
      else if (url.pathname.endsWith('/ui-settings')) data = { studentTheme: 'light', studentSkin: 'default' };
      else if (url.pathname.endsWith('/mock-tests/results/my')) data = [full];
      else if (url.pathname.endsWith('/progress/roadmap')) data = { guideReviewed: true, predictionsReviewed: false, lastPracticedAt: '2026-11-04T09:00:00', skills: ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR'].map(skill => ({ skill, total: 3, completed: skill === 'READING' && doneReading ? 3 : 0 })) };
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5188' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') }).catch(error => errors.push(String(error)));
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  const token = 'preview.' + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url') + '.preview';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); localStorage.setItem('aptis-theme','light');` });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const reports = [];
  for (const width of [1366, 390]) {
    lowBalance = true; pendingRequest = null; postCount = 0;
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: 'http://127.0.0.1:5188/app/referral' });
    for (let i = 0; i < 100; i++) { if (await evaluate(`(document.body?.innerText ?? '').includes('Rút tối thiểu')`)) break; await delay(100); }
    const withdrawButton = `Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Yêu cầu rút')`;
    assert.ok(await evaluate(`(${withdrawButton})?.disabled`), 'Balance below minimum disables withdrawal');
    assert.ok(await evaluate(`document.body.innerText.includes('60.000đ')`));
    lowBalance = false;
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cập nhật')).click()`);
    for (let i = 0; i < 100; i++) { if (await evaluate(`!(${withdrawButton})?.disabled`)) break; await delay(100); }
    await evaluate(`(${withdrawButton}).click()`);
    for (let i = 0; i < 100; i++) { if (await evaluate(`!!document.querySelector('input[name=bankName]')`)) break; await delay(100); }
    const setInput = async (name, value) => evaluate(`(()=>{const field=document.querySelector('input[name=${name}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,${JSON.stringify(value)}); field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await setInput('bankName', 'VCB'); await setInput('accountNumber', '00123456789'); await setInput('accountHolder', 'TEST USER'); await setInput('amount', '74000');
    await delay(100); await evaluate(`document.querySelector('input[name=amount]').form.requestSubmit()`); await delay(200);
    assert.equal(postCount, 0, 'Below-minimum form does not submit');
    await setInput('amount', '60000'); await delay(100); await evaluate(`document.querySelector('input[name=amount]').form.requestSubmit()`);
    for (let i = 0; i < 100; i++) { if (await evaluate(`(document.body?.innerText ?? '').includes('Chờ xử lý')`)) break; await delay(100); }
    assert.equal(postCount, 1); assert.ok(await evaluate(`document.body.innerText.includes('Chờ xử lý')`));
    assert.ok(await evaluate(`(${withdrawButton})?.disabled`), 'Pending request prevents another withdrawal');
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
    await evaluate(`window.scrollTo(0,0)`); await delay(200);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(output, `withdrawal-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    reports.push({ width, minimumEnforced: true, formSubmitted: true, pendingLocksBalance: true, overflow: false });
  }
  assert.deepEqual(errors, []); fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(reports, null, 2));
  console.log('Passed: minimum 60,000 VND, bank form, successful request and pending state on desktop/mobile (isolated fixtures).');
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { ws?.close(); chrome.kill(); preview.kill(); });
