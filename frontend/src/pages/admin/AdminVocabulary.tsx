import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Check, Download, Pencil, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import type { VocabularyCatalog, VocabularyTopic, VocabularyWord } from '../../types/vocabulary';
import { importVocabularyCsv, vocabularyCsvTemplate, type VocabularyImport } from '../../utils/vocabularyCsv';
import './admin-vocabulary.css';

const newWord = (): VocabularyWord => ({id:crypto.randomUUID(),topic:'',level:'B1',word:'',ipa:'',meaning:'',example:'',translation:'',published:true});
const newTopic = (): VocabularyTopic => ({id:crypto.randomUUID(),title:'',description:'',icon:'book'});
const levels = ['B1','B2','C1'] as const;
export function AdminVocabulary() {
 const [catalog,setCatalog] = useState<VocabularyCatalog>({revision:0,topics:[],words:[]});
 const [loading,setLoading] = useState(true);
 const [error,setError] = useState('');
 const [saving,setSaving] = useState(false);
 const [dirty,setDirty] = useState(false);
 const [query,setQuery] = useState('');
 const [level,setLevel] = useState('all');
 const [topic,setTopic] = useState('all');
 const [status,setStatus] = useState('all');
 const [selectedIds,setSelectedIds] = useState<Set<string>>(new Set());
 const selectAllRef = useRef<HTMLInputElement>(null);
 const [selectedTopicIds,setSelectedTopicIds] = useState<Set<string>>(new Set());
 const selectAllTopicsRef = useRef<HTMLInputElement>(null);
 useEffect(()=>{setSelectedIds(new Set());},[query,level,topic,status]);
 const [wordForm,setWordForm] = useState<VocabularyWord|null>(null);
 const [topicForm,setTopicForm] = useState<VocabularyTopic|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const [formError,setFormError]=useState('');
 const [ready,setReady]=useState(false);
 const [csvPreview,setCsvPreview]=useState<VocabularyImport|null>(null);
 const [csvName,setCsvName]=useState('');
 const [readingCsv,setReadingCsv]=useState(false);
 const csvInput=useRef<HTMLInputElement>(null);
 async function load() {
  setLoading(true);setError('');
  try {setCatalog(await unwrap<VocabularyCatalog>(api.get('/admin/vocabulary')));setDirty(false);setReady(true);setCsvPreview(null);setSelectedIds(new Set());setSelectedTopicIds(new Set());}
  catch(e:any){const status=e?.response?.status;setError(status===401?'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại tài khoản admin.':status===403?'Tài khoản hiện tại không có quyền quản lý từ vựng.':status===404?'Backend chưa có API từ vựng. Cần chạy phiên bản backend mới.':`Không tải được dữ liệu từ vựng${status?` (HTTP ${status})`:''}. ${e?.response?.data?.message||'Kiểm tra backend và kết nối rồi thử lại.'}`);}
  finally {setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 useEffect(()=>{if(wordForm||topicForm){setFormError('');dialog.current?.showModal();}else dialog.current?.close();},[!!wordForm,!!topicForm]);
 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 const change=(next:VocabularyCatalog)=>{setCatalog(next);setDirty(true);setCsvPreview(null);const words=new Set(next.words.map(w=>w.id));const topics=new Set(next.topics.map(t=>t.id));setSelectedIds(ids=>new Set([...ids].filter(id=>words.has(id))));setSelectedTopicIds(ids=>new Set([...ids].filter(id=>topics.has(id))));};
 async function readCsv(file:File) {
  setCsvName(file.name);setReadingCsv(true);setCsvPreview(null);
  try {
   if(!/\.csv$/i.test(file.name))throw new Error('Vui lòng chọn file .csv.');
   if(file.size>5*1024*1024)throw new Error('File CSV tối đa 5 MB.');
   setCsvPreview(importVocabularyCsv(await file.text(),catalog));
  }catch(e){setCsvPreview({catalog,added:0,updated:0,topicsAdded:0,rows:0,errors:[e instanceof Error?e.message:'Không đọc được file CSV.']});}
  finally{setReadingCsv(false);if(csvInput.current)csvInput.current.value='';}
 }
 function downloadTemplate() {
  const url=URL.createObjectURL(new Blob([vocabularyCsvTemplate],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='tu-vung-mau.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const close=()=>{setWordForm(null);setTopicForm(null);};
 async function save(nextCatalog:VocabularyCatalog=catalog) {
  if(saving||(!dirty&&nextCatalog===catalog))return;
  setSaving(true);setError('');
  try {const data=await unwrap<VocabularyCatalog>(api.put('/admin/vocabulary',nextCatalog));setCatalog(data);setDirty(false);window.dispatchEvent(new Event('aptis:vocabulary-updated'));try{localStorage.setItem('aptis-vocabulary-catalog-updated',JSON.stringify({revision:data.revision,at:Date.now()}));}catch{}toast.success('Đã lưu từ vựng. Trang học đã có dữ liệu mới.');}
  catch(e:any){setError(e?.response?.status===409?'Dữ liệu đã được admin khác cập nhật. Hãy tải lại và thực hiện lại thay đổi để tránh ghi đè.':e?.response?.data?.message||'Không lưu được dữ liệu. Các thay đổi vẫn được giữ để bạn thử lại.');}
  finally{setSaving(false);}
 }
 function submitWord(e:FormEvent) {
  e.preventDefault();if(!wordForm)return;
  const w={...wordForm,word:wordForm.word.trim(),ipa:wordForm.ipa.trim(),meaning:wordForm.meaning.trim(),example:wordForm.example.trim(),translation:wordForm.translation.trim()};
  if(!w.word||!w.meaning||!w.example||!w.translation||!catalog.topics.some(t=>t.id===w.topic)){setFormError('Nhập đầy đủ từ, chủ đề, nghĩa và ví dụ Anh–Việt.');return;}
  if(catalog.words.some(x=>x.id!==w.id&&x.topic===w.topic&&x.level===w.level&&x.word.toLowerCase()===w.word.toLowerCase())){setFormError('Từ đã tồn tại trong chủ đề và cấp độ này.');return;}
  change({...catalog,words:catalog.words.some(x=>x.id===w.id)?catalog.words.map(x=>x.id===w.id?w:x):[...catalog.words,w]});close();
 }
 function submitTopic(e:FormEvent) {
  e.preventDefault();if(!topicForm)return;const t={...topicForm,title:topicForm.title.trim(),description:topicForm.description.trim()};
  if(!t.title){setFormError('Nhập tên chủ đề.');return;}
  if(catalog.topics.some(x=>x.id!==t.id&&x.title.toLowerCase()===t.title.toLowerCase())){setFormError('Tên chủ đề đã tồn tại.');return;}
  change({...catalog,topics:catalog.topics.some(x=>x.id===t.id)?catalog.topics.map(x=>x.id===t.id?t:x):[...catalog.topics,t]});close();
 }
 const filtered=catalog.words.filter(w=>(level==='all'||w.level===level)&&(topic==='all'||w.topic===topic)&&(status==='all'||w.published===(status==='published'))&&[w.word,w.meaning,w.example].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const selectedWords=filtered.filter(w=>selectedIds.has(w.id));
 const allSelected=filtered.length>0&&selectedWords.length===filtered.length;
 const allTopicsSelected=catalog.topics.length>0&&selectedTopicIds.size===catalog.topics.length;
 useEffect(()=>{if(selectAllTopicsRef.current)selectAllTopicsRef.current.indeterminate=selectedTopicIds.size>0&&!allTopicsSelected;},[selectedTopicIds.size,allTopicsSelected,loading]);
 function deleteTopics(ids:Set<string>) {
  if(saving||!ids.size)return;
  const topics=catalog.topics.filter(t=>ids.has(t.id));
  if(!topics.length)return;
  const wordCount=catalog.words.filter(w=>ids.has(w.topic)).length;
  if(!window.confirm(`Xóa ${topics.length} chủ đề và ${wordCount} từ vựng thuộc các chủ đề này? Nhấn “Lưu thay đổi” sau đó để áp dụng vào database.`))return;
  change({...catalog,topics:catalog.topics.filter(t=>!ids.has(t.id)),words:catalog.words.filter(w=>!ids.has(w.topic))});
  setSelectedTopicIds(new Set());
  if(ids.has(topic))setTopic('all');
 }
 useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=selectedWords.length>0&&!allSelected;},[selectedWords.length,allSelected,loading]);
 function deleteSelected() {
  if(saving||!selectedWords.length)return;
  if(!window.confirm(`Xóa ${selectedWords.length} từ đã chọn khỏi danh sách? Nhấn “Lưu thay đổi” sau đó để áp dụng vào database.`))return;
  const ids=new Set(selectedWords.map(w=>w.id));
  change({...catalog,words:catalog.words.filter(w=>!ids.has(w.id))});
  setSelectedIds(new Set());
 }
 return <main className="admin-vocabulary">
 <header><div><span><BookOpen size={18}/>Nội dung học tập</span><h1>Quản lý từ vựng</h1><p>Quản lý chủ đề, từ vựng và nội dung học B1 · B2 · C1.</p></div><div className="av-actions av-toolbar"><button onClick={downloadTemplate}><Download size={16}/>Tải CSV mẫu</button><button disabled={loading||saving||!ready||readingCsv} onClick={()=>csvInput.current?.click()}><Upload size={16}/>{readingCsv?'Đang đọc CSV...':'Nhập CSV'}</button><button disabled={loading||saving} onClick={()=>{if(!dirty||window.confirm('Bỏ các thay đổi chưa lưu và tải lại dữ liệu?'))void load();}}><RotateCcw size={16}/>Tải lại</button><button className="av-primary" disabled={!dirty||loading||saving} onClick={()=>void save()}><Save size={17}/>{saving?'Đang lưu...':'Lưu thay đổi'}</button></div></header>
 <input ref={csvInput} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Chọn file từ vựng CSV" onChange={e=>{const file=e.target.files?.[0];if(file)void readCsv(file);}}/>
 {csvPreview&&<section className="av-section av-csv-preview" aria-label="Xem trước nhập CSV"><div className="av-section-title"><div><h2>Xem trước: {csvName}</h2><p>{csvPreview.rows} dòng · Thêm {csvPreview.added} từ · Cập nhật {csvPreview.updated} từ · {csvPreview.topicsAdded} chủ đề mới</p></div><button aria-label="Đóng xem trước CSV" onClick={()=>setCsvPreview(null)}><X size={17}/></button></div>{csvPreview.errors.length?<div className="av-error" role="alert"><strong>Chưa nhập dữ liệu. Hãy sửa {csvPreview.errors.length} lỗi rồi chọn lại file.</strong><ul>{csvPreview.errors.slice(0,50).map((message,i)=><li key={i}>{message}</li>)}</ul>{csvPreview.errors.length>50&&<p>Hiển thị 50 lỗi đầu tiên.</p>}</div>:<><p>Khớp từ theo chủ đề + cấp độ + từ tiếng Anh; từ đã có được cập nhật và giữ tiến độ học. Chủ đề mới được tạo tự động. Cột published để trống sẽ nhập bản nháp.</p><div className="av-table-wrap"><table><thead><tr><th>Từ vựng</th><th>Nghĩa</th><th>Chủ đề / Cấp độ</th><th>Trạng thái</th></tr></thead><tbody>{csvPreview.catalog.words.filter(w=>!catalog.words.some(old=>old.id===w.id&&JSON.stringify(old)===JSON.stringify(w))).slice(0,10).map(w=><tr key={w.id}><td>{w.word}</td><td>{w.meaning}</td><td>{csvPreview.catalog.topics.find(t=>t.id===w.topic)?.title} · {w.level}</td><td>{w.published?'Xuất bản':'Bản nháp'}</td></tr>)}</tbody></table></div><p>Hiển thị tối đa 10 từ thay đổi. Nhấn “Nhập và lưu CSV” để lưu dữ liệu vào database và hiển thị các từ được xuất bản bên trang học.</p><button className="av-primary" disabled={saving||loading} onClick={()=>{const next=csvPreview.catalog;change(next);void save(next);}}><Check size={16}/>Nhập và lưu CSV</button></>}</section>}
 {error&&<p className="av-error" role="alert">{error}</p>}
 {dirty&&<p className="av-pending" role="status">Có thay đổi chưa lưu. Nhấn “Lưu thay đổi” để áp dụng lên trang học.</p>}
 {loading?<p role="status">Đang tải dữ liệu...</p>:error&&!catalog.topics.length?<button onClick={()=>void load()}>Thử lại</button>:<>
 <section className="av-stats"><article><b>{catalog.words.length}</b><span>Tổng số từ</span></article><article><b>{catalog.words.filter(w=>w.published).length}</b><span>Đã xuất bản</span></article><article><b>{catalog.words.filter(w=>!w.published).length}</b><span>Bản nháp</span></article><article><b>{catalog.topics.length}</b><span>Chủ đề</span></article></section>
 <section className="av-section"><div className="av-section-title"><div><h2>Chủ đề từ vựng</h2><p>Xóa chủ đề sẽ xóa kèm các từ vựng thuộc chủ đề đó.</p></div><button disabled={saving} onClick={()=>setTopicForm(newTopic())}><Plus size={16}/>Thêm chủ đề</button></div><div className="av-bulk-actions av-topic-bulk"><label><input ref={selectAllTopicsRef} type="checkbox" aria-label="Chọn tất cả chủ đề" checked={allTopicsSelected} disabled={saving||!catalog.topics.length} onChange={e=>setSelectedTopicIds(e.target.checked?new Set(catalog.topics.map(t=>t.id)):new Set())}/>Chọn tất cả chủ đề</label><span role="status">Đã chọn <strong>{selectedTopicIds.size}</strong> / {catalog.topics.length} chủ đề</span><button disabled={saving||!selectedTopicIds.size} onClick={()=>setSelectedTopicIds(new Set())}>Bỏ chọn chủ đề</button><button className="av-delete-topics" disabled={saving||!selectedTopicIds.size} onClick={()=>deleteTopics(selectedTopicIds)}><Trash2 size={16}/>Xóa chủ đề đã chọn ({selectedTopicIds.size})</button></div><div className="av-topic-list">{catalog.topics.map(t=><article key={t.id} data-selected={selectedTopicIds.has(t.id)}><input type="checkbox" aria-label={`Chọn chủ đề ${t.title}`} checked={selectedTopicIds.has(t.id)} disabled={saving} onChange={e=>{const checked=e.target.checked;setSelectedTopicIds(ids=>{const next=new Set(ids);if(checked)next.add(t.id);else next.delete(t.id);return next;});}}/><BookOpen size={20}/><div><strong>{t.title}</strong><small>{catalog.words.filter(w=>w.topic===t.id).length} từ · {t.description}</small></div><button disabled={saving} aria-label={`Sửa chủ đề ${t.title}`} onClick={()=>setTopicForm({...t})}><Pencil size={15}/></button><button disabled={saving} title="Xóa chủ đề và các từ vựng thuộc chủ đề" aria-label={`Xóa chủ đề ${t.title}`} onClick={()=>deleteTopics(new Set([t.id]))}><Trash2 size={15}/></button></article>)}</div></section>
 <section className="av-section"><div className="av-section-title"><div><h2>Danh sách từ vựng</h2><p>{filtered.length} từ phù hợp · Từ bản nháp chỉ hiển thị ở admin.</p></div><button className="av-primary" disabled={saving||!catalog.topics.length} onClick={()=>setWordForm({...newWord(),topic:topic==='all'?catalog.topics[0].id:topic})}><Plus size={17}/>Thêm từ vựng</button></div><div className="av-filters"><label className="av-search"><Search size={17}/><input aria-label="Tìm từ vựng" placeholder="Tìm từ, nghĩa, ví dụ..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Lọc cấp độ" value={level} onChange={e=>setLevel(e.target.value)}><option value="all">Tất cả cấp độ</option>{levels.map(l=><option key={l}>{l}</option>)}</select><select aria-label="Lọc chủ đề" value={topic} onChange={e=>setTopic(e.target.value)}><option value="all">Tất cả chủ đề</option>{catalog.topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select><select aria-label="Lọc trạng thái" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Mọi trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></div><div className="av-bulk-actions"><span role="status">Đã chọn <strong>{selectedWords.length}</strong> / {filtered.length} từ theo bộ lọc</span><button disabled={saving||!selectedWords.length} onClick={()=>setSelectedIds(new Set())}>Bỏ chọn</button><button className="av-delete-selected" disabled={saving||!selectedWords.length} onClick={deleteSelected}><Trash2 size={16}/>Xóa các từ đã chọn ({selectedWords.length})</button></div><div className="av-table-wrap"><table><thead><tr><th className="av-checkbox-cell"><input ref={selectAllRef} type="checkbox" aria-label="Chọn tất cả từ theo bộ lọc" checked={allSelected} disabled={saving||!filtered.length} onChange={e=>setSelectedIds(e.target.checked?new Set(filtered.map(w=>w.id)):new Set())}/></th><th>Từ vựng</th><th>Nghĩa</th><th>Chủ đề / Cấp độ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(w=><tr key={w.id} data-selected={selectedIds.has(w.id)}><td className="av-checkbox-cell"><input type="checkbox" aria-label={`Chọn từ ${w.word}`} checked={selectedIds.has(w.id)} disabled={saving} onChange={e=>{const checked=e.target.checked;setSelectedIds(ids=>{const next=new Set(ids);if(checked)next.add(w.id);else next.delete(w.id);return next;});}}/></td><td><strong>{w.word}</strong><small>{w.ipa}</small></td><td>{w.meaning}<small>{w.example}</small></td><td>{catalog.topics.find(t=>t.id===w.topic)?.title}<small><span className="av-level">{w.level}</span></small></td><td><span className={w.published?'av-published':'av-draft'}>{w.published?'Đã xuất bản':'Bản nháp'}</span></td><td><div className="av-actions"><button disabled={saving} aria-label={`Sửa từ ${w.word}`} onClick={()=>setWordForm({...w})}><Pencil size={16}/></button><button disabled={saving} aria-label={`Xóa từ ${w.word}`} onClick={()=>{if(window.confirm(`Xóa từ “${w.word}”?`))change({...catalog,words:catalog.words.filter(x=>x.id!==w.id)});}}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!filtered.length&&<p className="av-empty">Chưa có từ phù hợp. Thêm từ mới hoặc thay đổi bộ lọc.</p>}</div></section></>}
 {dirty&&<aside className="av-save-bar" aria-label="Thay đổi chưa lưu"><div><strong>Có thay đổi chưa lưu vào database</strong><span>Danh sách admin đang có {catalog.words.length} từ. Trang học chỉ hiển thị dữ liệu đã lưu và xuất bản.</span></div><button className="av-primary" disabled={saving||loading} onClick={()=>void save()}><Save size={17}/>{saving?'Đang lưu...':'Lưu thay đổi'}</button></aside>}
 <dialog ref={dialog} className="av-dialog" onCancel={close} onClose={close}><button className="av-close" aria-label="Đóng biểu mẫu" onClick={close}><X size={19}/></button>{wordForm&&<form onSubmit={submitWord}><h2>{catalog.words.some(w=>w.id===wordForm.id)?'Sửa từ vựng':'Thêm từ vựng'}</h2><p>Cập nhật nội dung, sau đó lưu thay đổi để xuất bản.</p><div className="av-form-grid"><label>Từ / Cụm từ *<input required maxLength={160} value={wordForm.word} onChange={e=>setWordForm({...wordForm,word:e.target.value})}/></label><label>Phiên âm IPA<input maxLength={200} value={wordForm.ipa} onChange={e=>setWordForm({...wordForm,ipa:e.target.value})}/></label><label>Chủ đề *<select required value={wordForm.topic} onChange={e=>setWordForm({...wordForm,topic:e.target.value})}>{catalog.topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label>Cấp độ *<select value={wordForm.level} onChange={e=>setWordForm({...wordForm,level:e.target.value as VocabularyWord['level']})}>{levels.map(l=><option key={l}>{l}</option>)}</select></label><label className="av-wide">Nghĩa tiếng Việt (kèm loại từ) *<input required maxLength={500} value={wordForm.meaning} placeholder="(v) triển khai, thực hiện" onChange={e=>setWordForm({...wordForm,meaning:e.target.value})}/></label><label className="av-wide">Ví dụ tiếng Anh *<textarea required maxLength={2000} rows={3} value={wordForm.example} onChange={e=>setWordForm({...wordForm,example:e.target.value})}/></label><label className="av-wide">Dịch ví dụ tiếng Việt *<textarea required maxLength={2000} rows={3} value={wordForm.translation} onChange={e=>setWordForm({...wordForm,translation:e.target.value})}/></label><label>Trạng thái<select value={wordForm.published?'published':'draft'} onChange={e=>setWordForm({...wordForm,published:e.target.value==='published'})}><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></label></div>{formError&&<p className="av-error" role="alert">{formError}</p>}<div className="av-form-actions"><button type="button" onClick={close}>Hủy</button><button className="av-primary" type="submit"><Check size={16}/>Cập nhật danh sách</button></div></form>}{topicForm&&<form onSubmit={submitTopic}><h2>{catalog.topics.some(t=>t.id===topicForm.id)?'Sửa chủ đề':'Thêm chủ đề'}</h2><div className="av-form-grid"><label className="av-wide">Tên chủ đề *<input required maxLength={120} value={topicForm.title} onChange={e=>setTopicForm({...topicForm,title:e.target.value})}/></label><label className="av-wide">Mô tả<textarea rows={3} maxLength={500} value={topicForm.description} onChange={e=>setTopicForm({...topicForm,description:e.target.value})}/></label><label>Biểu tượng<select value={topicForm.icon} onChange={e=>setTopicForm({...topicForm,icon:e.target.value as VocabularyTopic['icon']})}><option value="book">Sách</option><option value="education">Giáo dục</option><option value="work">Công việc</option><option value="environment">Môi trường</option><option value="technology">Công nghệ</option></select></label></div>{formError&&<p className="av-error" role="alert">{formError}</p>}<div className="av-form-actions"><button type="button" onClick={close}>Hủy</button><button className="av-primary" type="submit"><Check size={16}/>Cập nhật danh sách</button></div></form>}</dialog>
 </main>;
}
