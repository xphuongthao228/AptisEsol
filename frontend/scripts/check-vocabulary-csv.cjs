const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const ts=require('typescript');const assert=require('node:assert/strict');
const context={exports:{},crypto:require('node:crypto')};vm.createContext(context);
vm.runInContext(ts.transpile(fs.readFileSync(path.join(__dirname,'../src/utils/vocabularyCsv.ts'),'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),context);
const {importVocabularyCsv:importCsv,parseVocabularyCsv:parse,vocabularyCsvTemplate:template}=context.exports;
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../../backend/src/main/resources/vocabulary-starter.json'),'utf8'));
const snapshot=JSON.stringify(catalog);
const valid=importCsv(template,catalog);assert.equal(valid.errors.length,0);assert.equal(valid.added,2);assert.equal(valid.topicsAdded,1);assert.equal(valid.catalog.words.length,38);assert.equal(JSON.stringify(catalog),snapshot,'Preview never mutates original catalog');
const update=importCsv('topic,level,word,meaning,example,translation\r\nWork & Office,B2,implement,updated meaning,New example,New translation',catalog);
assert.equal(update.updated,1);const word=update.catalog.words.find(w=>w.id==='implement');assert.equal(word.meaning,'updated meaning');assert.equal(word.published,false);assert.equal(update.catalog.words.length,36);
const quoted=parse('\uFEFFtopic,level,word,meaning,example,translation\r\nTravel,B1,journey,"a, b","Line 1\nLine 2 with ""quotes""",translation');assert.equal(quoted[1].cells[3],'a, b');assert.equal(quoted[1].cells[4],'Line 1\nLine 2 with "quotes"');
const semicolon=importCsv('topic;level;word;meaning;example;translation;published\r\nTravel;B1;journey;meaning;Example;Translation;true',catalog);assert.equal(semicolon.errors.length,0);
for(const source of ['word,level\nhello,B1','topic,level,word,meaning,example,translation\nTravel,A1,hello,meaning,Example,Translation','topic,level,word,meaning,example,translation\nTravel,B1,hello,meaning,Example,Translation\nTravel,B1,HELLO,meaning,Example,Translation','topic,level,word,meaning,example,translation\nTravel,B1,hello,meaning,Example','topic,level,word,meaning,example,translation\nTravel,B1,hello,"unclosed,Example,Translation']){
 const result=importCsv(source,catalog);assert.ok(result.errors.length);assert.equal(result.catalog,catalog,'Invalid file must be atomic');}
const badStatus=importCsv('topic,level,word,meaning,example,translation,published\nTravel,B1,hello,meaning,Example,Translation,maybe',catalog);assert.ok(badStatus.errors[0].includes('Dòng 2'));
assert.equal(JSON.stringify(catalog),snapshot);console.log('Passed CSV: UTF-8/BOM, comma/semicolon, quoted commas/newlines, escaped quotes, missing columns, invalid levels/status, duplicates, stable update IDs, new topics, atomic rejection.');
