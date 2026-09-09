const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const browser = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(browser)) throw new Error('Set CHROME_PATH to a Chromium browser for this DOM check.');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/safeHtml.ts'), 'utf8').replace('export function', 'function');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-safe-html-'));
const file = path.join(directory, 'check.html');
const cases = [
  '<p onclick="window.pwned=1">Hello <strong>world</strong><img src="x" onerror="window.pwned=1"></p>',
  '<svg onload="window.pwned=1"><script>window.pwned=1</script></svg><math><mtext>bad</mtext></math><p>Safe</p>',
  '<a href="javascript:window.pwned=1" style="color:red">Link text</a><iframe srcdoc="bad"></iframe>',
  '<table><tr><td style="background:url(x)">Cell</td></tr></table>',
  '<noscript><p title="</noscript><img src=x onerror=window.pwned=1>">bad</p>',
  '<p>&lt;img src=x onerror=window.pwned=1&gt;</p>'
];
fs.writeFileSync(file, '<!doctype html><meta charset="utf-8"><body><div id="result">pending</div><script>' + compiled + '\n' +
  `const cases = ${JSON.stringify(cases).replace(/</g, '\\u003c')};
  const allowed = new Set(['P','BR','B','STRONG','I','EM','U','S','UL','OL','LI','DIV','SPAN','BLOCKQUOTE','H2','H3','H4','TABLE','TBODY','THEAD','TR','TD','TH']);
  for (const input of cases) {
    const output = document.createElement('div');
    output.innerHTML = sanitizeAnswerHtml(input);
    document.body.appendChild(output);
    for (const node of output.querySelectorAll('*')) {
      if (!allowed.has(node.tagName) || node.attributes.length) throw new Error('Unsafe output: ' + output.innerHTML);
    }
  }
  if (sanitizeAnswerHtml('<p>Hello <strong>world</strong></p>') !== '<p>Hello <strong>world</strong></p>') throw new Error('Lost formatting');
  if (window.pwned) throw new Error('Executed imported content');
  document.getElementById('result').textContent = 'SAFE_HTML_PASSED';` + '</script>');
const result = spawnSync(browser, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + path.join(directory, 'profile'), '--dump-dom', 'file:///' + file.replace(/\\/g, '/')], { encoding: 'utf8', timeout: 30000 });
if (result.error) throw result.error;
if (!result.stdout.includes('<div id="result">SAFE_HTML_PASSED</div>')) throw new Error(result.stderr + '\n' + result.stdout);
console.log('Safe HTML browser checks passed: formatting preserved, scripts/attributes/URLs/SVG removed');
