const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'frontend', 'src');
const extensions = new Set(['.ts', '.tsx', '.css', '.html']);
const bad = '\u1ed1';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist'].includes(entry.name)) walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function repair(text) {
  return text
    .split(`${bad}.`).join('?.')
    .split(`${bad}:`).join('?:')
    .split(`${bad}testId`).join('?testId')
    .split(`${bad}skill`).join('?skill')
    .split(`${bad}publishedOnly`).join('?publishedOnly')
    .split(`${bad}'`).join(`?'`)
    .split(`${bad}"`).join(`?"`);
}

const changed = [];
for (const file of walk(root)) {
  const original = fs.readFileSync(file, 'utf8');
  const fixed = repair(original);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed, 'utf8');
    changed.push(path.relative(path.resolve(__dirname, '..'), file));
  }
}

console.log(`Changed files: ${changed.length}`);
for (const file of changed) console.log(`- ${file}`);
