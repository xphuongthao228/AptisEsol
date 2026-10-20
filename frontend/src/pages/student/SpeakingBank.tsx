import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, Clock3, Copy, FileText, Heart, Home, Library, Mic, PanelLeftClose, PanelLeftOpen, Search, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import './writing-forms.css';
import './speaking-bank.css';
import { SpeakingStudio } from './SpeakingStudio';

type View = 'home' | 'samples' | 'answers' | 'favorites' | 'history';
type Bank = 'samples' | 'answers';
type Row = {
  id: string; part: string; topic: string; form: string; question: string; vi: string;
  targetWords: string; section: string; text: string; textVi: string; level: string; tag: string;
};
type SavedPractice = { id: string; text: string; createdAt: string };
const sections = ['opening', 'body', 'ending'];
const partLabels = ['Giới thiệu bản thân', 'Mô tả tranh', 'So sánh và thảo luận', 'Trình bày chủ đề'];
const navigation = [
  { view: 'home', label: 'Trang chủ', icon: Home },
  { view: 'samples', label: 'Kho mẫu câu', icon: Library },
  { view: 'answers', label: 'Kho đáp án', icon: BookOpen },
  { view: 'favorites', label: 'Yêu thích', icon: Star },
  { view: 'history', label: 'Lịch sử học', icon: Clock3 }
] as const;

function readSaved<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
    return Array.isArray(parsed) ? parsed as T : fallback;
  } catch { return fallback; }
}

function rowKey(bank: Bank, row: Row) {
  return JSON.stringify([bank, row.id, row.section, row.level, row.text, row.tag]);
}

export function SpeakingBank() {
  const [library, setLibrary] = useState(false);
  return library ? <><button className="speaking-return" onClick={() => setLibrary(false)}>← Trở về luyện Speaking</button><SpeakingLibrary /></> : <SpeakingStudio onOpenLibrary={() => setLibrary(true)} />;
}

