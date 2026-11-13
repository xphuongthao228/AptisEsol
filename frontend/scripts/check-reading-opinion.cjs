const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function loadModule(file) {
  const context = vm.createContext({ exports: {}, require, console });
  vm.runInContext(compile(fs.readFileSync(file, 'utf8')), context);
  return context.exports;
}
const repairs = loadModule(path.join(root, 'utils/textRepair.ts'));
const filters = loadModule(path.join(root, 'utils/mockTestFilters.ts'));
const source = fs.readFileSync(path.join(root, 'pages/student/MockTests.tsx'), 'utf8');
const ast = ts.createSourceFile('MockTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node)
  || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ['fullRequiredSkills', 'emptyReadingTestData', 'mockCardMeta'].includes(d.name.getText(ast)))));
const context = vm.createContext({ exports: {}, require, console, ...require('lucide-react'), ...repairs, ...filters });
vm.runInContext(compile(declarations.map(node => node.getText(ast)).join('\n')), context);
const call = (name, ...args) => context[name](...args);
const intro = 'Here is the perspective of four people on the above topic. Please read the content and answer the questions.';
for (const skill of ['READING', 'FULL']) {
  for (const names of [['Anna','Ben','Chloe','David'], ['Alice','John','Mary']]) {
    for (const headings of ['letters','names']) {
      const row = { skill:'READING', part:'3', template:'READING_FORUM_MATCH', options:names,
        context:[`<strong>${intro}</strong>`, ...names.map((name,i)=>`<strong>${headings === 'letters' ? String.fromCharCode(65+i) : name}:</strong> Passage belonging to ${name}.`)],
        questions:names.map(name=>'Who describes '+name+'?'), correctAnswers:names };
      const card = { skill, questionData:JSON.stringify([row]) };
      call('normalizeQuestionDataObject',row);
      const data = call('getReadingTestDataFromCard',card);
      assert.deepEqual(Array.from(data.opinion.people,p=>p.label),names);
      assert.equal(data.opinion.people.length,names.length,'Instruction must not become a person');
      const old = Object.fromEntries(names.map((_,i)=>[i,String.fromCharCode(65+i)]));
      const current = Object.fromEntries(names.map((name,i)=>[i,name]));
      for (const answers of [old,current]) {
        const score = call('scoreReadingAnswers',{}, {}, answers, {}, data);
        assert.equal(score.rows.find(r=>r.part === 'Part 3 - Opinion Matching').correct, `${names.length}/${names.length}`);
        const review = call('savedReadingReview',data,{}, {}, answers,{}).find(g=>g.title === 'Part 3 - Opinion Matching');
        assert.ok(review.rows.every((r,i)=>r.correct && r.userAnswer === names[i] && r.correctAnswer === names[i]));
      }
      for (const [i,name] of names.entries()) assert.equal(call('resolveOptionLabel',String.fromCharCode(65+i),names),name);
    }
  }
}
const legacy = call('getReadingTestDataFromCard',{skill:'FULL',questionData:JSON.stringify([{skill:'READING',part:'3',template:'READING_FORUM_MATCH',context:['A: First passage.','B: Second passage.','C: Third passage.','D: Fourth passage.'],questions:['One','Two','Three','Four'],correctAnswers:['Anna','Ben','David','Chloe']}])});
assert.deepEqual(Array.from(legacy.opinion.people,p=>p.label),['Anna','Ben','Chloe','David']);
console.log('Passed: Reading and Full imports, 3/4 people, named/letter headings, instruction exclusion, legacy letters, scoring and saved review.');
