import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import type { Question, Test } from '../../types';
import { isPartPracticeSource, isQuestionInPart, isRandomTest, compareTestsByNaturalNumber } from '../student/Tests';
import { SpeakingCsvImport } from './SpeakingCsvImport';

type Item = Record<string, unknown>;
type Entry = { key: string; question: Question; test: Test; template: Item | null; item: Item; index: number; part: number; nested: boolean };
const value = (item: Item, ...keys: string[]) => keys.map(k => item[k]).find(v => typeof v === 'string' && v.trim()) as string || '';
function entries(test: Test, question: Question): Entry[] {
  let data: Item | null = null;
  try { const parsed = JSON.parse(question.content); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed; } catch {}
  const explicit = String(data?.template || '').match(/^SPEAKING_PART([1-4])$/i);
  const part = explicit ? Number(explicit[1]) : [1, 2, 3, 4].find(p => isQuestionInPart(question, 'SPEAKING', p, test));
  if (!part) return [];
  const nested = Array.isArray(data?.questions) && data.questions.length > 0;
  const items = nested ? data!.questions as unknown[] : [data || { question: question.content }];
  return items.map((raw, index) => ({ key: `${question.id}:${index}`, question, test, template: data, item: typeof raw === 'string' ? { question: raw } : raw as Item, index, part, nested }));
}
function payload(q: Question, content: string) { return { testId: q.testId, type: q.type, content, topic: q.topic, audioUrl: q.audioUrl, scriptText: q.scriptText, explanation: q.explanation, points: q.points, sortOrder: q.sortOrder, featured: q.featured, answers: q.answers.map(a => ({ content: a.content, correct: a.correct, sortOrder: a.sortOrder })) }; }

