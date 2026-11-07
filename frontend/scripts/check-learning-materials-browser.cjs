// Browser checks use isolated API fixtures and never change real data.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../reports/learning-materials');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5188', '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9248', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-materials-')), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let items = [{ id: 1, title: 'Reading sample', category: 'Reading', description: 'Reading guide', resourceUrl: '/docs/sample.pdf', coverUrl: null, visible: true, sortOrder: 0 }];
let user = { id: 99002, email: 'materials@example.invalid', fullName: 'Admin', roles: ['ADMIN'], enabled: true };
(async () => {
  let targets;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:5188')).ok) targets = await (await fetch('http://127.0.0.1:9248/json')).json(); if (targets) break; } catch {} await delay(200); }
  assert.ok(targets, 'Preview and Chrome started');
  ws = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p?.reject(msg.error) : p?.resolve(msg.result); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = msg.params;
    const url = new URL(request.url); let data = [];
    if (!url.pathname.startsWith('/api/')) { send('Fetch.continueRequest', { requestId }); return; }
    if (url.pathname.endsWith('/auth/me')) data = user;
    else if (url.pathname.endsWith('/auth/heartbeat')) data = { user, visitorId: 'test', onlineCount: 1 };
    else if (url.pathname.includes('/learning-materials')) {
      if (request.method === 'POST') { const item = { ...JSON.parse(request.postData), id: 2 }; items.push(item); data = item; }
      else if (request.method === 'PUT') { const item = { ...JSON.parse(request.postData), id: Number(url.pathname.split('/').pop()) }; items = items.map(old => old.id === item.id ? item : old); data = item; }
      else if (request.method === 'DELETE') { items = items.filter(item => item.id !== Number(url.pathname.split('/').pop())); data = null; }
      else data = user.roles.includes('ADMIN') ? items : items.filter(item => item.visible);
    } else if (url.pathname.endsWith('/ui-settings')) data = { studentSkin: 'default', studentTheme: 'light' };
    else if (url.pathname.endsWith('/progress/roadmap')) data = { skills: [] };
    send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5188' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') }).catch(error => errors.push(String(error)));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  const token = 'preview.' + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url') + '.preview';
  const init = await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))});` });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; };
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); } throw Error('Timed out: ' + expression + ' BODY: ' + await evaluate('document.body.innerText') + ' ERRORS: ' + JSON.stringify(errors)); };
  const click = async label => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(label)}).click()`);
  for (const width of [1366, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: 'http://127.0.0.1:5188/admin/learning-materials' });
    await waitFor(`document.body.innerText.includes('Reading sample')`);
    await click('Thêm tài liệu');
    await waitFor(`!!document.querySelector('form')`);
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'No overflow with editor');
    await evaluate(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const el = document.querySelector('form input[maxlength="255"]'); set.call(el, 'New grammar'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await click('Lưu tài liệu');
    await waitFor(`!document.querySelector('form') && document.body.innerText.includes('New grammar')`);
    assert.equal(items.at(-1).title, 'New grammar');
    await evaluate(`Array.from(document.querySelectorAll('article')).find(a => a.innerText.includes('New grammar')).querySelector('button').click()`);
    await waitFor(`!!document.querySelector('form')`);
    await evaluate(`document.querySelector('form input[type="checkbox"]').click()`);
    await click('Lưu tài liệu');
    await waitFor(`!document.querySelector('form')`);
    assert.equal(items.at(-1).visible, false);
    fs.writeFileSync(path.join(output, `admin-${width}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await evaluate(`window.confirm = () => true; Array.from(document.querySelectorAll('article')).find(a => a.innerText.includes('New grammar')).querySelector('button:last-child').click()`);
    await waitFor(`!Array.from(document.querySelectorAll('article')).some(a => a.innerText.includes('New grammar'))`);
    assert.equal(items.length, 1);
  }
  user = { ...user, fullName: 'Student', roles: ['STUDENT'] };
  items.push({ ...items[0], id: 3, title: 'Hidden sample', visible: false });
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: init.identifier });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); sessionStorage.setItem('community-invite-dismissed', '1');` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5188/' });
  await waitFor(`!!document.querySelector('.learning-material-card')`);
  assert.equal(await evaluate(`document.querySelector('.learning-material-card h3').textContent`), 'Reading sample');
  assert.equal(await evaluate(`document.querySelector('.learning-material-download').getAttribute('href')`), '/docs/sample.pdf');
  assert.equal(await evaluate(`document.querySelectorAll('.learning-material-card').length`), 1);
  assert.deepEqual(errors, []);
  console.log('Passed: admin create/edit/hide/delete at desktop/mobile widths, no overflow, student download and visibility.');
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { ws?.close(); chrome.kill(); preview.kill(); });


