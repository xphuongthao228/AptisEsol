const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  page.on('response', response => {
    if (response.url().includes('/speaking-bank/') || response.url().includes('/auth/refresh')) console.log('RESPONSE', response.status(), response.request().method(), response.url());
  });
  page.on('requestfailed', request => console.log('REQUEST FAILED', request.method(), request.url(), request.failure()?.errorText));
  await page.goto('http://localhost:5173');
  const login = await page.evaluate(async () => {
    const result = await fetch('http://localhost:8080/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: 'admin@aptis.com', password: '123456'})});
    const response = await result.json();
    const auth = response.data;
    localStorage.setItem('aptis-esol-auth', JSON.stringify({state: {user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken}, version: 0}));
    return result.status;
  });
  console.log('LOGIN', login);
  let fixtureVisible = true;
  await page.route('**/api/speaking-bank/samples', async route => {
    const response = await route.fetch();
    const body = await response.json();
    if (fixtureVisible) body.data.push({id: 'browser-delete-check-nonexistent', part: 'Speaking Part 4', topic: 'Browser check', question: 'Browser check', section: 'opening', text: 'Temporary display fixture', level: 'B1'});
    await route.fulfill({response, json: body});
  });
  await page.route('**/api/speaking-bank/samples/prompts', async route => {
    const selection = route.request().postDataJSON();
    if (selection.length !== 1 || selection[0].id !== 'browser-delete-check-nonexistent') throw new Error('Unexpected deletion target');
    fixtureVisible = false;
    await route.continue();
  });
  await page.goto('http://localhost:5173/admin/speaking-bank?bank=samples');
  await page.getByRole('button', {name:'Kho mẫu câu & đáp án', exact:true}).click();
  await page.getByRole('button', {name:'Tải lại dữ liệu', exact:true}).waitFor();
  console.log('ALERTS', await page.getByRole('alert').allTextContents());
  await page.getByRole('button', {name: /^Part 4/}).click();
  await page.getByRole('checkbox', {name: 'Chọn tất cả'}).check();
  page.on('dialog', dialog => dialog.accept());
  const deleted = page.waitForResponse(response => response.url().endsWith('/speaking-bank/samples/prompts') && response.request().method() === 'DELETE');
  await page.getByRole('button', {name: /Xóa đã chọn/}).click();
  if ((await deleted).status() !== 200) throw new Error('Delete failed');
  await page.getByText('Đã xóa 1 chủ đề', {exact:true}).waitFor();
  console.log('PASS: select all and click Delete sends correct scoped request and updates UI');
  // Simulate an invalid persisted session and stale local data.
  await page.evaluate(() => {
    const auth = JSON.parse(localStorage.getItem('aptis-esol-auth'));
    auth.state.accessToken = 'invalid-expired-session';
    auth.state.refreshToken = null;
    localStorage.setItem('aptis-esol-auth', JSON.stringify(auth));
    localStorage.setItem('aptis-speaking-bank-prompts', JSON.stringify([{id:'stale-fixture',part:'Speaking Part 4',topic:'Stale fixture',question:'Stale fixture',sentences:{opening:[],body:[],ending:[]}}]));
  });
  await page.reload();
  await page.getByRole('button', {name:'Kho mẫu câu & đáp án', exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Phiên đăng nhập đã hết hạn'}).waitFor();
  if (await page.getByText('Stale fixture', {exact:true}).count()) throw new Error('Stale data still rendered');
  console.log('PASS: expired session shows login instruction and does not render stale cached prompts');
  await page.screenshot({path: 'reports/browser-check/loaded.png', fullPage: false});
  await browser.close();
})().catch(error => {console.error(error); process.exitCode=1});