export function AdminSpeakingQuestions() {
  const [tests, setTests] = useState<Test[]>([]);
  const [groups, setGroups] = useState<Array<{ test: Test; questions: Question[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [part, setPart] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [testId, setTestId] = useState('');
  const [editPart, setEditPart] = useState(1);
  const [draft, setDraft] = useState<Item>({});
  const [busy, setBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  async function load() {
    setLoading(true); setError(''); setSelectedKeys(new Set());
    try {
      const all = await unwrap<Test[]>(api.get('/tests'));
      const sources = all.filter(t => isPartPracticeSource({ ...t, questionCount: Math.max(1, t.questionCount) })).filter(t => !isRandomTest(t)).filter(t => /speaking|noi/i.test(t.skillName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))).sort(compareTestsByNaturalNumber);
      const data = await Promise.all(sources.map(async test => ({ test, questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`)) })));
      setTests(sources); setGroups(data);
    } catch { setError('Không tải được câu hỏi Speaking. Vui lòng thử lại.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const allEntries = useMemo(() => groups.flatMap(g => g.questions.flatMap(q => entries(g.test, q))), [groups]);
  const filtered = allEntries.filter(e => (part === 'all' || e.part === Number(part)) && `${e.test.title} ${e.question.topic} ${JSON.stringify(e.item)}`.toLowerCase().includes(query.toLowerCase()));
  const selectedEntries = filtered.filter(e => selectedKeys.has(e.key));
  const allSelected = filtered.length > 0 && selectedEntries.length === filtered.length;
  useEffect(() => { setSelectedKeys(new Set()); }, [part, query]);
  function toggleSelection(key: string) {
    setSelectedKeys(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  async function removeSelected() {
    if (busy || !selectedEntries.length || !window.confirm(`Xóa ${selectedEntries.length} đề / câu hỏi đã chọn khỏi cả Kho Speaking và Luyện đề theo Part?`)) return;
    setBusy(true);
    let removed = 0;
    try {
      // Group siblings so each parent is updated once with all selected indices removed.
      const grouped = new Map<number, Entry[]>();
      for (const entry of selectedEntries) grouped.set(entry.question.id, [...(grouped.get(entry.question.id) || []), entry]);
      for (const siblings of grouped.values()) {
        const entry = siblings[0];
        const q = await fresh(entry);
        const indices = new Set(siblings.map(e => e.index));
        const remaining = entry.nested ? (entry.template!.questions as unknown[]).filter((_, i) => !indices.has(i)) : [];
        if (remaining.length) await unwrap(api.put(`/questions/${q.id}`, payload(q, JSON.stringify({ ...entry.template, questions: remaining, total: remaining.length }))));
        else await unwrap(api.delete(`/questions/${q.id}`));
        removed += siblings.length;
      }
      toast.success(`Đã xóa ${removed} đề / câu hỏi Speaking`);
    } catch (err) {
      toast.error(`${removed ? `Đã xóa ${removed} đề / câu hỏi. ` : ''}${err instanceof Error ? err.message : 'Không xóa được đề'}`);
    } finally {
      if (removed) notify();
      await load();
      setBusy(false);
    }
  }
  function open(e?: Entry) {
    setEditing(e || null); setCreating(!e); setEditPart(e?.part || (part === 'all' ? 1 : Number(part))); setTestId(String(e?.test.id || tests[0]?.id || ''));
    const item = e?.item || {};
    const canonical: Item = { ...item, question: value(item, 'question', 'prompt', 'content'), answer1: value(item, 'answer1', 'sampleAnswer', 'answer'), answer2: value(item, 'answer2'), urlpic1: value(item, 'urlpic1', 'urlPic1', 'url_pic1', 'url_pic_1', 'image1', 'image1Url', 'image_1', 'picture1', 'picture1Url', 'pic1', 'photo1', 'photo1Url', 'imageUrl'), urlpic2: value(item, 'urlpic2', 'urlPic2', 'url_pic2', 'url_pic_2', 'image2', 'image2Url', 'image_2', 'picture2', 'picture2Url', 'pic2', 'photo2', 'photo2Url') };
    for (let n = 1; n <= 3; n++) { canonical[`question${n}`] = value(item, `question${n}`, `question_${n}`, `q${n}`, `prompt${n}`, `prompt_${n}`, ...(n === 1 ? ['compareQuestion'] : [])); canonical[`question${n}_answer`] = value(item, `question${n}_answer`, `q${n}_answer`, `answer${n}`, `sampleAnswer${n}`); }
    if ((e?.part === 2 || e?.part === 3) && !canonical.question1) canonical.question1 = canonical.question;
    setDraft(canonical);
  }
  function change(key: string, content: string) { setDraft(d => ({ ...d, [key]: content })); }
  function notify() { window.dispatchEvent(new Event('speaking-bank-updated')); const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('speaking-bank-sync') : null; channel?.postMessage('updated'); channel?.close(); }
  async function fresh(e: Entry) {
    const latest = await unwrap<Question>(api.get(`/questions/${e.question.id}`));
    if (latest.content !== e.question.content) throw new Error('Câu hỏi đã được thay đổi ở nơi khác. Hãy tải lại trước khi lưu.');
    return latest;
  }
  async function save() {
    if (!testId || (editPart === 2 || editPart === 3 ? [1, 2, 3].some(n => !String(draft[`question${n}`] || '').trim()) : !String(draft.question || '').trim())) { toast.error('Hãy chọn bài luyện và nhập đủ câu hỏi (Q1–Q3 cho Part 2–3).'); return; }
    setBusy(true);
    try {
      const item = { ...draft };
      // Keep legacy import aliases in sync, including when an answer or URL is cleared.
      function aliases(keys: string[], canonical: string) { keys.forEach(key => { if (key in item) item[key] = item[canonical]; }); }
      for (let n = 1; n <= 2; n++) aliases([`urlPic${n}`, `url_pic${n}`, `url_pic_${n}`, `image${n}`, `image${n}Url`, `image_${n}`, `picture${n}`, `picture${n}Url`, `pic${n}`, `photo${n}`, `photo${n}Url`, ...(n === 1 ? ['imageUrl'] : [])], `urlpic${n}`);
      if (editPart === 2 || editPart === 3) {
        for (let n = 1; n <= 3; n++) { aliases([`question_${n}`, `q${n}`, `prompt${n}`, `prompt_${n}`], `question${n}`); aliases([`q${n}_answer`, `answer${n}`, `sampleAnswer${n}`], `question${n}_answer`); }
      } else { aliases(['prompt', 'content'], 'question'); aliases(['sampleAnswer', 'answer'], 'answer1'); }
      if (editing) {
        const q = await fresh(editing);
        let data: Item;
        if (editing.nested) { const items = [...editing.template!.questions as unknown[]]; items[editing.index] = item; data = { ...editing.template, questions: items, total: items.length }; }
        else data = { ...editing.template, ...item, template: `SPEAKING_PART${editPart}`, part: `Part ${editPart}` };
        await unwrap(api.put(`/questions/${q.id}`, payload(q, JSON.stringify(data))));
      } else {
        await unwrap(api.post('/questions', { testId: Number(testId), type: 'SPEAKING', topic: `Speaking Part ${editPart}`, content: JSON.stringify({ template: `SPEAKING_PART${editPart}`, part: `Part ${editPart}`, total: 1, questions: [item] }), points: 1, sortOrder: Math.max(0, ...(groups.find(g => g.test.id === Number(testId))?.questions.map(q => q.sortOrder) || [])) + 1, featured: false, answers: [] }));
      }
      notify(); setEditing(null); setCreating(false); await load(); toast.success('Đã lưu câu hỏi. Kho Speaking và Luyện đề theo Part dùng chung thay đổi này.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được câu hỏi'); } finally { setBusy(false); }
  }
  async function remove(e: Entry) {
    if (!window.confirm('Xóa đề này và các câu hỏi nhỏ khỏi cả Kho Speaking và Luyện đề theo Part?')) return;
    setBusy(true);
    try {
      const q = await fresh(e);
      if (e.nested && (e.template!.questions as unknown[]).length > 1) { const items = (e.template!.questions as unknown[]).filter((_, i) => i !== e.index); await unwrap(api.put(`/questions/${q.id}`, payload(q, JSON.stringify({ ...e.template, questions: items, total: items.length })))); }
      else await unwrap(api.delete(`/questions/${q.id}`));
      notify(); await load(); toast.success('Đã xóa đề Speaking');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không xóa được đề'); } finally { setBusy(false); }
  }
  return <section className="space-y-5"><div className="rounded-2xl border border-pink-100 bg-pink-50 p-5"><h1 className="text-2xl font-extrabold">Quản lý câu hỏi Kho Speaking</h1><p className="mt-2 text-sm text-slate-600">Dùng chung câu hỏi đã xuất bản với Luyện đề theo Part. Sửa hoặc xóa ở đây sẽ cập nhật cả hai nơi. Part 2–3 gồm một đề với ba câu hỏi nhỏ.</p><Link className="mt-3 inline-flex gap-2 text-sm font-bold text-pink-600" to="/admin/content"><BookOpen size={16} />Quản lý bài luyện / import câu hỏi</Link></div>
    <div className="flex flex-wrap gap-3"><label className="flex flex-1 items-center gap-2 rounded-xl border bg-white px-3"><Search size={17} /><input className="w-full p-3 outline-none" aria-label="Tìm câu hỏi quản trị" placeholder="Tìm câu hỏi, chủ đề, bài luyện…" value={query} onChange={e => setQuery(e.target.value)} /></label><select className="rounded-xl border bg-white p-3" aria-label="Lọc Part Speaking" value={part} onChange={e => setPart(e.target.value)}><option value="all">Tất cả Part</option>{[1, 2, 3, 4].map(p => <option key={p} value={p}>Part {p}</option>)}</select><button className="btn-secondary" disabled={busy || loading} onClick={() => void load()}><RefreshCw size={17} />Tải lại</button><button className="btn-primary" disabled={busy || loading || !tests.length} onClick={() => open()}><Plus size={17} />Thêm đề</button></div>
    <SpeakingCsvImport tests={tests} disabled={busy || loading} onBusy={setBusy} onImported={async () => { notify(); await load(); }} />
    {error && <p role="alert" className="text-red-600">{error}</p>}{loading && <p role="status">Đang tải câu hỏi…</p>}
    {!loading && !error && <div className="flex flex-wrap items-center gap-4"><p className="text-sm text-slate-500">{filtered.length} đề / câu hỏi</p><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-4 w-4 accent-pink-600" checked={allSelected} disabled={busy || !filtered.length} onChange={() => setSelectedKeys(allSelected ? new Set() : new Set(filtered.map(e => e.key)))} />Chọn tất cả kết quả ({filtered.length})</label><button className="btn-secondary text-red-600" disabled={busy || !selectedEntries.length} onClick={() => void removeSelected()}><Trash2 size={15} />Xóa đã chọn ({selectedEntries.length})</button>{selectedEntries.length > 0 && <button className="btn-secondary" disabled={busy} onClick={() => setSelectedKeys(new Set())}>Bỏ chọn</button>}</div>}
    {!loading && filtered.map(e => <article className="rounded-2xl border bg-white p-5" key={e.key}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 flex-1 items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-pink-600" aria-label={`Chọn đề ${e.test.title}, câu ${e.index + 1}`} checked={selectedKeys.has(e.key)} disabled={busy} onChange={() => toggleSelection(e.key)} /><div className="min-w-0"><p className="text-xs font-bold text-pink-600">Part {e.part} · {e.test.title}</p><h2 className="mt-2 break-words font-bold">{value(e.item, 'question1', 'question', 'prompt', 'content') || 'Đề Speaking'}</h2>{(e.part === 2 || e.part === 3) && <div className="mt-2 text-sm text-slate-500"><p>Q2: {value(e.item, 'question2', 'q2')}</p><p>Q3: {value(e.item, 'question3', 'q3')}</p></div>}</div></div><div className="flex gap-3"><button className="btn-secondary" disabled={busy} onClick={() => open(e)}><Pencil size={15} />Sửa</button><button className="btn-secondary text-red-600" disabled={busy} onClick={() => void remove(e)}><Trash2 size={15} />Xóa</button></div></div></article>)}
    {!loading && !error && !filtered.length && <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">Chưa có đề phù hợp. Import câu hỏi vào bài luyện Speaking đã xuất bản hoặc thêm đề mới.</p>}
    {(editing || creating) && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label="Chỉnh sửa đề Speaking" onSubmit={e => { e.preventDefault(); void save(); }} className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 text-slate-900"><h2 className="text-xl font-extrabold">{editing ? 'Sửa' : 'Thêm'} đề Speaking Part {editPart}</h2><label className="block text-sm font-bold">Bài luyện<select disabled={!!editing || busy} value={testId} onChange={e => setTestId(e.target.value)} className="mt-1 w-full rounded-lg border p-3">{tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>{!editing && <label className="block text-sm font-bold">Part<select value={editPart} onChange={e => setEditPart(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-3">{[1, 2, 3, 4].map(p => <option key={p} value={p}>Part {p}</option>)}</select></label>}
      {(editPart === 2 || editPart === 3) && [1, ...(editPart === 3 ? [2] : [])].map(n => <label className="block text-sm font-bold" key={`pic${n}`}>Đường dẫn ảnh {n}<input value={String(draft[`urlpic${n}`] || '')} onChange={e => change(`urlpic${n}`, e.target.value)} placeholder="https://… hoặc /images/speaking/…" className="mt-1 w-full rounded-lg border p-3" /></label>)}
      {(editPart === 2 || editPart === 3 ? [1, 2, 3] : [0]).map(n => <div key={n} className="space-y-3 rounded-xl border p-4"><label className="block text-sm font-bold">{n ? `Q${n}` : 'Câu hỏi'}<textarea required className="mt-1 w-full rounded-lg border p-3" rows={3} value={String(draft[n ? `question${n}` : 'question'] || '')} onChange={e => change(n ? `question${n}` : 'question', e.target.value)} /></label><label className="block text-sm font-bold">Đáp án mẫu{n ? ` Q${n}` : ''}<textarea className="mt-1 w-full rounded-lg border p-3 font-normal" rows={4} value={String(draft[n ? `question${n}_answer` : 'answer1'] || '')} onChange={e => change(n ? `question${n}_answer` : 'answer1', e.target.value)} /></label></div>)}
      {editPart === 1 && <label className="block text-sm font-bold">Đáp án mẫu thứ hai<textarea className="mt-1 w-full rounded-lg border p-3 font-normal" rows={4} value={String(draft.answer2 || '')} onChange={e => change('answer2', e.target.value)} /></label>}<div className="sticky bottom-0 flex justify-end gap-3 bg-white py-3"><button type="button" className="btn-secondary" disabled={busy} onClick={() => { setEditing(null); setCreating(false); }}>Hủy</button><button className="btn-primary" disabled={busy} type="submit">{busy ? 'Đang lưu…' : 'Lưu đề'}</button></div></form></div>}
  </section>;
}
