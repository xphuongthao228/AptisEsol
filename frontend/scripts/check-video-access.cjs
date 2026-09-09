const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/student/Lessons.tsx'), 'utf8');
const ast = ts.createSourceFile('Lessons.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const card = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'ResourceCard');
const context = vm.createContext({
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  PlayCircle: 'PlayCircle', FileText: 'FileText', ArrowRight: 'ArrowRight', Link: 'Link'
});
vm.runInContext(ts.transpileModule(card.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText, context);
let checked = false;
const resource = { title: 'Video', href: 'https://example.invalid/video', lessonId: 1, tags: [] };
const video = context.ResourceCard({ resource, kind: 'VIDEO', onOpen: () => { checked = true; } });
assert.equal(video.type, 'button', 'Video must recheck the API instead of rendering a direct link');
assert.equal(video.props.href, undefined);
video.props.onClick();
assert.equal(checked, true);
assert.equal(context.ResourceCard({ resource, kind: 'VIDEO', onOpen() {}, disabled: true }).props.disabled, true);
const document = context.ResourceCard({ resource, kind: 'DOCUMENT', onOpen() {} });
assert.equal(document.type, 'a');
assert.equal(document.props.href, resource.href);
console.log('Video UI checks passed: API-gated video button, pending state, unchanged document links');
