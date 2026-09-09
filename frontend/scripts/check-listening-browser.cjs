// Actual Listening CSV fields as saved by the old importer, with delayed Pro.
// Run after npm run build: node --experimental-websocket scripts/check-listening-browser.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../reports/listening-browser');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5181', '--strictPort'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9241', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-mobile-')),
  'about:blank'
], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
(async () => {
  let serverReady = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch('http://127.0.0.1:5181')).ok) { serverReady = true; break; } } catch {}
    await delay(150);
  }
  if (!serverReady) throw new Error('Local preview did not start');
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9241/json')).json(); break; } catch { await delay(150); }
  }
  if (!targets) throw new Error('Chrome did not start');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  const waiting = new Map(); let nextId = 1; let pro = true;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++; waiting.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const user = { id: 90001, email: 'mobile-preview@example.invalid', fullName: 'Minh Anh', roles: ['STUDENT'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00', createdAt: '2026-01-01T00:00:00' };
  const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/listening-de01-legacy-import.json'), 'utf8').replace(/^\uFEFF/, ''));
  const errors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = waiting.get(message.id); waiting.delete(message.id);
      if (message.error) request?.reject(message.error); else request?.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const url = new URL(request.url); let data = [];
      if (!url.pathname.startsWith('/api/')) {
        send('Fetch.continueRequest', { requestId }).catch(() => {});
        return;
      }
      if (url.pathname.includes('/subscription/me')) data = { active: pro, proActive: pro, expiresAt: pro ? '2030-01-01T00:00:00' : null, daysLeft: pro ? 30 : 0 };
      else if (url.pathname.endsWith('/auth/heartbeat')) data = { user, visitorId: 'preview', onlineCount: 1 };
      else if (url.pathname.endsWith('/auth/me')) data = user;
      else if (url.pathname.endsWith('/mock-tests')) data = [{ id: 3, externalId: 'listening-03', skill: 'LISTENING', title: 'Listening CSV test 03', description: '', questions: '17', minutes: '40', status: 'PUBLISHED', accessible: true, accessOrder: 3, questionData: fixture.questionData }];
      else if (url.pathname.endsWith('/tests')) data = ['LISTENING', 'SPEAKING', 'READING'].flatMap((skill, i) => [1,2,3,4].map(part => ({ id: i * 4 + part, skillId: i + 1, skillName: skill, title: `${skill} Part ${part}`, description: 'Luyện tập theo part', durationMinutes: 15, status: 'PUBLISHED', mode: 'PRACTICE', questionCount: 5 })));
      else if (url.pathname.endsWith('/lessons')) data = [{ id: 1, skill: 'READING', title: 'Nhận diện từ khóa trong bài đọc', summary: 'Luyện kỹ năng đọc hiểu theo từng bước.', content: 'Đọc câu hỏi trước khi tìm thông tin.', status: 'PUBLISHED', resourceType: 'DOCUMENT', resourceUrl: null, partLabel: 'Reading · Part 1' }, { id: 2, skill: 'READING', title: 'Sắp xếp câu thành đoạn văn', summary: 'Nhận biết liên kết giữa các câu.', content: 'Tìm câu mở đầu và từ nối.', status: 'PUBLISHED', resourceType: 'DOCUMENT', resourceUrl: null, partLabel: 'Reading · Part 2' }];
      const fulfill = () => send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data, message: 'preview fixture' })).toString('base64') }).catch(() => {});
      setTimeout(fulfill, url.pathname.includes('/subscription/me') ? 1800 : 100);
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  const token = 'preview.' + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url') + '.preview';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); sessionStorage.setItem('aptis-community-invite-dismissed', '1'); localStorage.setItem('aptis-theme', 'light');` });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, label) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(100);
    }
    throw new Error(label + ': ' + await evaluate('document.body.innerText'));
  };
  await send('Page.navigate', { url: 'http://127.0.0.1:5181/app/mock-tests?skill=LISTENING' });
  await waitFor("document.body.innerText.includes('Đang tải đề')", 'Loading permissions');
  assert.equal(await evaluate("document.querySelectorAll('.mock-selection-card > button').length"), 0);
  await waitFor("document.querySelector('.mock-selection-card > button')", 'Test card');
  assert.equal(await evaluate("document.querySelector('.mock-selection-card > button').textContent.includes('Vào đề')"), true);
  await evaluate("document.querySelector('.mock-selection-card > button').click()");
  await waitFor("location.search.includes('listeningStart')", 'First click opens test 3');
  assert.equal(await evaluate("document.body.innerText.includes('nâng cấp tài khoản')"), false);
  // Restore the exact instructions screen from the user's screenshot.
  await send('Page.navigate', { url: 'http://127.0.0.1:5181/app/mock-tests?skill=LISTENING&screen=listeningInstructions&mockId=api-listening-03' });
  const nextButton = "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Next')";
  await waitFor(`!!(${nextButton}) && !(${nextButton}).disabled`, 'Next enabled after restore');
  await evaluate(`(${nextButton}).click()`);
  await waitFor("location.search.includes('screen=listeningQuestion')", 'First listening question');
  assert.ok(await evaluate("document.body.innerText.includes('Louis is having dinner')"));
  for (let i = 0; i < 13; i++) {
    await evaluate(`(${nextButton}).click()`);
    await delay(80);
  }
  await waitFor("location.search.includes('screen=listeningMatching')", 'Part 2');
  await evaluate(`(${nextButton}).click()`);
  await waitFor("location.search.includes('screen=listeningShort')", 'Part 3');
  await evaluate(`(${nextButton}).click()`);
  await waitFor("location.search.includes('screen=listeningMonologues')", 'Part 4');
  assert.ok(await evaluate("document.body.innerText.includes('16.1') && document.body.innerText.includes('16.2')"));
  await evaluate(`(${nextButton}).click()`);
  await delay(150);
  assert.ok(await evaluate("document.body.innerText.includes('17.1') && document.body.innerText.includes('17.2')"));
  await evaluate(`(${nextButton}).click()`);
  await waitFor("location.search.includes('screen=listeningResult')", 'Result after all parts');
  assert.deepEqual(errors, []);
  console.log('Browser passed: delayed Pro, first click test 3, restored Next, actual CSV Parts 1/2/3/4 and final result.');
  await send('Browser.close'); ws.close(); preview.kill();
})().catch(error => { console.error(error); process.exitCode = 1; ws?.close(); chrome.kill(); preview.kill(); });
