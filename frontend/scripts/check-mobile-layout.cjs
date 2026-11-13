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
const bannerOnly = process.argv.includes('--banner-only');
const notificationsOnly = process.argv.includes('--notifications-only');
const assetErrorOnly = process.argv.includes('--asset-error-only');
const footerOnly = process.argv.includes('--footer-only');
const partsOnly = process.argv.includes('--parts-only');
const mockDark = process.argv.includes('--mock-dark');
const mockOnly = process.argv.includes('--mock-only') || mockDark;
const pricingOnly = process.argv.includes('--pricing-only');
const tipsOnly = process.argv.includes('--tips-only');
const communityOnly = process.argv.includes('--community-only');
const liveGuest = process.argv.includes('--live-guest');
const guestOnly = process.argv.includes('--guest-only') || liveGuest;
const bannerImage = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="#fff1c9"/><rect x="8" y="8" width="1584" height="584" fill="none" stroke="red" stroke-width="16"/><text x="800" y="320" text-anchor="middle" font-size="100">APTIS LINGO MOBILE BANNER</text></svg>').toString('base64');
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
      if (liveGuest) { send('Fetch.continueRequest', { requestId }).catch(() => {}); return; }
      const url = new URL(request.url); let data = [];
      if (assetErrorOnly && /\/assets\/PracticeRunner-.*\.js$/.test(url.pathname)) {
        send('Fetch.failRequest', { requestId, errorReason: 'Failed' }).catch(() => {});
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        send('Fetch.continueRequest', { requestId }).catch(() => {});
        return;
      }
      if ((bannerOnly || guestOnly) && url.pathname.endsWith('/media/banners')) data = [{ id: 1, originalName: 'Mobile banner', sourceUrl: bannerImage, bannerTargetUrl: '/app/referral' }];
      else if (notificationsOnly && url.pathname.endsWith('/notifications/public')) data = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, title: `Notification ${i + 1}`, message: ('Mobile notification details.\n').repeat(80), audience: 'ALL', level: 'INFO', active: true, pinned: false, createdAt: '2026-11-13T08:00:00', updatedAt: '2026-11-13T08:00:00' }));
      else if (url.pathname.endsWith('/progress/roadmap')) data = { skills: [], guideReviewed: false, predictionsReviewed: false };
      else if (url.pathname.includes('/subscription/me')) data = { active: pro, proActive: pro, expiresAt: pro ? '2030-01-01T00:00:00' : null, daysLeft: pro ? 30 : 0 };
      else if (url.pathname.endsWith('/auth/heartbeat')) data = { user, visitorId: 'preview', onlineCount: 1 };
      else if (url.pathname.endsWith('/auth/me')) data = user;
      else if (url.pathname.endsWith('/mock-tests')) data = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, externalId: `full-${i + 1}`, skill: 'FULL', title: `Aptis Full Test ${String(i + 1).padStart(2, '0')}`, description: 'Full Aptis test: Speaking + Listening + Grammar + Reading + Writing. Tổng thời gian 162 phút.', questions: '5 kỹ năng', minutes: '162 phút', status: 'PUBLISHED', accessible: pro || i < 2, accessOrder: i + 1, questionData: i < 2 || pro ? '[{"skill":"SPEAKING","part":1},{"skill":"READING","part":1}]' : null }));
      else if (url.pathname.endsWith('/tests')) data = ['LISTENING', 'SPEAKING', 'READING'].flatMap((skill, i) => [1,2,3,4].map(part => ({ id: i * 4 + part, skillId: i + 1, skillName: skill, title: `${skill} Part ${part}`, description: 'Luyện tập theo part', durationMinutes: 15, status: 'PUBLISHED', mode: 'PRACTICE', questionCount: 5 })));
      else if (url.pathname.endsWith('/lessons')) data = [{ id: 1, skill: 'READING', title: 'Nhận diện từ khóa trong bài đọc', summary: 'Luyện kỹ năng đọc hiểu theo từng bước.', content: 'Đọc câu hỏi trước khi tìm thông tin.', status: 'PUBLISHED', resourceType: 'DOCUMENT', resourceUrl: null, partLabel: 'Reading · Part 1' }, { id: 2, skill: 'READING', title: 'Sắp xếp câu thành đoạn văn', summary: 'Nhận biết liên kết giữa các câu.', content: 'Tìm câu mở đầu và từ nối.', status: 'PUBLISHED', resourceType: 'DOCUMENT', resourceUrl: null, partLabel: 'Reading · Part 2' }];
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5178' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data, message: 'preview fixture' })).toString('base64') }).catch(() => {});
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }, ...(assetErrorOnly ? [{ urlPattern: '*://*/assets/PracticeRunner-*.js' }] : [])] });
  const token = 'preview.' + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url') + '.preview';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-esol-auth', ${JSON.stringify(JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 }))}); sessionStorage.setItem('aptis-community-invite-dismissed', '1'); localStorage.setItem('aptis-theme', 'light');` });
  if (mockDark) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aptis-theme','dark');` });
  if (communityOnly) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.removeItem('aptis-esol-auth'); sessionStorage.removeItem('aptis-community-invite-dismissed');` });
  if (guestOnly) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.removeItem('aptis-esol-auth');` });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  if (guestOnly) {
    for (const width of [280,300,320,360,375,393,430,1366]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 640 });
      await send('Page.navigate', { url: liveGuest ? 'http://localhost:5173/' : 'http://127.0.0.1:5178/' });
      for (let i = 0; i < 80; i++) { if (await evaluate(`!!document.querySelector('.dashboard-page .dashboard-banner-slide img')`)) break; await delay(100); }
      await delay(1100);
      const metrics = await evaluate(`(() => {
        const rect = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r && { left:r.left, right:r.right, width:r.width }; };
        return { viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth, page:rect('.dashboard-page'), banner:rect('.dashboard-banner-slide img'), stats:rect('.dashboard-stats-banner'), menu:rect('button[aria-label="Mở menu"]'), heading:rect('.dashboard-feature-section h2') };
      })()`);
      console.log(width, JSON.stringify(metrics));
      assert.ok(metrics.viewport <= width + 1 && metrics.scrollWidth <= width + 1, 'Layout viewport must not be wider than the phone');
      assert.ok(metrics.page && metrics.page.left >= 0 && metrics.page.right <= width + 1, 'Guest content fits');
      assert.ok(metrics.menu && metrics.menu.left >= 0 && metrics.menu.right <= width + 1, 'Guest menu fits');
      assert.ok(metrics.banner && metrics.banner.right <= width + 1, 'Guest banner fits');
      assert.ok(metrics.stats && metrics.stats.right <= width + 1, 'Stats fit');
      if (width < 640) {
        assert.ok(Math.abs(metrics.page.left - (width - metrics.page.right)) < 1, 'Guest page has equal side gutters');
        await evaluate(`document.documentElement.style.fontSize='20px'`);
        await delay(100);
        assert.ok(await evaluate(`(() => {
          const selectors=['.dashboard-page','.dashboard-stats-banner','.dashboard-feature-section h2','button[aria-label="Mở menu"]'];
          return selectors.every(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;});
        })()`), 'Larger text does not push guest content or menu off screen');
        await evaluate(`document.documentElement.style.fontSize=''`);
      }
      if (width === 375 || width === 393) fs.writeFileSync(path.join(output, `guest-${width}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    }
    console.log('Guest homepage fits mobile and desktop viewports.');
    await send('Browser.close'); ws.close(); preview.kill(); return;
  }
  if (communityOnly) {
    for (const [width, height] of [[320,480],[393,852],[430,844],[1366,900]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 640 });
      await send('Page.navigate', { url: 'http://127.0.0.1:5178/' });
      for (let i = 0; i < 80; i++) {
        if (await evaluate(`!!document.querySelector('.community-invite-card')`)) break;
        await delay(100);
      }
      const bounds = await evaluate(`(() => {
        const card = document.querySelector('.community-invite-card');
        const r = card?.getBoundingClientRect();
        return r && { left:r.left, right:r.right, top:r.top, bottom:r.bottom, center:r.left+r.width/2, scrollable:card.scrollHeight>card.clientHeight, portal:document.querySelector('.community-invite-overlay').parentElement===document.body };
      })()`);
      assert.ok(bounds, 'Guest invitation appears');
      assert.ok(bounds.left >= 15 && bounds.right <= width - 15, 'Popup fits horizontally');
      if (width < 640) {
        assert.ok(bounds.right - bounds.left <= 320.1, 'Mobile popup is at most 320px wide');
        assert.ok(bounds.left >= 23 && bounds.right <= width - 23, 'Mobile popup keeps generous side gutters');
      }
      assert.ok(Math.abs(bounds.center - width / 2) < 1, 'Popup is centered');
      assert.ok(bounds.top >= 15 && bounds.bottom <= height - 15, 'Popup fits vertically');
      assert.ok(bounds.portal, 'Popup is outside transformed app containers');
      if (height === 480) assert.ok(bounds.scrollable, 'Short phones can scroll the popup');
      if (width === 393) fs.writeFileSync(path.join(output, 'community-393.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      await evaluate(`(()=>{const card=document.querySelector('.community-invite-card');card.scrollTop=card.scrollHeight;[...card.querySelectorAll('button')].find(button=>button.textContent.trim()==='Để sau').click();})()`);
      await delay(100);
      assert.equal(await evaluate(`!!document.querySelector('.community-invite-card')`), false);
      assert.equal(await evaluate(`sessionStorage.getItem('aptis-community-invite-dismissed')`), '1');
    }
    console.log('Community popup passed: centered with 16px gutters, scrollable on short phones, dismissal works at 320/393/430/1366px.');
    await send('Browser.close'); ws.close(); preview.kill();
    return;
  }
  if (assetErrorOnly) {
    pro = true;
    await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: 'http://127.0.0.1:5178/app/tests/9001' });
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`document.querySelector('h1')?.textContent === 'Chưa tải được trang'`)) break;
      await delay(150);
    }
    assert.equal(await evaluate(`document.querySelector('h1')?.textContent`), 'Chưa tải được trang');
    assert.ok(await evaluate(`[...document.querySelectorAll('button')].some(button => button.textContent === 'Tải lại trang')`));
    assert.ok(await evaluate(`!document.body.textContent.includes('Unexpected Application Error')`));
    assert.ok(await evaluate(`!!JSON.parse(localStorage.getItem('aptis-esol-auth')).state.accessToken`), 'Login is preserved');
    assert.equal(await evaluate('location.pathname'), '/app/tests/9001', 'No automatic reload or redirect');
    console.log('Missing lazy asset shows a readable recovery page; login and requested route are preserved.');
    await send('Browser.close'); ws.close(); preview.kill();
    return;
  }
  const routes = tipsOnly ? [['tips-banner', '/app/lessons']] : pricingOnly ? [['pricing', '/app/renewal']] : mockOnly ? [['mock-tests', '/app/mock-tests']] : partsOnly ? [['parts', '/app/tests/parts']] : bannerOnly || notificationsOnly || footerOnly ? [['home', '/']] : [['home', '/'], ['mock-tests', '/app/mock-tests'], ['parts', '/app/tests/parts'], ['lessons', '/app/lessons'], ['listening-tips', '/app/lessons/LISTENING']];
  const reports = [];
  for (const width of (notificationsOnly ? [320, 393, 430, 1366] : bannerOnly ? [360, 393, 430, 1366] : [390, 320, 430, 1366])) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width > 600 ? 900 : 844, deviceScaleFactor: 1, mobile: width < 600 });
    for (const [name, route] of routes) {
      pro = name === 'parts' || name === 'lessons';
      await send('Page.navigate', { url: 'http://127.0.0.1:5178' + route });
      for (let i = 0; i < 60; i++) {
        if (await evaluate(`!!document.querySelector('h1') && !!document.querySelector('.mobile-bottom-nav')`)) break;
        await delay(150);
      }
      await delay(600);
      if (footerOnly) {
        // Scrolling reveals lazy sections above the footer; let their height settle.
        for (let attempt = 0; attempt < 5; attempt++) {
          await evaluate(`document.querySelector('.overview-footer').scrollIntoView({block:'center'})`);
          await delay(250);
        }
      }
      const metrics = await evaluate(`({title:document.querySelector('h1')?.textContent, width:innerWidth, scrollWidth:document.documentElement.scrollWidth, nav:!!document.querySelector('.mobile-bottom-nav') && getComputedStyle(document.querySelector('.mobile-bottom-nav')).display, active:[...document.querySelectorAll('.mobile-bottom-nav [aria-current]')].map(x=>x.textContent), buttons:[...document.querySelectorAll('.mock-selection-card > button')].map(x=>x.textContent)})`);
      if (!metrics.title) {
        console.log(await evaluate(`({url:location.href,body:document.body.innerText,html:document.documentElement.outerHTML.slice(0,1800)})`), errors);
      }
      assert.ok(metrics.title, name + ' missing heading');
      assert.ok(metrics.scrollWidth <= metrics.width, name + ' overflows at ' + width);
      if (pricingOnly && width < 640) {
        assert.equal(await evaluate(`document.querySelectorAll('.renewal-mobile-plan').length`), 5);
        assert.ok(await evaluate(`[...document.querySelectorAll('.renewal-mobile-plan')].every(button => button.getBoundingClientRect().height < 110)`), 'Compact plan rows');
        await evaluate(`document.querySelectorAll('.renewal-mobile-plan')[4].click()`);
        assert.ok(await evaluate(`document.querySelector('.renewal-mobile-plan[aria-pressed="true"]').textContent.includes('250.000đ')`));
        assert.ok(await evaluate(`document.querySelector('.renewal-mobile-benefits summary').textContent.includes('2 Tháng')`));
        await evaluate(`document.querySelector('.renewal-mobile-benefits summary').click()`);
        assert.ok(await evaluate(`document.querySelector('.renewal-mobile-benefits').open`));
        await evaluate(`document.querySelector('.renewal-mobile-benefits summary').click(); document.querySelectorAll('.renewal-mobile-plan')[3].click(); window.scrollTo({top:0,behavior:'instant'});`);
        assert.ok(await evaluate(`!!document.querySelector('#discount-code')`), 'Unified code input remains available');
      }
      if (partsOnly && width < 640) {
        const regions = `document.querySelectorAll('[id^="practice-parts-"]')`;
        assert.equal(await evaluate(`${regions}.length`), 0, 'Mobile starts with all skills collapsed');
        const tapSkill = async index => {
          await evaluate(`document.querySelectorAll('.parts-skill-selector > button')[${index}].scrollIntoView({block:'center',behavior:'instant'})`);
          await delay(150);
          const point = await evaluate(`(() => { const r = document.querySelectorAll('.parts-skill-selector > button')[${index}].getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
          await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
          await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await delay(200);
        };
        for (const [index, skill] of ['LISTENING', 'SPEAKING', 'READING', 'WRITING'].entries()) {
          await tapSkill(index);
          assert.equal(await evaluate(`${regions}.length`), 1, 'Only one skill panel is open');
          assert.equal(await evaluate(`document.querySelectorAll('.parts-skill-selector > button')[${index}].nextElementSibling?.id`), `practice-parts-${skill}`, 'Panel appears immediately below ' + skill);
          assert.ok(await evaluate(`document.querySelector('#practice-parts-${skill}').textContent.includes('${skill === 'WRITING' ? 'Writing' : 'Part 1'}')`));
        }
        await tapSkill(3);
        assert.equal(await evaluate(`${regions}.length`), 0, 'Tap active skill to collapse');
        await tapSkill(1);
        await evaluate(`document.querySelector('.parts-skill-selector > button[aria-expanded="true"]').scrollIntoView({block:'start'})`);
      }
      if (notificationsOnly) {
        const tap = async selector => {
          const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
          if (width < 640) {
            await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
            await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          } else {
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
          }
          await delay(180);
        };
        await tap('button[aria-label="Thông báo"]');
        assert.ok(await evaluate(`(() => {
          const panel = document.querySelector('#header-notifications');
          const button = panel?.querySelector('button.w-full');
          const r = button?.getBoundingClientRect();
          return r && button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + 20)) && r.x >= 0 && r.right <= innerWidth;
        })()`), 'Notification list is visible and receives taps at ' + width);
        await evaluate(`(() => { const list = document.querySelector('#header-notifications > div:last-child'); list.scrollTop = list.scrollHeight; })()`);
        await tap('#header-notifications button.w-full:last-child');
        assert.equal(await evaluate(`document.querySelector('#notification-dialog-title')?.textContent`), 'Notification 15');
        assert.ok(await evaluate(`(() => { const body = document.querySelector('[aria-labelledby="notification-dialog-title"] .overflow-y-auto'); body.scrollTop = body.scrollHeight; return body.scrollTop > 0; })()`), 'Long notification can scroll');
        await tap('button[aria-label="Đóng thông báo"]');
        assert.equal(await evaluate(`!!document.querySelector('#notification-dialog-title')`), false);
        await tap('button[aria-label="Thông báo"]');
        await tap('#header-notifications > div:first-child button');
        assert.ok(await evaluate(`document.querySelector('#header-notifications').textContent.includes('0 thông báo chưa đọc')`));
        await tap('button[aria-label="Thông báo"]');
      }
      if (bannerOnly) {
        const banner = await evaluate(`(() => {
          const img = document.querySelector('.dashboard-banner-slide img');
          const support = document.querySelector('.learning-support-button');
          const nav = document.querySelector('.mobile-bottom-nav');
          const rect = img?.getBoundingClientRect();
          return { loaded: img?.complete && img?.naturalWidth > 0, width: rect?.width, height: rect?.height, layoutHeight: img && parseFloat(getComputedStyle(img).height), fit: img && getComputedStyle(img).objectFit, supportWidth: support?.getBoundingClientRect().width, supportBottom: support?.getBoundingClientRect().bottom, zaloBottom: document.querySelector('.dashboard-zalo-contact')?.getBoundingClientRect().bottom, navTop: nav?.getBoundingClientRect().top };
        })()`);
        assert.ok(banner.loaded, 'Banner image loaded');
        if (width < 640) {
          assert.ok(Math.abs(banner.width / banner.height - 1600 / 600) < .03, 'Mobile preserves full banner proportions');
          assert.equal(banner.fit, 'contain');
          assert.equal(banner.supportWidth, 44);
          assert.ok(banner.supportBottom < banner.navTop, 'Support stays above mobile navigation');
          assert.ok(banner.zaloBottom < banner.navTop, 'Zalo stays above mobile navigation');
        } else {
          assert.ok(banner.layoutHeight >= 429.9, 'Desktop banner height is preserved: ' + JSON.stringify(banner));
          assert.equal(banner.fit, 'cover');
        }
      }
      if (!metrics.nav) console.log(name, width, await evaluate('document.body.innerText'), errors);
      assert.equal(metrics.nav, width < 600 ? 'grid' : 'none');
      if (name === 'mock-tests') {
        if (metrics.buttons.length === 0) console.log(await evaluate('document.body.innerText'), errors);
        assert.equal(metrics.buttons.filter(x => x.includes('Vào đề')).length, 2);
      }
      if (width === 390 || width === 393 || width === 1366) {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(output, `${footerOnly ? 'footer' : name}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
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
  console.log(tipsOnly ? 'Tips banner preview passed on mobile and desktop.' : pricingOnly ? 'Pricing passed at 320/390/430/1366px: compact plans, selection, benefits and code input.' : mockOnly ? 'Mock selection preview passed at 320/390/430/1366px; no overflow and free test access preserved.' : partsOnly ? 'Practice selection preview passed at mobile and desktop; no horizontal overflow.' : footerOnly ? 'Footer preview captured at mobile and desktop; no horizontal overflow.' : notificationsOnly ? 'Notifications passed at 320/393/430/1366px: tap bell, scroll list, open long details, close and mark read.' : bannerOnly ? 'Banner layout passed at 360/393/430/1366px: full image, no overflow, compact support above navigation.' : 'Mobile layout passed: 5 routes at 320/390/430/1366px; no overflow; navigation, search and 2 free tests verified.');
  await send('Browser.close'); ws.close(); preview.kill();
})().catch(error => { console.error(error); process.exitCode = 1; ws?.close(); chrome.kill(); preview.kill(); });
