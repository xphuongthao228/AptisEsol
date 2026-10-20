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
  const env=Object.fromEntries(fs.readFileSync(path.resolve(__dirname,'../../backend/.env'),'utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
  const auth=await (await fetch('http://localhost:8080/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:env.SEED_ADMIN_EMAIL,password:env.SEED_ADMIN_PASSWORD})})).json();
  const user=auth.data.user;
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = waiting.get(message.id); waiting.delete(message.id); if (message.error) item?.reject(message.error); else item?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const {requestId,request}=message.params;
      const url=new URL(request.url);
      if(request.method==='OPTIONS'){send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:[{name:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5182'},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Authorization,Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PUT,OPTIONS'}]});return;}
      // The admin session reads real banks; provide a preview subscription for the student route.
      if(url.pathname.endsWith('/subscription/me')) { send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5182'},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Authorization,Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PUT,OPTIONS'}],body:Buffer.from(JSON.stringify({success:true,data:{active:true,proActive:true,daysLeft:30}})).toString('base64')});return; }
      fetch('http://localhost:8080'+url.pathname+url.search,{method:request.method,headers:{Authorization:'Bearer '+(auth.data.accessToken||auth.data.token),'Content-Type':'application/json'},...(request.postData?{body:request.postData}:{})}).then(async response=>send('Fetch.fulfillRequest',{requestId,responseCode:response.status,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5182'},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Authorization,Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PUT,OPTIONS'}],body:Buffer.from(await response.text()).toString('base64')})).catch(e=>console.error(e.message));
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
  const token = auth.data.accessToken || auth.data.token;
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
  await waitFor("document.querySelector('.speaking-studio') && !document.querySelector('.ss-notice[role=status]')");
  await evaluate("document.querySelectorAll('.ss-parts button')[3].click()");
  await waitFor("document.querySelectorAll('.ss-step').length === 12");
  assert.equal(await evaluate("document.querySelectorAll('.ss-part4-questions li').length"),3);
  assert.equal(await evaluate("document.querySelector('.ss-step-input textarea').value"),'I would like to talk about a memorable experience.');
  assert.equal(await evaluate("[...document.querySelectorAll('.ss-instruction')].some(el=>el.textContent.includes('forms_json'))"),false);
  await evaluate("document.querySelectorAll('.ss-question-nav button')[1].click()");
  await waitFor("document.querySelector('.ss-instruction') && document.querySelector('.ss-step-label b').textContent.includes('B1')");
  const b1=await evaluate("document.querySelector('.ss-result > p').textContent");
  await evaluate("document.querySelectorAll('.ss-levels button')[1].click()");
  await waitFor("document.querySelector('.ss-step-label b').textContent.includes('B2')");
  const b2=await evaluate("document.querySelector('.ss-result > p').textContent");
  await evaluate("document.querySelectorAll('.ss-levels button')[2].click()");
  await waitFor("document.querySelector('.ss-step-label b').textContent.includes('C1')");
  const c1=await evaluate("document.querySelector('.ss-result > p').textContent");
  assert.notEqual(b1,b2);assert.notEqual(b2,c1);
  await evaluate("document.querySelectorAll('.ss-parts button')[1].click()");
  await waitFor("document.querySelectorAll('.ss-subquestions button').length === 3");
  await waitFor("document.querySelector('.ss-pictures img')?.naturalWidth > 0");
  assert.equal(await evaluate("document.querySelector('.ss-pictures img').getAttribute('src')"),'/images/speaking/part2/1.png');
  assert.equal(await evaluate("document.querySelectorAll('.ss-step').length"),6);
  assert.ok(await evaluate("document.querySelector('.ss-step-input textarea').value.includes('friends')"));
  assert.equal(await evaluate("document.querySelector('.ss-steps').textContent.includes('family in a car')"),false);
  await evaluate("document.querySelectorAll('.ss-subquestions button')[1].click()");
  await waitFor("document.querySelectorAll('.ss-step').length === 4");
  assert.ok(await evaluate("document.querySelector('.ss-step-input textarea').value.includes('eating out')"));
  await evaluate("document.querySelectorAll('.ss-subquestions button')[2].click()");
  assert.ok(await evaluate("document.querySelector('.ss-step-input textarea').value.includes('last night')"));
  assert.equal(await evaluate("document.querySelector('.ss-pictures img').getAttribute('src')"),'/images/speaking/part2/1.png');
  await evaluate("document.querySelectorAll('.ss-question-nav button')[1].click()");
  await waitFor("document.querySelectorAll('.ss-step').length === 6");
  assert.ok(await evaluate("document.querySelector('.ss-step-input textarea').value.includes('family in a car')"));
  await waitFor("document.querySelector('.ss-pictures img')?.naturalWidth > 0");
  assert.equal(await evaluate("document.querySelector('.ss-pictures img').getAttribute('src')"),'/images/speaking/part2/2.png');
  console.log('PASS: real Part 2 imports grouped into Q1-Q3, 6/4/4 steps, no cross-picture mixing');
  await evaluate("document.querySelectorAll('.ss-parts button')[2].click()");
  await waitFor("document.querySelectorAll('.ss-subquestions button').length === 3 && document.querySelectorAll('.ss-pictures img').length === 2");
  await waitFor("[...document.querySelectorAll('.ss-pictures img')].every(img=>img.naturalWidth > 0)");
  assert.equal(await evaluate("document.querySelectorAll('.ss-step').length"),6,'Part 3 Q1 contains only the current pair of pictures');
  const firstPair=await evaluate("[...document.querySelectorAll('.ss-pictures img')].map(img=>img.getAttribute('src')).join('|')");
  const firstAnswer=await evaluate("document.querySelector('.ss-step-input textarea').value");
  await evaluate("document.querySelectorAll('.ss-subquestions button')[1].click()");
  await waitFor("document.querySelectorAll('.ss-step').length === 4");
  assert.equal(await evaluate("[...document.querySelectorAll('.ss-pictures img')].map(img=>img.getAttribute('src')).join('|')"),firstPair);
  await evaluate("document.querySelectorAll('.ss-question-nav button')[1].click()");
  await waitFor("document.querySelectorAll('.ss-step').length === 6");
  assert.notEqual(await evaluate("document.querySelector('.ss-step-input textarea').value"),firstAnswer);
  assert.equal(await evaluate("[...document.querySelector('.ss-builder').childNodes].some(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim()==='0')"),false);
  console.log('PASS: real Part 3 grouped questions, isolated forms, loaded image pairs and no stray zero');
  fs.writeFileSync(path.join(output,'studio-live-part4.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  console.log('PASS: actual localhost backend, Part 4, 12 imported form steps, Q1-Q3, no missing-form warning');
  await send('Browser.close');ws.close();preview.kill();
})().catch(error=>{console.error(error);process.exitCode=1;ws?.close();chrome.kill();preview.kill();});
