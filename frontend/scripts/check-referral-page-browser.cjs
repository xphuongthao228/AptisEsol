// Visual/interaction check with isolated fixtures; never writes to the real backend.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../reports/referral-page');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5187', '--strictPort'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9247', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-roadmap-')), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let doneReading = false; let legacyReferral = false;
const user = { id: 99001, email: 'roadmap@example.invalid', fullName: 'Học viên thử nghiệm', roles: ['STUDENT'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00' };
const full = { id: 1, title: 'Full Test đầu vào', mockTestId: 'full-01', skill: 'FULL', score: 164, maxScore: 200, createdAt: '2026-11-04T08:00:00', resultJson: JSON.stringify({ reading: { score: 44 }, listening: { score: 38 }, speaking: { overallScore: 40 }, writing: { overallScore: 42 }, grammar: { score: 46 } }) };
(async () => {
  let targets;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5187')).ok) targets = await (await fetch('http://127.0.0.1:9247/json')).json();
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
      else if (url.pathname.endsWith('/payments/referral/me')) data = legacyReferral ? { code: 'REFEXAMPLE', discountPercent: 5 } : { code: 'REFEXAMPLE', discountPercent: 5, commissionPercent: 5, totalCommission: 1900, commissionOrders: 1, recentCommissions: [{ id: 1, orderId: 7, packageLabel: '1 Tuần', baseAmount: 38000, amount: 1900 }] };
      else if (url.pathname.endsWith('/ui-settings')) data = { studentTheme: 'light', studentSkin: 'default' };
      else if (url.pathname.endsWith('/mock-tests/results/my')) data = [full];
      else if (url.pathname.endsWith('/progress/roadmap')) data = { guideReviewed: true, predictionsReviewed: false, lastPracticedAt: '2026-11-04T09:00:00', skills: ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR'].map(skill => ({ skill, total: 3, completed: skill === 'READING' && doneReading ? 3 : 0 })) };
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5187' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') }).catch(error => errors.push(String(error)));
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  const token = 'preview.' + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url') + '.preview';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); localStorage.setItem('aptis-theme','light');` });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const reports = [];
  for (const width of [1366, 390]) {
    legacyReferral = false;
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: 'http://127.0.0.1:5187/app/referral' });
    for (let i = 0; i < 100; i++) { if (await evaluate(`(document.body?.innerText ?? "").includes('REFEXAMPLE')`)) break; await delay(150); }
    assert.equal(await evaluate(`document.querySelector('h1')?.textContent`), 'Mã giới thiệu');
    assert.ok(await evaluate(`(document.body?.innerText ?? "").includes('1.900đ')`));
    assert.ok(await evaluate(`!(document.body?.innerText ?? "").includes('NaN')`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'No page overflow');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, `referral-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    legacyReferral = true;
    await send('Page.reload', { ignoreCache: true });
    for (let i = 0; i < 100; i++) { if (await evaluate(`(document.body?.innerText ?? "").includes('Thống kê hoa hồng chưa khả dụng')`)) break; await delay(100); }
    assert.ok(await evaluate(`(document.body?.innerText ?? "").includes('Thống kê hoa hồng chưa khả dụng')`));
    assert.ok(await evaluate(`(document.body?.innerText ?? "").includes('REFEXAMPLE') && !(document.body?.innerText ?? "").includes('NaN')`));
    await send('Page.navigate', { url: 'http://127.0.0.1:5187/app/renewal' });
    for (let i = 0; i < 100; i++) { if (await evaluate(`!!document.getElementById('discount-code')`)) break; await delay(100); }
    assert.ok(await evaluate(`!!document.getElementById('discount-code')`), 'Checkout code input preserved');
    assert.ok(await evaluate(`!(document.body?.innerText ?? "").includes('Mã giới thiệu của bạn')`), 'Referral block removed from checkout');
    reports.push({ width, separateReferralPage: true, legacyDataSafe: true, checkoutInputPreserved: true, overflow: false });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(reports, null, 2));
  console.log('Passed: separate referral page, commission data, missing-field fallback and checkout input at desktop/mobile widths.');
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { ws?.close(); chrome.kill(); preview.kill(); });
