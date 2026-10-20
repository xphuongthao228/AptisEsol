const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page = await browser.newPage();
 page.on('pageerror', e => console.log('PAGE ERROR',e.message));
 await page.goto('http://localhost:5173');
 await page.evaluate(async () => {
   const r=await fetch('http://localhost:8080/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@aptis.com',password:'123456'})});
   const {data}=await r.json();
   localStorage.setItem('aptis-esol-auth',JSON.stringify({state:{user:data.user,accessToken:data.accessToken,refreshToken:data.refreshToken},version:0}));
 });
 await page.goto('http://localhost:5173/admin/speaking-bank?bank=samples');
 await page.getByRole('button',{name:'Kho mẫu câu & đáp án',exact:true}).click();
 await page.getByRole('button',{name:'Tải lại dữ liệu',exact:true}).waitFor();
 if (!process.argv.includes('--verify-only')) {
 const backup=await page.evaluate(async()=>{
   const auth=JSON.parse(localStorage.getItem('aptis-esol-auth')).state;
   return (await (await fetch('http://localhost:8080/api/speaking-bank/samples',{headers:{Authorization:`Bearer ${auth.accessToken}`}})).json()).data;
 });
 fs.writeFileSync('reports/part4-bank-before-level-import.json',JSON.stringify(backup,null,2));
 await page.getByRole('button',{name:/^Part 4/}).click();
 const saved=page.waitForResponse(r=>r.url().endsWith('/speaking-bank/samples')&&r.request().method()==='PUT');
 await page.locator('label').filter({hasText:'Import kho mẫu câu Part 4'}).locator('input').setInputFiles('C:/Users/LENOVO/Downloads/IMPORT_KHO_MAU_CAU_PART4_B1_B2_C1.csv');
 const response=await saved;
 console.log('IMPORT',response.status());
 if(response.status()!==200) throw new Error((await response.text()).slice(0,500));
 await page.getByText('Đã import 52 câu hỏi vào kho mẫu câu Part 4',{exact:true}).waitFor();
 }
 await page.goto('http://localhost:5173/app/speaking-bank');
 await page.waitForFunction(()=>[...document.querySelectorAll('.ss-step-label b')].some(el=>el.textContent.includes('Trả lời trực tiếp')));
 const titles = await page.locator('.ss-step-label b').allTextContents();
 if (titles.some(title => /^Câu \d/.test(title))) throw new Error('Answer sentences incorrectly used as development steps');
 console.log('PASS: Part 1 displays development step labels:', titles.join(', '));
 await page.getByRole('button',{name:/^Part 2/}).click();
 await page.getByRole('textbox',{name:'Tìm câu hỏi Speaking'}).fill('Why do people like eating out with friends');
 await page.waitForFunction(()=>[...document.querySelectorAll('.ss-pictures img')].some(img=>img.complete && img.naturalWidth>0 && img.src.endsWith('/images/speaking/part2/1.png')));
 console.log('PASS: reimported Part 2 first question displays loaded matching local image');
 await page.getByRole('textbox',{name:'Tìm câu hỏi Speaking'}).fill('');
 await page.getByRole('button',{name:/^Part 4/}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(el=>el.value.includes('I saved money to buy a laptop.')));
 if ((await page.locator('.ss-question-title, .ss-part4-questions').innerText()).includes('Mẫu form chung')) throw new Error('Placeholder still appears first');
 console.log('PASS: Part 4 opens with imported question instead of placeholder');
 await page.getByRole('textbox',{name:'Tìm câu hỏi Speaking'}).fill('saved money');
 const answer=page.locator('.ss-step textarea').first();
 // All editable form fields are textareas inside the development panel.
 await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(el=>el.value.includes('I saved money to buy a laptop.')));
 for(const level of ['B1','B2','C1']){
   await page.getByRole('button',{name:new RegExp('^'+level)}).click();
   await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(el=>el.value.includes('I saved money to buy a laptop.')));
   const expected = level === 'B1' ? 'It happened last year.' : 'This took place last year.';
   await page.waitForFunction(text=>[...document.querySelectorAll('textarea')].some(el=>el.value === text), expected);
   console.log('PASS',level,'imported form displayed');
 }
 await page.screenshot({path:'reports/browser-check/part4-imported-levels.png'});
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
