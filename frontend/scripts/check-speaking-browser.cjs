// Run after npm run build. Fixtures are only intercepted by this isolated test browser.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../reports/speaking-browser');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5182', '--strictPort'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9242', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-speaking-')), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
(async () => {
  let targets;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://127.0.0.1:5182')).ok) { targets = await (await fetch('http://127.0.0.1:9242/json')).json(); break; } } catch {}
    await delay(150);
  }
  if (!targets) throw new Error('Preview or browser unavailable');
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let nextId = 0;
  const waiting = new Map();
  const errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId; waiting.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const user = { id: 90102, email: 'speaking@example.invalid', fullName: 'Speaking Preview', roles: ['STUDENT'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00' };
  const row = { id: 'free-time', part: 'Speaking Part 1', topic: 'Free time', form: 'Personal questions', question: 'What do you do in your free time?', vi: 'Bạn làm gì trong thời gian rảnh?', targetWords: '30 giây', section: 'opening', text: 'I enjoy reading books in my free time.', textVi: 'Tôi thích đọc sách trong thời gian rảnh.', level: 'B1', tag: 'Giới thiệu' };
  const samples = [row];
  const answers = [{ ...row, id: 'travel', part: 'Speaking Part 4', topic: 'Travel', question: 'Describe a memorable journey.', text: 'Last year I travelled with my family.', level: 'B2' }];
  let empty = false;
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = waiting.get(message.id); waiting.delete(message.id); if (message.error) item?.reject(message.error); else item?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      let data = [];
      if (url.pathname.endsWith('/subscription/me')) data = { active: true, proActive: true, daysLeft: 30 };
      else if (url.pathname.endsWith('/auth/me')) data = user;
      else if (url.pathname.endsWith('/auth/heartbeat')) data = { user, visitorId: 'preview', onlineCount: 1 };
      else if (url.pathname.endsWith('/ui-settings')) data = { studentSkin: 'default', studentTheme: 'light' };
      else if (url.pathname.endsWith('/speaking-bank/samples')) data = empty ? [] : samples;
      else if (url.pathname.endsWith('/speaking-bank/answers')) data = empty ? [] : answers;
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5182' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') }).catch(() => {});
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
  const token = 'test.' + Buffer.from(JSON.stringify({ exp: 1893456000 })).toString('base64url') + '.test';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); sessionStorage.setItem('aptis-community-invite-dismissed', '1'); localStorage.setItem('aptis-theme', 'light');` });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error('Missing: ' + expression + ': ' + await evaluate('document.body.innerText') + ' runtime errors: ' + JSON.stringify(errors)); };
  const click = text => evaluate(`[...document.querySelectorAll('button')].findLast(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/app/speaking-bank' });
  await waitFor("document.querySelector('.speaking-studio')");
  await evaluate("document.querySelector('.ss-topline button').click()");
  await waitFor("document.querySelector('.speaking-bank-page') && !document.body.innerText.includes('Đang tải kho Speaking')");
  await click('Kho mẫu câu');
  await waitFor("document.body.innerText.includes('I enjoy reading books')");
  await click('Yêu thích');
  await click('Ghép bài');
  await click('Lưu bài nói');
  await evaluate("document.querySelector('nav[aria-label=\"Kho Speaking\"] button:nth-child(4)').click()");
  await waitFor("document.body.innerText.includes('Đã thích')");
  await evaluate("document.querySelector('nav[aria-label=\"Kho Speaking\"] button:nth-child(5)').click()");
  await waitFor("document.body.innerText.includes('I enjoy reading books')");
  await evaluate("document.querySelector('nav[aria-label=\"Kho Speaking\"] button:nth-child(3)').click()");
  await waitFor("document.body.innerText.includes('Describe a memorable journey.')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.speaking-bank-page select')).backgroundColor"), 'rgb(255, 255, 255)');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.speaking-bank-page input')).backgroundColor"), 'rgb(255, 255, 255)');
  assert.ok((await evaluate("getComputedStyle(document.querySelector('.speaking-bank-page main > header')).backgroundImage")).includes('rgb(255, 240, 245)'));
  await evaluate("{ const select = document.querySelector('select[aria-label=\"Part\"]'); select.value='Speaking Part 1'; select.dispatchEvent(new Event('change', {bubbles:true})); }");
  await waitFor("document.body.innerText.includes('Chưa có nội dung phù hợp bộ lọc')");
  await evaluate("{ const select = document.querySelector('select[aria-label=\"Part\"]'); select.value='all'; select.dispatchEvent(new Event('change', {bubbles:true})); }");
  await waitFor("document.body.innerText.includes('Describe a memorable journey.')");
  fs.writeFileSync(path.join(output, 'desktop.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click('Ẩn danh mục');
  await delay(250);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Mobile must not overflow horizontally');
  fs.writeFileSync(path.join(output, 'mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  empty = true;
  await send('Page.reload');
  await waitFor("document.querySelector('.speaking-studio')");
  await evaluate("document.querySelector('.ss-topline button').click()");
  await waitFor("document.querySelector('.speaking-bank-page') && !document.body.innerText.includes('Đang tải kho Speaking')");
  await click('Kho mẫu câu');
  await waitFor("document.body.innerText.includes('Kho Speaking chưa có dữ liệu')");
  assert.deepEqual(errors, []);
  console.log('Speaking browser passed: samples, answers, filters, favorites, saved practice, empty state and mobile layout.');
  await send('Browser.close'); ws.close(); preview.kill();
})().catch(error => { console.error(error); process.exitCode = 1; ws?.close(); chrome.kill(); preview.kill(); });
