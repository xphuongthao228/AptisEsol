import type { VocabularyCatalog, VocabularyTopic, VocabularyWord } from '../types/vocabulary';

export type VocabularyImport = { catalog: VocabularyCatalog; added: number; updated: number; topicsAdded: number; errors: string[]; rows: number };
const required = ['topic','level','word','meaning','example','translation'];
const limits: Record<string,number> = {topic:120,word:160,ipa:200,meaning:500,example:2000,translation:2000};

// CSV records retain their physical starting line, including quoted multiline fields.
export function parseVocabularyCsv(source: string): { cells: string[]; line: number }[] {
 const text=source.replace(/^\uFEFF/,'');
 const firstLine=text.split(/\r?\n/,1)[0];
 const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':',';
 const rows:{cells:string[];line:number}[]=[];
 let cells:string[]=[],value='',quoted=false,closed=false,line=1,start=1;
 const field=()=>{cells.push(value.trim());value='';closed=false;};
 const row=()=>{field();if(cells.some(c=>c!==''))rows.push({cells,line:start});cells=[];};
 for(let i=0;i<text.length;i++) {
  const ch=text[i];
  if(quoted){if(ch==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else{value+=ch;if(ch==='\n')line++;}continue;}
  if(ch==='"'){if(value.trim()||closed)throw new Error(`Dòng ${line}: dấu ngoặc kép không hợp lệ.`);quoted=true;value='';}
  else if(ch===delimiter){field();}
  else if(ch==='\n'||ch==='\r'){row();if(ch==='\r'&&text[i+1]==='\n')i++;line++;start=line;}
  else if(closed){if(ch!==' '&&ch!=='\t')throw new Error(`Dòng ${line}: ký tự không hợp lệ sau dấu ngoặc kép.`);}
  else value+=ch;
 }
 if(quoted)throw new Error(`Dòng ${start}: thiếu dấu ngoặc kép đóng.`);
 if(value||cells.length||closed)row();
 return rows;
}

export function importVocabularyCsv(source:string,original:VocabularyCatalog):VocabularyImport {
 const result:VocabularyImport={catalog:original,added:0,updated:0,topicsAdded:0,errors:[],rows:0};
 try {
  const records=parseVocabularyCsv(source);
  if(records.length<2)throw new Error('File cần có dòng tiêu đề và ít nhất một dòng từ vựng.');
  if(records.length>10001)throw new Error('Mỗi lần nhập tối đa 10.000 từ.');
  const headers=records[0].cells.map(h=>h.toLowerCase());
  if(new Set(headers).size!==headers.length)throw new Error('Tiêu đề cột bị trùng.');
  const missing=required.filter(h=>!headers.includes(h));
  if(missing.length)throw new Error(`Thiếu cột: ${missing.join(', ')}.`);
  const topics=original.topics.map(t=>({...t}));
  const words=original.words.map(w=>({...w}));
  const seen=new Set<string>();
  for(const record of records.slice(1)) {
   result.rows++;
   const prefix=`Dòng ${record.line}: `;
   if(record.cells.length!==headers.length){result.errors.push(prefix+`cần ${headers.length} cột, hiện có ${record.cells.length}.`);continue;}
   const fields=Object.fromEntries(headers.map((h,i)=>[h,record.cells[i]]));
   const empty=required.filter(h=>!fields[h]);
   if(empty.length){result.errors.push(prefix+`thiếu ${empty.join(', ')}.`);continue;}
   const tooLong=Object.entries(limits).filter(([h,max])=>(fields[h]||'').length>max);
   if(tooLong.length){result.errors.push(prefix+`quá giới hạn ký tự: ${tooLong.map(([h,max])=>`${h} (${max})`).join(', ')}.`);continue;}
   const level=fields.level.toUpperCase();
   if(!['B1','B2','C1'].includes(level)){result.errors.push(prefix+'level phải là B1, B2 hoặc C1.');continue;}
   const publishedValue=(fields.published||'false').toLowerCase();
   if(!['true','false','1','0','published','draft'].includes(publishedValue)){result.errors.push(prefix+'published phải là true/false hoặc 1/0.');continue;}
   const normalizedTopic=fields.topic.toLowerCase();
   let topic=topics.find(t=>t.id.toLowerCase()===normalizedTopic||t.title.toLowerCase()===normalizedTopic);
   if(!topic){topic={id:crypto.randomUUID(),title:fields.topic,description:'',icon:'book'} satisfies VocabularyTopic;topics.push(topic);result.topicsAdded++;}
   const key=`${topic.id}:${level}:${fields.word.toLowerCase()}`;
   if(seen.has(key)){result.errors.push(prefix+'từ bị trùng chủ đề và cấp độ trong file.');continue;}seen.add(key);
   const existing=words.findIndex(w=>w.topic===topic!.id&&w.level===level&&w.word.toLowerCase()===fields.word.toLowerCase());
   const word:VocabularyWord={id:existing>=0?words[existing].id:crypto.randomUUID(),topic:topic.id,level:level as VocabularyWord['level'],word:fields.word,ipa:fields.ipa||'',meaning:fields.meaning,example:fields.example,translation:fields.translation,published:['true','1','published'].includes(publishedValue)};
   if(existing>=0){words[existing]=word;result.updated++;}else{words.push(word);result.added++;}
  }
  if(topics.length>100)result.errors.push('Tổng số chủ đề vượt giới hạn 100.');
  if(words.length>10000)result.errors.push('Tổng số từ vượt giới hạn 10.000.');
  if(!result.errors.length)result.catalog={...original,topics,words};
 }catch(e){result.errors.push(e instanceof Error?e.message:'Không đọc được file CSV.');}
 return result;
}

export const vocabularyCsvTemplate='\uFEFFtopic,level,word,ipa,meaning,example,translation,published\r\n'+
 'Travel,B1,journey,/ˈdʒɜːni/,"(n) chuyến đi, hành trình",We enjoyed the journey.,Chúng tôi đã tận hưởng chuyến đi.,true\r\n'+
 'Work & Office,B2,collaborate,/kəˈlæbəreɪt/,(v) cộng tác,We collaborate on new projects.,Chúng tôi cộng tác trong các dự án mới.,false\r\n';
