// Visual/interaction check with isolated fixtures; never writes to the real backend.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../reports/learning-roadmap');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5186', '--strictPort'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9246', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-roadmap-')), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let doneReading = false;
const user = { id: 99001, email: 'roadmap@example.invalid', fullName: 'Học viên thử nghiệm', roles: ['STUDENT'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00' };
const full = { id: 1, title: 'Full Test đầu vào', mockTestId: 'full-01', skill: 'FULL', score: 164, maxScore: 200, createdAt: '2026-11-04T08:00:00', resultJson: JSON.stringify({ reading: { score: 44 }, listening: { score: 38 }, speaking: { overallScore: 40 }, writing: { overallScore: 42 }, grammar: { score: 46 } }) };
(async () => {
  let targets;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5186')).ok) targets = await (await fetch('http://127.0.0.1:9246/json')).json();
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
      else if (url.pathname.endsWith('/ui-settings')) data = { studentTheme: 'light', studentSkin: 'default' };
      else if (url.pathname.endsWith('/mock-tests/results/my')) data = [full];
      else if (url.pathname.endsWith('/progress/roadmap')) data = { guideReviewed: true, predictionsReviewed: false, lastPracticedAt: '2026-11-04T09:00:00', skills: ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR'].map(skill => ({ skill, total: 3, completed: skill === 'READING' && doneReading ? 3 : 0 })) };
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5186' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') }).catch(error => errors.push(String(error)));
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  const token = 'preview.' + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url') + '.preview';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); localStorage.setItem('aptis-theme','light');` });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const reports = [];
  for (const width of [1366, 320, 393, 430]) {
    doneReading = false;
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: 'http://127.0.0.1:5186/app' });
    for (let i = 0; i < 100; i++) { if (await evaluate(`document.querySelector('.learning-roadmap-status')?.textContent.includes('Chặng 4') && !!document.querySelector('.learning-radar-membrane')`)) break; await delay(150); }
    const statusText = await evaluate(`document.querySelector('.learning-roadmap-status')?.textContent`);
    assert.ok(statusText?.includes('Chặng 4: Reading'), JSON.stringify({ width, statusText, errors }));
    assert.equal(await evaluate(`document.querySelectorAll('.learning-radar-chart circle').length`), 5);
    assert.ok(await evaluate(`document.querySelector('.learning-radar-chart').textContent.includes('Reading (44)')`));
    assert.ok(await evaluate(`document.querySelector('.learning-radar-summary').textContent.includes('164 / 200')`));
    assert.ok(await evaluate(`document.querySelector('[aria-label="Chặng 2: Thi thử đầu vào"]').href.includes('screen=fullStart')`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'No page overflow');
    if (width < 640) {
      assert.ok(await evaluate(`(() => {
        const frame = document.querySelector('.learning-map-scroll');
        const map = document.querySelector('.learning-map');
        const image = document.querySelector('.learning-map-image');
        const bounds = frame.getBoundingClientRect();
        const rect = image.getBoundingClientRect();
        return image.complete && image.naturalWidth > 0
          && frame.scrollWidth <= frame.clientWidth + 1
          && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
          && Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight) < .02
          && [...map.querySelectorAll('.learning-map-hotspot')].every(link => {
            const r = link.getBoundingClientRect();
            return r.left >= bounds.left - 1 && r.right <= bounds.right + 1;
          });
      })()`), 'The complete map and all 11 stage links fit the mobile frame at ' + width);
    }
    assert.ok(await evaluate(`(() => { const link = document.querySelector('.learning-summary-grid article:last-child a'); return link.textContent.includes('Thi thử đầu vào') && link.href.includes('screen=fullStart'); })()`), 'Ability card opens the placement Full Test');
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('.learning-map img')).every(img => img.complete && img.naturalWidth > 0)`), 'All roadmap images load');
    const aim = width > 600 ? 'C1' : 'B1';
    await evaluate(`document.querySelector('.learning-goal-card').scrollIntoView({block:'center'})`);
    await delay(200);
    const goalPoint = await evaluate(`(() => { const rect = document.querySelector('.learning-goal-card').getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`);
    await send('Input.dispatchMouseEvent', {type:'mousePressed', ...goalPoint, button:'left', clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased', ...goalPoint, button:'left', clickCount:1});
    await delay(100);
    assert.ok(await evaluate(`(() => { const dialog = document.querySelector('[role=dialog]'); if (!dialog || dialog.parentElement !== document.body) return false; const button = dialog.querySelector('button'); const rect = button.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight && button.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)); })()`), 'Goal dialog is visible and clickable above the page');
    await evaluate(`Array.from(document.querySelectorAll('[role=dialog] button')).find(button => button.textContent === '${aim}').click()`);
    await evaluate(`(() => { const date = new Date(); date.setDate(date.getDate() + 14); const value = [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-'); const field = document.querySelector('[role=dialog] input[type=date]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,value); field.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await delay(100);
    await evaluate(`Array.from(document.querySelectorAll('[role=dialog] button')).find(button => button.textContent === 'Lưu mục tiêu').click()`);
    await delay(150);
    assert.ok(await evaluate(`document.querySelector('.learning-roadmap-goal').textContent.includes('Aim ${aim}')`));
    assert.ok(await evaluate(`document.querySelector('.learning-roadmap-goal').textContent.includes('Còn 14 ngày')`));
    assert.ok(await evaluate(`document.querySelector('.learning-map-aim-title').textContent.includes('${aim}')`));
    assert.ok(await evaluate(`['.learning-map-sign-aim','.learning-map-book-aim'].every(selector => document.querySelector(selector).textContent === '${aim}')`), 'Sign and book use the selected aim');
    await send('Page.reload', { ignoreCache: true });
    for (let i = 0; i < 80; i++) { if (await evaluate(`document.querySelector('.learning-roadmap-goal')?.textContent.includes('Aim ${aim}') && !!document.querySelector('.learning-map-character-position')`)) break; await delay(100); }
    assert.ok(await evaluate(`document.querySelector('.learning-roadmap-goal').textContent.includes('Aim ${aim}')`), 'Goal persists after reload');
    const before = await evaluate(`document.querySelector('.learning-map-character-position').style.left`);
    doneReading = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    for (let i = 0; i < 80; i++) { if (await evaluate(`document.querySelector('.learning-roadmap-status')?.textContent.includes('Chặng 5: Listening')`)) break; await delay(100); }
    assert.ok(await evaluate(`document.querySelector('.learning-roadmap-status').textContent.includes('Chặng 5: Listening')`));
    assert.notEqual(await evaluate(`document.querySelector('.learning-map-character-position').style.left`), before);
    await evaluate(`document.querySelector('.learning-roadmap').scrollIntoView({block:'start'})`);
    await delay(1100);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, `roadmap-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    reports.push({ width, fullScores: [44, 38, 40, 42, 46], total: 164, movedFrom: 'Reading', movedTo: 'Listening', overflow: false });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(reports, null, 2));
  console.log('Passed: complete map and stage links at 320/393/430px; radar, goals and stage movement at mobile and 1366px (isolated fixtures).');
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { ws?.close(); chrome.kill(); preview.kill(); });