function SpeakingLibrary() {
  const user = useAuthStore(state => state.user);
  const storagePrefix = `aptis-speaking-${user?.id ?? 'guest'}`;
  const [banks, setBanks] = useState<Record<Bank, Row[]>>({ samples: [], answers: [] });
  const [view, setView] = useState<View>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [part, setPart] = useState('all');
  const [topic, setTopic] = useState('all');
  const [level, setLevel] = useState('all');
  const [section, setSection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => readSaved(`${storagePrefix}-favorites`, []));
  const [history, setHistory] = useState<SavedPractice[]>(() => readSaved(`${storagePrefix}-history`, []));
  const [selected, setSelected] = useState<Array<{ key: string; row: Row }>>([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setFavorites(readSaved(`${storagePrefix}-favorites`, []));
    setHistory(readSaved(`${storagePrefix}-history`, []));
    setSelected([]);
  }, [storagePrefix]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      unwrap<Row[]>(api.get('/speaking-bank/samples')),
      unwrap<Row[]>(api.get('/speaking-bank/answers'))
    ]).then(([samples, answers]) => {
      if (!cancelled) setBanks({ samples, answers });
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được kho Speaking.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    const refresh = () => setReload(value => value + 1);
    window.addEventListener('speaking-bank-updated', refresh);
    window.addEventListener('focus', refresh);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('speaking-bank-sync') : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      window.removeEventListener('speaking-bank-updated', refresh);
      window.removeEventListener('focus', refresh);
      channel?.close();
    };
  }, []);

  function persist(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { toast.error('Trình duyệt không lưu được dữ liệu. Dữ liệu vẫn dùng được trong phiên này.'); }
  }

  function toggleFavorite(key: string) {
    const next = favorites.includes(key) ? favorites.filter(item => item !== key) : [...favorites, key];
    setFavorites(next);
    persist(`${storagePrefix}-favorites`, next);
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); }
    catch { toast.error('Không sao chép được. Bạn có thể chọn và sao chép nội dung trực tiếp.'); }
  }

  function changeView(next: View) {
    setView(next); setQuery(''); setPart('all'); setTopic('all'); setLevel('all'); setSection('all');
  }

  const allRows = useMemo(() => (['samples', 'answers'] as Bank[]).flatMap(bank =>
    banks[bank].map(row => ({ key: rowKey(bank, row), row, bank }))
  ), [banks]);
  const source = allRows.filter(item => view === 'favorites' ? favorites.includes(item.key) : item.bank === (view === 'answers' ? 'answers' : 'samples'));
  const topics = [...new Set(source.filter(({ row }) => part === 'all' || row.part === part).map(({ row }) => row.topic))].sort();
  const levels = [...new Set(source.map(({ row }) => row.level).filter(Boolean))].sort();
  const keyword = query.trim().toLowerCase();
  const filtered = source.filter(({ row }) => (part === 'all' || row.part === part)
    && (topic === 'all' || row.topic === topic) && (level === 'all' || row.level === level)
    && (section === 'all' || row.section === section)
    && (!keyword || [row.topic, row.question, row.vi, row.text, row.textVi, row.tag].join(' ').toLowerCase().includes(keyword)));
  const groups = new Map<string, typeof filtered>();
  filtered.forEach(item => {
    const key = `${item.bank}:${item.row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  const practiceText = selected.map(item => item.row.text).join('\n\n');

  return (
    <div id="speaking-bank-page" className="writing-bank-page speaking-bank-page -mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-[#f6f8fc] text-[#101a3d] sm:-mx-6 sm:-my-8 lg:-mx-10">
      <div className={`writing-bank-layout grid min-h-[calc(100vh-4rem)] w-full lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)] ${sidebarOpen ? '' : 'writing-bank-sidebar-hidden'}`}>
        <aside id="writing-bank-sidebar" hidden={!sidebarOpen} className="border-r border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-white"><Mic size={27} /></span><div><h1 className="text-lg font-black">Aptis Lingo</h1><p className="text-sm font-bold text-slate-500">Speaking</p></div></div>
          <nav aria-label="Kho Speaking" className="mt-5 space-y-1">
            {navigation.map(item => <button key={item.view} type="button" onClick={() => changeView(item.view)} aria-current={view === item.view ? 'page' : undefined} className={`flex h-10 w-full items-center gap-3 rounded-xl px-4 text-left text-[13px] font-extrabold ${view === item.view ? 'bg-pink-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'}`}><item.icon size={19} />{item.label}</button>)}
          </nav>
          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-[13px] font-black">Part Speaking</p>
            {partLabels.map((label, index) => <button key={label} type="button" onClick={() => { setView(view === 'answers' ? 'answers' : 'samples'); setPart(`Speaking Part ${index + 1}`); setTopic('all'); }} className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-bold ${part === `Speaking Part ${index + 1}` ? 'bg-pink-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={17} className="shrink-0" /><span><span className="block">Part {index + 1}</span><span className="text-xs font-medium">{label}</span></span></button>)}
          </div>
        </aside>

        <main className="min-w-0 space-y-5 px-4 py-5 sm:px-6 lg:px-8">
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" onClick={() => setSidebarOpen(value => !value)} aria-expanded={sidebarOpen} aria-controls="writing-bank-sidebar">{sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}{sidebarOpen ? 'Ẩn danh mục' : 'Hiện danh mục'}</button>
          <header className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-widest text-rose-500">Luyện nói mỗi ngày</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Kho đề Speaking</h1><p className="mt-2 text-sm text-slate-500">Mẫu câu linh hoạt · Đáp án theo chủ đề · Luyện tập theo Part</p></div><Mic size={40} className="shrink-0 text-rose-400" /></header>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" className="ml-3 font-bold underline" onClick={() => setReload(value => value + 1)}>Thử lại</button></div>}
          {loading && <p role="status" className="text-sm text-slate-500">Đang tải kho Speaking…</p>}

          {view === 'home' ? <>
            <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-pink-50 to-white p-6 sm:p-8"><p className="text-sm font-extrabold text-rose-600">Sẵn sàng luyện Speaking?</p><h2 className="mt-3 text-2xl font-black">Chọn chủ đề, xây dựng câu trả lời của bạn</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Khám phá mẫu câu, tham khảo đáp án theo trình độ và lưu lại những cách diễn đạt yêu thích.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => changeView('samples')} className="btn-primary"><Library size={18} />Kho mẫu câu</button><button type="button" onClick={() => changeView('answers')} className="btn-secondary"><BookOpen size={18} />Kho đáp án</button></div></section>
            <section className="grid gap-4 sm:grid-cols-3">{[{ label: 'Mẫu câu', value: banks.samples.length }, { label: 'Đáp án', value: banks.answers.length }, { label: 'Chủ đề', value: new Set(allRows.map(item => item.row.topic)).size }].map(stat => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-500">{stat.label}</p><p className="mt-2 text-3xl font-black text-rose-500">{stat.value}</p></div>)}</section>
            <section className="grid gap-4 md:grid-cols-2">{partLabels.map((label, index) => <button key={label} type="button" onClick={() => { changeView('answers'); setPart(`Speaking Part ${index + 1}`); }} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-rose-300"><span className="text-xs font-black text-rose-500">SPEAKING PART {index + 1}</span><h2 className="mt-2 text-lg font-black">{label}</h2><p className="mt-2 text-sm text-slate-500">Xem câu hỏi và đáp án <ChevronDown className="inline -rotate-90" size={15} /></p></button>)}</section>
          </> : view === 'history' ? <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Lịch sử học</h2><p className="mt-1 text-sm text-slate-500">Các bài nói bạn đã ghép và lưu trên trình duyệt này.</p><div className="mt-5 space-y-4">{history.filter(item => !keyword || item.text.toLowerCase().includes(keyword)).map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.text}</p><button type="button" onClick={() => void copy(item.text, item.id)} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-600"><Copy size={15} />{copied === item.id ? 'Đã chép' : 'Sao chép'}</button></article>)}{!history.length && <p className="py-10 text-center text-sm text-slate-500">Chưa có bài nói đã lưu. Chọn mẫu câu để ghép bài và lưu vào lịch sử.</p>}</div></section> : <>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">{navigation.find(item => item.view === view)?.label}</h2><span className="text-xs font-bold text-slate-500">{groups.size} câu hỏi · {filtered.length} câu trả lời</span></div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><Search size={18} className="text-slate-400" /><input aria-label="Tìm kiếm kho Speaking" className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm chủ đề, câu hỏi, mẫu câu…" /></label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <select aria-label="Part" value={part} onChange={event => { setPart(event.target.value); setTopic('all'); }} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="all">Tất cả Part</option>{partLabels.map((_, index) => <option key={index} value={`Speaking Part ${index + 1}`}>Speaking Part {index + 1}</option>)}</select>
                <select aria-label="Chủ đề" value={topic} onChange={event => setTopic(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="all">Tất cả chủ đề</option>{topics.map(value => <option key={value}>{value}</option>)}</select>
                <select aria-label="Trình độ" value={level} onChange={event => setLevel(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="all">Tất cả trình độ</option>{levels.map(value => <option key={value}>{value}</option>)}</select>
                <select aria-label="Phần câu trả lời" value={section} onChange={event => setSection(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="all">Tất cả phần trả lời</option><option value="opening">Mở đầu</option><option value="body">Triển khai ý</option><option value="ending">Kết ý</option></select>
              </div>
            </section>
            <div className={`grid gap-5 ${view === 'samples' ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
              <section className="min-w-0 space-y-4">
                {[...groups.entries()].map(([key, items]) => { const prompt = items[0].row; return <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap gap-2"><span className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">{prompt.part}</span><span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{prompt.topic}</span>{prompt.targetWords && <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Clock3 size={14} />{prompt.targetWords}</span>}</div><h3 className="mt-4 text-lg font-black">{prompt.question}</h3>{prompt.vi && <p className="mt-2 text-sm text-slate-500">{prompt.vi}</p>}<div className="mt-4 space-y-3">{[...items].sort((a, b) => sections.indexOf(a.row.section) - sections.indexOf(b.row.section)).map(({ row, key: answerKey }, index) => <div key={`${answerKey}:${index}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex flex-wrap gap-2 text-xs font-bold text-rose-500"><span>{row.level}</span><span className="break-words text-slate-500">{row.tag}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{row.text}</p>{row.textVi && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{row.textVi}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void copy(row.text, answerKey)} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><Copy size={15} />{copied === answerKey ? 'Đã chép' : 'Chép'}</button><button type="button" aria-pressed={favorites.includes(answerKey)} onClick={() => toggleFavorite(answerKey)} className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600"><Heart size={15} className={favorites.includes(answerKey) ? 'fill-current' : ''} />{favorites.includes(answerKey) ? 'Đã thích' : 'Yêu thích'}</button>{view === 'samples' && <button type="button" aria-pressed={selected.some(item => item.key === answerKey)} onClick={() => setSelected(current => current.some(item => item.key === answerKey) ? current.filter(item => item.key !== answerKey) : [...current, { key: answerKey, row }])} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600"><Check size={15} />{selected.some(item => item.key === answerKey) ? 'Bỏ chọn' : 'Ghép bài'}</button>}</div></div>)}</div></article>; })}
                {!loading && !filtered.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><BookOpen className="mx-auto text-rose-400" size={30} /><h3 className="mt-4 font-black">{view === 'favorites' ? 'Chưa có câu yêu thích phù hợp' : source.length ? 'Chưa có nội dung phù hợp bộ lọc' : 'Kho Speaking chưa có dữ liệu'}</h3><p className="mt-2 text-sm text-slate-500">{view === 'favorites' ? 'Bấm Yêu thích ở mẫu câu hoặc đáp án để lưu tại đây.' : source.length ? 'Thử đổi Part, chủ đề hoặc từ khóa tìm kiếm.' : 'Nội dung sẽ xuất hiện sau khi quản trị viên import kho Speaking.'}</p></div>}
              </section>
              {view === 'samples' && <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-5"><h2 className="font-black">Bài nói của bạn</h2><p className="mt-2 text-xs leading-5 text-slate-500">Chọn mẫu câu theo thứ tự bạn muốn trình bày.</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{practiceText || 'Chọn “Ghép bài” ở các mẫu câu để bắt đầu.'}</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={!selected.length} onClick={() => { const item = { id: crypto.randomUUID(), text: practiceText, createdAt: new Date().toISOString() }; const next = [item, ...history].slice(0, 50); setHistory(next); persist(`${storagePrefix}-history`, next); toast.success('Đã lưu bài nói vào lịch sử'); }} className="btn-primary disabled:opacity-40">Lưu bài nói</button><button type="button" disabled={!selected.length} onClick={() => setSelected([])} className="btn-secondary disabled:opacity-40">Xóa chọn</button></div></aside>}
            </div>
          </>}
        </main>
      </div>
    </div>
  );
}
