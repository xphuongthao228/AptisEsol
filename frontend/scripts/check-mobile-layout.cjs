// Local browser review with API fixtures; never connects to a real user account.
// Run: node --experimental-websocket scripts/check-mobile-layout.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../reports/mobile-preview');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9237', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-mobile-')),
  'about:blank'
], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
(async () => {
  let serverReady = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch('http://127.0.0.1:5178')).ok) { serverReady = true; break; } } catch {}
    await delay(150);
  }
  if (!serverReady) throw new Error('Local preview did not start');
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9237/json')).json(); break; } catch { await delay(150); }
  }
  if (!targets) throw new Error('Chrome did not start');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  const waiting = new Map(); let nextId = 1; let pro = false;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++; waiting.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const user = { id: 90001, email: 'mobile-preview@example.invalid', fullName: 'Minh Anh', roles: ['STUDENT'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00', createdAt: '2026-01-01T00:00:00' };
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
      else if (url.pathname.endsWith('/mock-tests')) data = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, externalId: `full-${i + 1}`, skill: 'FULL', title: `Aptis Full Test ${String(i + 1).padStart(2, '0')}`, description: 'Full Aptis test: Speaking + Listening + Grammar + Reading + Writing. Tổng thời gian 162 phút.', questions: '5 kỹ năng', minutes: '162 phút', status: 'PUBLISHED', accessible: pro || i < 2, accessOrder: i + 1, questionData: i < 2 || pro ? '[{"skill":"SPEAKING","part":1},{"skill":"READING","part":1}]' : null }));
      else if (url.pathname.endsWith('/tests')) data = ['LISTENING', 'SPEAKING', 'READING'].flatMap((skill, i) => [1,2,3,4].map(part => ({ id: i * 4 + part, skillId: i + 1, skillName: skill, title: `${skill} Part ${part}`, description: 'Luyện tập theo part', durationMinutes: 15, status: 'PUBLISHED', mode: 'PRACTICE', questionCount: 5 })));
      else if (url.pathname.endsWith('/lessons')) data = [{ id: 1, skill: 'READING', title: 'Nhận diện từ khóa trong bài đọc', summary: 'Luyện kỹ năng đọc hiểu theo từng bước.', content: 'Đọc câu hỏi trước khi tìm thông tin.', status: 'PUBLISHED', resourceType: 'DOCUMENT', resourceUrl: null, partLabel: 'Reading · Part 1' }, { id: 2, skill: 'READING', title: 'Sắp xếp câu thành đoạn văn', summary: 'Nhận biết liên kết giữa các câu.', content: 'Tìm câu mở đầu và từ nối.', status: 'PUBLISHED', resourceType: 'DOCUMENT', resourceUrl: null, partLabel: 'Reading · Part 2' }];
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data, message: 'preview fixture' })).toString('base64') }).catch(() => {});
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
  const routes = [['home', '/'], ['mock-tests', '/app/mock-tests'], ['parts', '/app/tests/parts'], ['lessons', '/app/lessons'], ['listening-tips', '/app/lessons/LISTENING']];
  const reports = [];
  for (const width of [390, 320, 430, 1366]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width > 600 ? 900 : 844, deviceScaleFactor: 1, mobile: width < 600 });
    for (const [name, route] of routes) {
      pro = name === 'parts' || name === 'lessons';
      await send('Page.navigate', { url: 'http://127.0.0.1:5178' + route });
      for (let i = 0; i < 60; i++) {
        if (await evaluate(`!!document.querySelector('h1') && !!document.querySelector('.mobile-bottom-nav')`)) break;
        await delay(150);
      }
      await delay(600);
      const metrics = await evaluate(`({title:document.querySelector('h1')?.textContent, width:innerWidth, scrollWidth:document.documentElement.scrollWidth, nav:!!document.querySelector('.mobile-bottom-nav') && getComputedStyle(document.querySelector('.mobile-bottom-nav')).display, active:[...document.querySelectorAll('.mobile-bottom-nav [aria-current]')].map(x=>x.textContent), buttons:[...document.querySelectorAll('.mock-selection-card > button')].map(x=>x.textContent)})`);
      if (!metrics.title) {
        console.log(await evaluate(`({url:location.href,body:document.body.innerText,html:document.documentElement.outerHTML.slice(0,1800)})`), errors);
      }
      assert.ok(metrics.title, name + ' missing heading');
      assert.ok(metrics.scrollWidth <= metrics.width, name + ' overflows at ' + width);
      if (!metrics.nav) console.log(name, width, await evaluate('document.body.innerText'), errors);
      assert.equal(metrics.nav, width < 600 ? 'grid' : 'none');
      if (name === 'mock-tests') {
        if (metrics.buttons.length === 0) console.log(await evaluate('document.body.innerText'), errors);
        assert.equal(metrics.buttons.filter(x => x.includes('Vào đề')).length, 2);
      }
      if (width === 390 || width === 1366) {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(output, `${name}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      }
      if (width === 390 && name === 'lessons') {
        await evaluate(`(()=>{const input=document.querySelector('input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'zzzzzz'); input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        await delay(250);
        assert.ok(await evaluate(`document.body.textContent.includes('Không tìm thấy bài học phù hợp')`));
      }
      reports.push({ name, width, ...metrics });
    }
  }
  assert.deepEqual(errors, [], 'Browser runtime exceptions');
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(reports, null, 2));
  console.log('Mobile layout passed: 5 routes at 320/390/430/1366px; no overflow; navigation, search and 2 free tests verified.');
  await send('Browser.close'); ws.close(); preview.kill();
})().catch(error => { console.error(error); process.exitCode = 1; ws?.close(); chrome.kill(); preview.kill(); });
