const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../reports/mock-light');
fs.mkdirSync(output, { recursive: true });
const preview = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9256', '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-mock-light-')), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
(async () => {
  let targets;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:5196')).ok) targets = await (await fetch('http://127.0.0.1:9256/json')).json(); if (targets) break; } catch {} await delay(200); }
  assert.ok(targets);
  ws = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p?.reject(msg.error) : p?.resolve(msg.result); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = msg.params; const url = new URL(request.url); let data = [];
    if (url.pathname.endsWith('/mock-tests')) data = Array.from({length:6}, (_,i) => ({ id:i+1, externalId:'preview-'+i, skill:'FULL', title:`Aptis Full Test ${String(i+1).padStart(2,'0')} - Quan trọng`, questions:'5 kỹ năng', minutes:'162', status:'PUBLISHED', priority:'IMPORTANT', accessible:true }));
    else if (url.pathname.endsWith('/auth/me')) data = { id:99006, email:'preview@example.invalid', fullName:'B', roles:['USER'], enabled:true, studentSkin:'default', studentTheme:'light' };
    else if (url.pathname.includes('/subscription')) data = { proActive:true, active:true, daysRemaining:17 };
    else if (url.pathname.endsWith('/progress/roadmap')) data = {skills:[]};
    send('Fetch.fulfillRequest', { requestId, responseCode:200, responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5196'},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Authorization,Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'}], body:Buffer.from(JSON.stringify({success:true,data})).toString('base64') }).catch(error=>errors.push(String(error)));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', {patterns:[{urlPattern:'*://*/api/*'}]});
  const user = {id:99006,email:'preview@example.invalid',fullName:'B',roles:['USER'],enabled:true,studentSkin:'default',studentTheme:'light'};
  const token = 'preview.'+Buffer.from(JSON.stringify({exp:2000000000})).toString('base64url')+'.preview';
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('aptis-esol-auth',${JSON.stringify(JSON.stringify({state:{user,accessToken:token,refreshToken:null},version:0}))});`});
  const evaluate = async expression => (await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
  for (const width of [1366,390]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    await send('Page.navigate',{url:'http://127.0.0.1:5196/app/mock-tests'});
    for(let i=0;i<100;i++){if(await evaluate("document.querySelectorAll('.mock-selection-card').length === 6"))break;await delay(100);}
    assert.equal(await evaluate("document.querySelectorAll('.mock-selection-card').length"),6);
    assert.ok(await evaluate("!!document.querySelector('.student-light')"),'Light theme is active');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'),'No horizontal overflow');
    await delay(400);
    fs.writeFileSync(path.join(output,`mock-light-${width}.png`),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    console.log(width,await evaluate("getComputedStyle(document.querySelector('.mock-selection-card > button')).backgroundImage"));
  }
  assert.deepEqual(errors,[]);
  await send('Browser.close');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{ws?.close();chrome.kill();preview.kill();});
