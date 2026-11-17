import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Bookmark, BriefcaseBusiness, ChartNoAxesColumnIncreasing, Check, ChevronLeft, ChevronRight, Copy, GraduationCap, Laptop, Leaf, Pencil, Star, Target, Volume2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './vocabulary.css';

import { publicApi, unwrap } from '../../api/client';
import type { VocabularyCatalog, VocabularyLevel as Level, VocabularyWord as Word } from '../../types/vocabulary';
const topicIcons = { education: GraduationCap, work: BriefcaseBusiness, environment: Leaf, technology: Laptop, book: BookOpen };
type Progress = { learned: string[]; saved: string[]; daily: Record<string,string[]> };
const emptyProgress = (): Progress => ({learned:[],saved:[],daily:{}});
const todayKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
function readProgress(key: string): Progress {
  try { const p = JSON.parse(localStorage.getItem(key) || 'null'); if (p && Array.isArray(p.learned) && Array.isArray(p.saved) && p.daily && typeof p.daily === 'object') return p; } catch { /* Use empty progress when storage is unavailable. */ }
  return emptyProgress();
}
export function Vocabulary() {
 const [catalog,setCatalog] = useState<VocabularyCatalog>({revision:0,topics:[],words:[]});
 const [catalogLoading,setCatalogLoading] = useState(true);
 const [catalogError,setCatalogError] = useState(false);
 const [reload,setReload] = useState(0);
 const {topics,words} = catalog;
 useEffect(() => {
   let active=true,inFlight=false,initial=true,lastFetch=0;
   const refresh=async(force=false)=>{
     if(!active||inFlight||document.visibilityState==='hidden'||(!force&&Date.now()-lastFetch<30000))return;
     inFlight=true;lastFetch=Date.now();
     try {
       const data=await unwrap<VocabularyCatalog>(publicApi.get('/vocabulary',{headers:{'Cache-Control':'no-cache'}}));
       if(!active)return;
       const firstLoad=initial;
       setCatalog(previous=>previous.revision===data.revision&&!firstLoad?previous:data);
       setTopic(previous=>previous==='all'||data.topics.some(t=>t.id===previous)?previous:'all');
       setSession(previous=>{
         if(!previous)return null;
         const updated=previous.map(w=>data.words.find(next=>next.id===w.id));
         return updated.every((w):w is Word=>Boolean(w))?updated:null;
       });
       if(initial){
         const seed=[...todayKey()].reduce((n,c)=>n*31+c.charCodeAt(0),0);
         setDailyIndex(data.words.length?Math.abs(seed)%data.words.length:0);
       }
       setCatalogError(false);
     }catch{if(active&&initial)setCatalogError(true);}
     finally{if(active){setCatalogLoading(false);initial=false;}inFlight=false;}
   };
   const onFocus=()=>{void refresh();};
   const onUpdate=()=>{void refresh(true);};
   const onStorage=(event:StorageEvent)=>{if(event.key==='aptis-vocabulary-catalog-updated')onUpdate();};
   void refresh(true);
   const timer=window.setInterval(onFocus,60000);
   window.addEventListener('focus',onFocus);
   document.addEventListener('visibilitychange',onFocus);
   window.addEventListener('aptis:vocabulary-updated',onUpdate);
   window.addEventListener('storage',onStorage);
   return ()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('aptis:vocabulary-updated',onUpdate);window.removeEventListener('storage',onStorage);};
 },[reload]);
 const userId = useAuthStore(s => s.user?.id);
 const storageKey = `aptis-vocabulary-${userId ?? 'guest'}`;
 const [progress,setProgress] = useState<Progress>(() => readProgress(storageKey));
 const [level,setLevel] = useState<Level>('B1');
 const [topic,setTopic] = useState('all');
 const [savedOnly,setSavedOnly] = useState(false);
 const [mode,setMode] = useState<'flashcard'|'exercise'>('flashcard');
 const [session,setSession] = useState<Word[]|null>(null);
 const [index,setIndex] = useState(0);
 const [revealed,setRevealed] = useState(false);
 const [answer,setAnswer] = useState<string|null>(null);
 const [dailyIndex,setDailyIndex] = useState(0);
 const [notice,setNotice] = useState('');
 const dialog = useRef<HTMLDialogElement>(null);
 useEffect(() => { setProgress(readProgress(storageKey)); setSession(null); },[storageKey]);
 useEffect(() => { if(session) dialog.current?.showModal(); else dialog.current?.close(); },[session]);
 const update = (next: Progress) => { setProgress(next); try {localStorage.setItem(storageKey,JSON.stringify(next));} catch {setNotice('Trình duyệt không lưu được tiến độ. Tiến độ hiện chỉ giữ trong lần mở trang này.');} };
 const save = (id: string) => update({...progress,saved:progress.saved.includes(id)?progress.saved.filter(x=>x!==id):[...progress.saved,id]});
 const learn = (id: string) => {const day=todayKey(); update({...progress,learned:[...new Set([...progress.learned,id])],daily:{...progress.daily,[day]:[...new Set([...(progress.daily[day]||[]),id])]}});};
 const speak = (text: string) => { if(!('speechSynthesis' in window)){setNotice('Trình duyệt chưa hỗ trợ phát âm.');return;} speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';speechSynthesis.speak(utterance); };
 const filtered = words.filter(w=>w.level===level && (topic==='all'||w.topic===topic) && (!savedOnly||progress.saved.includes(w.id)));
 const start = (list:Word[],nextMode=mode) => {if(!list.length){setNotice('Chưa có từ nào phù hợp. Hãy chọn chủ đề khác hoặc lưu thêm từ.');return;}setMode(nextMode);setIndex(0);setRevealed(false);setAnswer(null);setSession(list);};
 const current=session?.[index];
 const daily=words[dailyIndex%words.length];
 const dailyCount=(progress.daily[todayKey()]||[]).filter(id=>words.some(w=>w.id===id)).length;
 const dailyGoal=Math.min(30,words.length);
 const next = () => {setIndex(i=>i+1);setRevealed(false);setAnswer(null);};
 const count = (list:Word[]) => list.filter(w=>progress.learned.includes(w.id)).length;
 if(catalogLoading) return <main className="vocab-page"><p role="status">Đang tải từ vựng...</p></main>;
 if(catalogError) return <main className="vocab-page"><div className="vocab-empty" role="alert"><h2>Chưa tải được từ vựng</h2><p>Vui lòng kiểm tra kết nối và thử lại.</p><button className="vocab-primary" onClick={()=>setReload(n=>n+1)}>Thử lại</button></div></main>;
 return <main className="vocab-page">
  <header className="vocab-hero"><div><span className="vocab-badge"><BookOpen size={17}/>Từ vựng Aptis</span><h1>Học từ vựng Aptis</h1><p>Lộ trình từ vựng B1 - B2 - C1.</p></div><div className="vocab-art" aria-hidden="true"><div className="vocab-paper back"/><div className="vocab-paper"><b>Vocabulary</b><div><span>A</span> → <span>B</span></div><i/><i/></div><span className="vocab-medal">★</span><span className="vocab-rays">╱</span></div><aside className="vocab-goal"><h2><Target size={22}/>Mục tiêu hôm nay</h2><strong>Ôn <em>{dailyGoal}</em> từ</strong><div><progress max={Math.max(1,dailyGoal)} value={dailyCount}/><small>{dailyCount} / {dailyGoal} từ</small></div></aside></header>
  <nav className="vocab-levels" aria-label="Cấp độ từ vựng">{(['B1','B2','C1'] as Level[]).map(l=><button key={l} aria-pressed={level===l} onClick={()=>setLevel(l)}><ChartNoAxesColumnIncreasing size={20}/>{l}</button>)}</nav>
  <div className="vocab-filters"><b>Lọc theo:</b><button aria-pressed={!savedOnly&&topic==='all'} onClick={()=>{setTopic('all');setSavedOnly(false);}}>Tất cả</button><label><span className="sr-only">Chủ đề</span><select value={topic} onChange={e=>setTopic(e.target.value)}><option value="all">Chủ đề</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><button onClick={()=>start(filtered,'flashcard')}><Copy size={14}/>Flashcard</button><button onClick={()=>start(filtered,'exercise')}><Pencil size={14}/>Bài tập</button><button aria-pressed={savedOnly} onClick={()=>setSavedOnly(!savedOnly)}><Bookmark size={14}/>Đã lưu{savedOnly?` (${filtered.length})`:''}</button></div>
  {notice&&<p className="vocab-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Đóng thông báo"><X size={15}/></button></p>}
  <section className="vocab-topics" aria-label="Chủ đề từ vựng">{topics.filter(t=>filtered.some(w=>w.topic===t.id)).map(t=>{const list=filtered.filter(w=>w.topic===t.id);const learned=count(list);const Icon=topicIcons[t.icon] || BookOpen;return <article key={t.id}><div className={`vocab-topic-icon ${t.id}`}><Icon size={26}/></div><div className="vocab-topic-content"><div className="vocab-card-tags"><span><Star size={11}/>{learned?'Đang học':'Chưa học'}</span><b>{level}</b></div><h2>{t.title}</h2><p>{t.description}</p></div><div className="vocab-card-meta"><span><BookOpen size={14}/>Tổng số từ: <b>{list.length} từ</b></span><small>Đã học {learned}/{list.length}</small></div><div className="vocab-progress"><progress max={list.length} value={learned}/><span>{Math.round(learned/list.length*100)}%</span></div><button className="vocab-primary" onClick={()=>start(list)}>{learned?'Ôn tập':'Học ngay'}<ArrowRight size={17}/></button></article>})}</section>
  {!filtered.length&&<div className="vocab-empty"><Bookmark size={28}/><h2>Chưa có từ vựng phù hợp</h2><p>Thử đổi cấp độ, chủ đề hoặc bỏ bộ lọc đã lưu.</p></div>}
  <div className="vocab-bottom"><section className="vocab-panel"><div className="vocab-panel-heading"><span><BookOpen/></span><div><h2>Từ hôm nay</h2><p>Học một từ vựng tiêu biểu trong lộ trình Aptis.</p></div></div>{daily?<div className="vocab-daily"><button className="vocab-circle" aria-label="Từ trước" onClick={()=>setDailyIndex(i=>(i+words.length-1)%words.length)}><ChevronLeft size={18}/></button><div className="vocab-daily-word"><h3>{daily.word}</h3><button className="vocab-pronunciation" onClick={()=>speak(daily.word)}>{daily.ipa}<Volume2 size={16}/></button><span>{daily.meaning}</span></div><div className="vocab-example"><b><Check size={14}/>Ví dụ:</b><p>{daily.example}</p><i>({daily.translation})</i></div><button className="vocab-daily-save" aria-label="Lưu từ hôm nay" aria-pressed={progress.saved.includes(daily.id)} onClick={()=>save(daily.id)}><Bookmark size={18} fill={progress.saved.includes(daily.id)?'currentColor':'none'}/></button><button className="vocab-circle" aria-label="Từ tiếp theo" onClick={()=>setDailyIndex(i=>(i+1)%words.length)}><ChevronRight size={18}/></button></div>:<p className="vocab-footnote">Chưa có từ vựng được xuất bản.</p>}</section><section className="vocab-panel"><div className="vocab-panel-heading"><span><ChartNoAxesColumnIncreasing/></span><div><h2>Tiến độ học tập</h2><p>Tổng quan quá trình học từ vựng theo từng cấp độ.</p></div></div><div className="vocab-level-progress">{(['B1','B2','C1'] as Level[]).map(l=>{const list=words.filter(w=>w.level===l);const n=count(list);return <div key={l}><b>{l}</b><span>{n} / {list.length} từ</span><progress max={Math.max(1,list.length)} value={n}/><small>{list.length?Math.round(n/list.length*100):0}%</small></div>})}</div></section></div>
  <p className="vocab-footnote">{words.length} từ thuộc {topics.length} chủ đề. Tiến độ và từ đã lưu được lưu trên trình duyệt này.</p>
  <dialog className="vocab-dialog" ref={dialog} onClick={event=>{if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)setSession(null);}} onCancel={()=>setSession(null)} onClose={()=>setSession(null)}><button className="vocab-close" aria-label="Đóng bài học" onClick={()=>setSession(null)}><X/></button>{session&&current?<><span className="vocab-badge">{mode==='flashcard'?'Flashcard':'Bài tập'} · {index+1}/{session.length} · {current.level}</span><h2>{current.word}</h2><button className="vocab-pronunciation" onClick={()=>speak(current.word)}>{current.ipa}<Volume2 size={18}/></button><button className="vocab-save-button" aria-pressed={progress.saved.includes(current.id)} onClick={()=>save(current.id)}><Bookmark size={16}/>{progress.saved.includes(current.id)?'Đã lưu':'Lưu từ'}</button>{mode==='flashcard'?<><button className="vocab-flip" onClick={()=>setRevealed(!revealed)}>{revealed?current.meaning:'Bấm để xem nghĩa'}</button>{revealed&&<div className="vocab-session-example"><p>{current.example}</p><i>{current.translation}</i></div>}<div className="vocab-session-actions"><button onClick={next}>Ôn lại sau</button><button className="vocab-primary" onClick={()=>{learn(current.id);next();}} disabled={!revealed}><Check size={17}/>Đã nhớ</button></div></>:<><p>Chọn nghĩa đúng của từ này:</p><div className="vocab-answers">{[current,...words.filter(w=>w.id!==current.id&&w.meaning.trim().toLowerCase()!==current.meaning.trim().toLowerCase()).filter((w,i,all)=>all.findIndex(x=>x.meaning.trim().toLowerCase()===w.meaning.trim().toLowerCase())===i).slice(0,3)].sort((a,b)=>a.meaning.localeCompare(b.meaning)).map(w=><button key={w.id} disabled={answer!==null} className={answer!==null&&w.id===current.id?'correct':answer===w.id?'incorrect':''} onClick={()=>{setAnswer(w.id);if(w.id===current.id)learn(current.id);}}>{w.meaning}</button>)}</div>{answer&&<><p role="status">{answer===current.id?'Chính xác!':'Chưa đúng. Đáp án: '+current.meaning}</p><p className="vocab-session-example">{current.example}</p><button className="vocab-primary" onClick={next}>Tiếp theo<ArrowRight size={17}/></button></>}</>}</>:session?<div className="vocab-session-complete"><Check size={40}/><h2>Hoàn thành lượt học!</h2><p>Bạn đã xem hết {session.length} từ. Hãy ôn lại để ghi nhớ lâu hơn.</p><button className="vocab-primary" onClick={()=>setSession(null)}>Về chủ đề</button></div>:null}</dialog>
 </main>;
}
