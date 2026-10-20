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
  const user = { id: 90102, email: 'speaking@example.invalid', fullName: 'Speaking Preview', roles: ['ADMIN'], enabled: true, proExpiresAt: '2030-01-01T00:00:00', accessExpiresAt: '2030-01-01T00:00:00' };
  const row = { id: 'free-time', part: 'Speaking Part 1', topic: 'Free time', form: 'Personal questions', question: 'What do you do in your free time?', vi: 'Bạn làm gì trong thời gian rảnh?', targetWords: '30 giây', section: 'opening', text: 'I enjoy reading books in my free time.', textVi: 'Tôi thích đọc sách trong thời gian rảnh.', level: 'B1', tag: 'Giới thiệu' };
  const samples = [row];
  const answers = [{ ...row, id: 'travel', part: 'Speaking Part 4', topic: 'Travel', question: 'Describe a memorable journey.', text: 'Last year I travelled with my family.', level: 'B2' }];
  const tests = [1, 2, 3, 4].map(part => ({ id: part, title: `Speaking Part ${part} imported`, description: '', skillName: 'Speaking', mode: 'PRACTICE', status: 'PUBLISHED', questionCount: 1 }));
  tests.push({ ...tests[0], id: 90, status: 'DRAFT' }, { ...tests[0], id: 91, mode: 'EXAM' }, { ...tests[0], id: 92, title: 'Bộ đề random 1' });
  const imported = {
    1: [{ id: 101, sortOrder: 1, topic: 'Free time', content: JSON.stringify({ template: 'SPEAKING_PART1', questions: [{ question: row.question, answer1: 'Imported reading answer.', answer2: 'Imported alternative.' }, { question: 'Tell me about your hometown.', answer1: 'My hometown is small.' }] }) }],
    2: [{ id: 102, sortOrder: 1, topic: 'Imported picture', content: JSON.stringify({ template: 'SPEAKING_PART2', questions: [{ urlpic1: '/images/speaking/part2/2.png', question1: 'Describe the imported picture.', question1_answer: 'People are outside.', question2: 'Do you like outdoor activities?', question2_answer: 'I enjoy outdoor activities.', question3: 'Why are outdoor activities useful?' }] }) }],
    3: [{ id: 103, sortOrder: 1, topic: 'Imported comparison', content: JSON.stringify({ template: 'SPEAKING_PART3', questions: [{ image1: '/images/speaking/part3/2_1.png', image2: '/images/speaking/part3/2_2.png', question1: 'Compare the imported pictures.', question2: 'Which activity do you prefer?', question3: 'Why do people enjoy these activities?' }] }) }],
    4: [{ id: 104, sortOrder: 1, topic: 'Imported experience', content: JSON.stringify({ template: 'SPEAKING_PART4', questions: [{ question: 'Tell me about a time when you helped someone.', answer1: 'I helped a friend.<br><br>It was rewarding.' }] }) }]
  };
  let createdQuestion = null; let deletedQuestion = false; let importCount = 0;
  let empty = false;
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = waiting.get(message.id); waiting.delete(message.id); if (message.error) item?.reject(message.error); else item?.resolve(message.result); }
    if (message.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      let data = [];
      if (url.pathname.endsWith('/subscription/me')) data = { active: true, proActive: true, daysLeft: 30 };
      else if (url.pathname.endsWith('/auth/me')) data = user;
      else if (url.pathname.endsWith('/auth/heartbeat')) data = { user, visitorId: 'preview', onlineCount: 1 };
      else if (url.pathname.endsWith('/ui-settings')) data = { studentSkin: 'default', studentTheme: 'light' };
      else if (url.pathname.endsWith('/tests')) data = empty ? [] : tests;
      else if (/\/questions\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const q = Object.values(imported).flat().find(q => q.id === id);
        if (request.method === 'PUT') { Object.assign(q, JSON.parse(request.postData)); data = q; }
        else if (request.method === 'DELETE') { for (const key of Object.keys(imported)) imported[key] = imported[key].filter(q => q.id !== id); deletedQuestion = true; data = null; }
        else data = { ...q, testId: id - 100, type: 'SPEAKING', answers: [], points: 1 };
      }
      else if (url.pathname.endsWith('/questions/import-csv')) { if (request.method === 'POST') importCount++; data = { questions: [], tests: [] }; }
      else if (url.pathname.endsWith('/questions')) {
        if (request.method === 'POST') { createdQuestion = { ...JSON.parse(request.postData), id: 999 }; imported[createdQuestion.testId].push(createdQuestion); data = createdQuestion; }
        else data = imported[url.searchParams.get('testId')] || [];
      }
      else if (url.pathname.endsWith('/speaking-bank/samples')) data = empty ? [] : samples;
      else if (url.pathname.endsWith('/speaking-bank/answers')) data = empty ? [] : answers;
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5182' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') }).catch(() => {});
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
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error('Missing: ' + expression + ': ' + await evaluate('document.body.innerText')); };
  const click = text => evaluate(`[...document.querySelectorAll('button')].findLast(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/admin/speaking-bank' });
  await waitFor("document.body.innerText.includes('Describe the imported picture.')");
  await evaluate("[...document.querySelectorAll('article')].find(e => e.textContent.includes('Describe the imported picture.')).querySelector('button').click()");
  await waitFor("document.querySelector('[role=dialog]')");
  assert.equal(await evaluate("document.querySelectorAll('[role=dialog] textarea').length"), 6);
  await evaluate(`{ const field = document.querySelectorAll('[role=dialog] textarea')[2]; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'Updated imported Q2?'); field.dispatchEvent(new Event('input', {bubbles:true})); }`);
  await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()");
  await waitFor("!document.querySelector('[role=dialog]') && document.body.innerText.includes('Updated imported Q2?')");
  assert.equal(JSON.parse(imported[2][0].content).questions[0].question2, 'Updated imported Q2?');
  assert.equal(JSON.parse(imported[2][0].content).questions[0].question1, 'Describe the imported picture.');
  assert.equal(JSON.parse(imported[2][0].content).questions[0].urlpic1, '/images/speaking/part2/2.png');
  await click('Thêm đề');
  await waitFor("document.querySelector('[role=dialog]')");
  await evaluate(`{ const field = document.querySelector('[role=dialog] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'New admin speaking question?'); field.dispatchEvent(new Event('input', {bubbles:true})); }`);
  await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()");
  await waitFor("document.body.innerText.includes('New admin speaking question?') && !document.querySelector('[role=dialog]')");
  assert.ok(createdQuestion);
  await evaluate("window.confirm = () => true");
  await waitFor("[...document.querySelectorAll('article')].find(e => e.textContent.includes('New admin speaking question?')).querySelectorAll('button')[1].disabled === false");
  await evaluate("[...document.querySelectorAll('article')].find(e => e.textContent.includes('New admin speaking question?')).querySelectorAll('button')[1].click()");

  await waitFor("!document.body.innerText.includes('New admin speaking question?')");
  assert.equal(deletedQuestion, true);
  await click('Import CSV');
  await evaluate(`{ const input = document.querySelector('input[type=file]'); const transfer = new DataTransfer(); transfer.items.add(new File(['part,question1,question2,question3\\n3,Compare pictures?,Only two questions,'], 'invalid.csv', {type:'text/csv'})); input.files = transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); }`);
  await waitFor("document.querySelector('[role=alert]')?.textContent.includes('Dòng 2')");
  assert.equal(importCount, 0);
  await evaluate(`{ const input = document.querySelector('input[type=file]'); const transfer = new DataTransfer(); transfer.items.add(new File(['\uFEFFpart,topic,question1,question2,question3,urlpic1,urlpic2\\n3,Imported comparison,Compare these pictures?,Which do you prefer?,Why?,/images/speaking/part3/de01_1.png,/images/speaking/part3/de01_2.png'], 'valid.csv', {type:'text/csv'})); input.files = transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); }`);
  await waitFor("document.body.innerText.includes('1 dòng hợp lệ')");
  await evaluate(`{ const select = document.querySelector('select[aria-label="Bài luyện nhận CSV"]'); select.value = '3'; select.dispatchEvent(new Event('change', {bubbles:true})); }`);
  await click('Import vào bài luyện');
  await waitFor("!document.body.innerText.includes('1 dòng hợp lệ')");
  assert.equal(importCount, 1);
  assert.deepEqual(errors, []);
  console.log('Admin Speaking passed: list imported questions, edit Q2 without changing Q1/image, create and delete a question.');
  await send('Browser.close'); ws.close(); preview.kill();
})().catch(error => { console.error(error); process.exitCode = 1; ws?.close(); chrome.kill(); preview.kill(); });












