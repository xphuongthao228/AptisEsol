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
  const samples = [row, ...['Opening', 'Feeling'].map((tag, i) => ({ ...row, id: 'helping', part: 'Speaking Part 4', topic: 'Helping others', question: 'Tell me about a time when you helped someone?\nHow did you feel?\nWhy should people help each other?', text: i === 0 ? 'I helped my friend study.' : 'I felt proud afterwards.', textVi: 'Explain your experience', tag, level: '' })), { ...row, id: 'bank-only', part: 'Speaking Part 4', question: 'Describe a bank-only experience.', text: 'This answer comes directly from the bank.' }];
  const answers = [{ ...row, id: 'travel', part: 'Speaking Part 4', topic: 'Travel', question: 'Describe a memorable journey.', text: 'Last year I travelled with my family.', level: 'B2' }];
  const tests = [1, 2, 3, 4].map(part => ({ id: part, title: `Speaking Part ${part} imported`, description: '', skillName: 'Speaking', mode: 'PRACTICE', status: 'PUBLISHED', questionCount: 1 }));
  tests.push({ ...tests[0], id: 90, status: 'DRAFT' }, { ...tests[0], id: 91, mode: 'EXAM' }, { ...tests[0], id: 92, title: 'Bộ đề random 1' });
  const imported = {
    1: [{ id: 101, sortOrder: 1, topic: 'Free time', content: JSON.stringify({ template: 'SPEAKING_PART1', questions: [{ question: row.question, answer1: 'Imported reading answer.', answer2: 'Imported alternative.' }, { question: 'Tell me about your hometown.', answer1: 'My hometown is small.' }] }) }],
    2: [{ id: 102, sortOrder: 1, topic: 'Imported picture', content: JSON.stringify({ template: 'SPEAKING_PART2', questions: [{ urlpic1: '/images/speaking/part2/2.png', question1: 'Describe the imported picture.', question1_answer: 'People are outside.', question2: 'Do you like outdoor activities?', question2_answer: 'I enjoy outdoor activities.', question3: 'Why are outdoor activities useful?' }] }) }],
    3: [{ id: 103, sortOrder: 1, topic: 'Imported comparison', content: JSON.stringify({ template: 'SPEAKING_PART3', questions: [{ image1: '/images/speaking/part3/2_1.png', image2: '/images/speaking/part3/2_2.png', question1: 'Compare the imported pictures.', question2: 'Which activity do you prefer?', question3: 'Why do people enjoy these activities?' }] }) }],
    4: [{ id: 104, sortOrder: 1, topic: 'Imported experience', content: JSON.stringify({ template: 'SPEAKING_PART4', questions: [{ question: 'Tell me about a time when you helped someone.', answer1: 'I helped a friend.<br><br>It was rewarding.' }] }) }]
  };
  let empty = false;
  let bankOnly = false;
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
      else if (url.pathname.endsWith('/tests')) data = empty || bankOnly ? [] : tests;
      else if (url.pathname.endsWith('/questions')) data = imported[url.searchParams.get('testId')] || [];
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
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error('Missing: ' + expression + ': ' + await evaluate('document.body.innerText')); };
  const click = text => evaluate(`[...document.querySelectorAll('button')].findLast(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/app/speaking-bank' });
  await waitFor("document.querySelector('.speaking-studio') && document.querySelector('.ss-topic').textContent === 'Free time'");
  assert.ok(await evaluate("document.querySelector('.ss-question-title').textContent.includes('What do you do')"));
  await evaluate(`{ const field = document.querySelector('.ss-step-input textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'play tennis every weekend'); field.dispatchEvent(new Event('input', {bubbles:true})); }`);
  await waitFor("document.querySelector('.ss-result > p').textContent.includes('play tennis every weekend')");
  await evaluate("document.querySelectorAll('.ss-result-actions button')[2].click()");
  await evaluate("document.querySelector('.ss-saved-toggle').click()");
  await waitFor("document.querySelector('.ss-saved').textContent.includes('play tennis every weekend')");
  for (let part = 0; part < 4; part++) {
    await evaluate(`document.querySelectorAll('.ss-parts button')[${part}].click()`);
    await delay(100);
    if (part === 1) {
      assert.equal(await evaluate("document.querySelector('.ss-columns') === null"), true, 'Part 2 waits for bank imports rather than showing practice-test questions');
      continue;
    }
    assert.equal(await evaluate("document.querySelectorAll('.ss-step').length"), part === 0 ? 1 : part === 3 ? 2 : 6);
    assert.ok(await evaluate(`document.querySelector('#ss-question-panel').textContent.includes(${JSON.stringify(['What do you do', 'Describe the imported picture', 'Compare the imported pictures', 'helped someone'][part])})`));
    if (part === 1 || part === 2) {
      assert.equal(await evaluate("document.querySelectorAll('.ss-subquestions button').length"), 3);
      assert.ok(await evaluate("document.querySelector('.ss-question-nav b').textContent.includes('1/1')"), 'Count groups rather than subquestions');
      const firstImages = await evaluate("[...document.querySelectorAll('.ss-pictures img')].map(i => i.getAttribute('src')).join('|')");
      await evaluate("document.querySelectorAll('.ss-subquestions button')[1].click()");
      assert.ok(await evaluate(`document.querySelector('.ss-question-title').textContent.includes(${JSON.stringify(part === 1 ? 'Do you like outdoor' : 'Which activity')})`));
      assert.equal(await evaluate("document.querySelectorAll('.ss-step').length"), 4, 'Follow-up questions use an opinion form');
      assert.equal(await evaluate("[...document.querySelectorAll('.ss-pictures img')].map(i => i.getAttribute('src')).join('|')"), firstImages);
      await evaluate(`{ const field = document.querySelector('.ss-step-input textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'my second answer'); field.dispatchEvent(new Event('input', {bubbles:true})); }`);
      await evaluate("document.querySelectorAll('.ss-subquestions button')[2].click()");
      assert.ok(await evaluate(`document.querySelector('.ss-question-title').textContent.includes(${JSON.stringify(part === 1 ? 'Why are outdoor' : 'Why do people')})`));
      await evaluate("document.querySelectorAll('.ss-subquestions button')[1].click()");
      assert.equal(await evaluate("document.querySelector('.ss-step-input textarea').value"), 'my second answer', 'Retain draft per subquestion');
    }
    assert.equal(await evaluate("document.querySelectorAll('.ss-pictures img').length"), part === 1 ? 1 : part === 2 ? 2 : 0);
    if (part === 2) {
      await waitFor("[...document.querySelectorAll('.ss-pictures img')].every(img => img.complete && img.naturalWidth > 0)");
      assert.equal(await evaluate("{ const pictures = [...document.querySelectorAll('.ss-pictures figure')].map(el => el.getBoundingClientRect()); Math.abs(pictures[0].top - pictures[1].top) < 2 && pictures[1].left > pictures[0].left; }"), true, 'Part 3 shows both loaded pictures side by side');
    }
  }
  assert.equal(await evaluate("document.querySelectorAll('.ss-part4-questions li').length"), 3, 'Show all three imported questions');
  assert.equal(await evaluate("document.querySelector('.ss-step-input textarea').value"), 'I helped my friend study.', 'Load bank form despite question punctuation differences');
  assert.equal(await evaluate("[...document.querySelectorAll('.ss-instruction')].some(el => el.textContent.includes('forms_json'))"), false, 'No missing-form warning for imported bank');
  fs.writeFileSync(path.join(output, 'studio-desktop.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(200);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Mobile must not overflow horizontally');
  fs.writeFileSync(path.join(output, 'studio-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  await evaluate("document.querySelector('.ss-menu-toggle').click()");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.ss-sidebar')).display !== 'none'"), true);
  await evaluate("document.querySelectorAll('.ss-subnav button')[1].click()");
  await waitFor("document.querySelector('.ss-parts button:nth-child(2)').classList.contains('active')");
  assert.equal(await evaluate("document.querySelector('.ss-sidebar').classList.contains('is-open')"), false);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await evaluate("document.querySelectorAll('.ss-parts button')[0].click()");
  await evaluate("document.documentElement.classList.add('dark'); document.documentElement.dataset.studentSkin = 'halloween'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.ss-step-input textarea')).backgroundColor"), 'rgb(255, 255, 255)');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.ss-step-input textarea')).color"), 'rgb(37, 25, 59)');
  bankOnly = true;
  await send('Page.reload');
  await waitFor("document.querySelector('.ss-topic')?.textContent === 'Free time'");
  assert.equal(await evaluate("document.querySelector('.ss-step-input textarea').value"), row.text, 'Bank questions work without practice tests');
  empty = true;
  await send('Page.reload');
  await waitFor("document.querySelector('.ss-notice')?.textContent.includes('chưa có câu Speaking đã import')");
  assert.deepEqual(errors, []);
  console.log('Speaking studio passed: imported questions, editable answer assembly, saved answers, all four parts and mobile layout.');
  await send('Browser.close'); ws.close(); preview.kill();
})().catch(error => { console.error(error); process.exitCode = 1; ws?.close(); chrome.kill(); preview.kill(); });





