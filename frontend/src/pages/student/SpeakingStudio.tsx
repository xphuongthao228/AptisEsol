import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, Copy, Headphones, Library, Lightbulb, Maximize, Menu, Mic, PenLine, Play, RotateCcw, Search, Sparkles, Square, Timer, Volume2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import './speaking-studio.css';
import { mergeSpeakingBank, type SpeakingBankRow } from './speaking-bank-prompts';
import type { Question, Test } from '../../types';
import { isPartPracticeSource, isRandomTest, compareTestsByNaturalNumber } from './Tests';
import { speakingPracticePrompts, type SpeakingPracticePrompt } from './speaking-practice-data';

type Row = SpeakingBankRow;
type Step = [string, string, string, string];
const labels = ['Trả lời câu hỏi cá nhân', 'Miêu tả một bức tranh', 'So sánh hai bức tranh', 'Trả lời câu hỏi dài'];
const forms: Step[][] = [
  [['Trả lời trực tiếp', 'Nêu hoạt động bạn thường làm.', 'I usually', 'read books in my free time'], ['Giải thích lý do', 'Vì sao bạn thích hoạt động đó?', 'because', 'it helps me relax and learn new things'], ['Đưa ví dụ', 'Cho ví dụ cụ thể.', 'For example,', 'I often read novels before going to bed'], ['Mở rộng (tùy chọn)', 'Thêm cảm xúc hoặc lợi ích.', 'As a result,', 'I feel happier and more relaxed']],
  [['Giới thiệu bức tranh', 'Trong tranh, tôi có thể nhìn thấy…', 'In the picture, I can see', 'a group of people'], ['Miêu tả người', 'Có những ai trong tranh?', 'There are', 'some young people'], ['Miêu tả hành động', 'Họ đang làm gì?', 'They are', 'spending time together'], ['Miêu tả địa điểm', 'Họ đang ở đâu?', 'They seem to be in', 'an outdoor area'], ['Miêu tả cảm xúc', 'Họ cảm thấy thế nào?', 'They look', 'happy and relaxed'], ['Nhận xét chung', 'Bạn nhận xét gì về bức tranh?', 'Overall, I think this picture', 'shows a lovely moment']],
  [['Giới thiệu chung', 'Nói về điểm giống nhau của hai bức tranh.', 'Both pictures show', 'people doing everyday activities'], ['Miêu tả tranh thứ nhất', 'Nói chi tiết về bức tranh thứ nhất.', 'In the first picture, I can see', 'people spending time together'], ['Miêu tả tranh thứ hai', 'Nói chi tiết về bức tranh thứ hai.', 'In the second picture, I can see', 'a different way of spending time'], ['So sánh và nêu khác biệt', 'Nêu điểm khác nhau giữa hai bức tranh.', 'The main difference is that', 'the settings and activities are different'], ['Sở thích cá nhân', 'Bạn thích bức tranh nào hơn?', 'Personally, I prefer', 'the first picture'], ['Lý do và ví dụ', 'Giải thích lý do và đưa ví dụ.', 'This is because', 'I enjoy being with other people']],
  [['Mở đầu – Giới thiệu chủ đề', 'Nói bạn sẽ nói về điều gì.', "I’d like to talk about", 'a memorable trip I had'], ['Bối cảnh và thời gian', 'Chuyện diễn ra khi nào và ở đâu?', 'I went to', 'Da Nang last summer'], ['Đi cùng ai', 'Bạn đi với ai?', 'I went there with', 'my family'], ['Trải nghiệm và hoạt động', 'Bạn đã làm gì ở đó?', 'We', 'visited beautiful beaches and tried local food'], ['Lý do đáng nhớ', 'Điều gì khiến chuyến đi đáng nhớ?', 'What made it special was', 'the time I spent with my family'], ['Kết luận và cảm xúc', 'Cảm nhận và bài học.', 'Overall, it was a wonderful experience because', 'I could relax and create unforgettable memories']]
];
const questions = ['What do you usually do in your free time?', 'Describe this picture.', 'Compare these two pictures.', 'Tell me about a time when you had a memorable trip.'];
const showSidebarLibrary = false;
const translations = ['Bạn thường làm gì trong thời gian rảnh?', 'Hãy miêu tả bức tranh và trả lời câu hỏi.', 'Hãy so sánh hai bức tranh và trả lời câu hỏi.', 'Hãy kể về một chuyến đi đáng nhớ của bạn.'];
const followUpForm: Step[] = [['Trả lời trực tiếp', 'Trả lời đúng trọng tâm câu hỏi.', 'I think', ''], ['Giải thích lý do', 'Giải thích lý do cho câu trả lời của bạn.', 'One reason is that', ''], ['Đưa ví dụ', 'Nêu một ví dụ hoặc trải nghiệm thực tế.', 'For example,', ''], ['Kết luận', 'Tóm lại ý kiến hoặc cảm nhận của bạn.', 'Overall,', '']];
const vocabulary = [['read books', 'watch films', 'play sports', 'listen to music', 'cook', 'travel', 'relax', 'take photos'], ['people', 'in the background', 'outdoors', 'together', 'happy', 'relaxed', 'sunny', 'activity'], ['both pictures', 'whereas', 'in contrast', 'similar', 'different', 'prefer', 'together', 'alone'], ['destination', 'trip', 'travel', 'memorable', 'experience', 'beautiful', 'local food', 'scenery']];

export function SpeakingStudio({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const user = useAuthStore(s => s.user);
  const [part, setPart] = useState(0);
  const [level, setLevel] = useState('B1');
  const [advanced, setAdvanced] = useState(false);
  const [index, setIndex] = useState(0);
  const [subSelection, setSubSelection] = useState({ groupId: '', index: 0 });
  const drafts = useRef(new Map<string, string[]>());
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [practicePrompts, setPracticePrompts] = useState<SpeakingPracticePrompt[]>([]);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [bankFailed, setBankFailed] = useState(false);
  const [values, setValues] = useState<string[]>(forms[0].map(s => s[3]));
  const [hints, setHints] = useState(true);
  const [savedOpen, setSavedOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const storageKey = `aptis-speaking-${user?.id ?? 'guest'}-studio`;
  const [saved, setSaved] = useState<Array<{ text: string; question: string; level: string }>>([]);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const defaultDuration = part === 0 ? 30 : part === 3 ? 120 : 45;
  const [remaining, setRemaining] = useState(defaultDuration);
  const [preparing, setPreparing] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; recorder.current?.state === 'recording' && recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); window.speechSynthesis?.cancel(); }; }, []);
  useEffect(() => { if (!audioUrl) return; return () => URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { try { const data = JSON.parse(localStorage.getItem(storageKey) || '[]'); setSaved(Array.isArray(data) ? data : []); } catch { setSaved([]); } }, [storageKey]);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false); setBankFailed(false);
    // Sample-bank availability must not prevent loading imported practice questions.
    Promise.allSettled([unwrap<Row[]>(api.get('/speaking-bank/samples')), unwrap<Row[]>(api.get('/speaking-bank/answers'))]).then(results => {
      if (active) setBankFailed(results.some(result => result.status === 'rejected'));
      if (active) setRows(results.flatMap((r, index) => r.status === 'fulfilled' ? r.value.map(row => ({ ...row, bank: index === 0 ? 'samples' as const : 'answers' as const })) : []));
    });
    unwrap<Test[]>(api.get('/tests')).then(async tests => {
      const sources = tests.filter(isPartPracticeSource).filter(t => !isRandomTest(t))
        .filter(t => /speaking|noi/i.test(t.skillName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
        .sort(compareTestsByNaturalNumber);
      const groups = await Promise.all(sources.map(async test => speakingPracticePrompts(test, await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`)))));
      if (active) setPracticePrompts(groups.flat());
    }).catch(() => { if (active) { setFailed(true); setPracticePrompts([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    const refresh = () => setReload(n => n + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('speaking-bank-updated', refresh);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('speaking-bank-sync') : null;
    if (channel) channel.onmessage = refresh;
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('speaking-bank-updated', refresh); channel?.close(); };
  }, []);
  const enrichedPrompts = useMemo(() => mergeSpeakingBank(practicePrompts, rows), [practicePrompts, rows]);
  const prompts = useMemo(() => enrichedPrompts.filter(r => r.part === `Speaking Part ${part + 1}` && (!query || `${r.question} ${r.topic} ${r.vi} ${r.source} ${r.subQuestions?.map(q => q.question).join(' ') || ''}`.toLowerCase().includes(query.toLowerCase()))), [enrichedPrompts, part, query]);
  const group = prompts[index % Math.max(1, prompts.length)];
  const subIndex = subSelection.groupId === group?.id ? subSelection.index : 0;
  const subQuestion = group?.subQuestions?.[subIndex];
  const prompt = group && { ...group, ...(subQuestion || {}), id: subQuestion ? `${group.id}:q${subIndex + 1}` : group.id };
  const draftKey = prompt ? `${prompt.id}:${level}` : '';
  const importedForms = prompt?.formsByLevel?.[level];
  const activeForms = importedForms?.length ? importedForms : prompt?.forms;
  const duration = prompt?.duration || defaultDuration;
  const questionText = prompt?.question || questions[part];
  const questionLines = questionText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const part4Questions = part === 3 ? (questionLines.length > 1 ? questionLines : questionText.match(/[^?]+(?:\?|$)/g)?.map(line => line.trim()).filter(Boolean) || [questionText]) : [];
  const steps = useMemo<Step[]>(() => activeForms?.length ? activeForms.map(step => [step.title + (step.is_optional ? ' (tùy chọn)' : ''), step.hint_vi || '', '', step.suggested_answer]) : (part === 1 || part === 2) && subIndex > 0 ? followUpForm : prompt ? forms[part].map(step => [step[0], '', step[2], '']) : forms[part], [activeForms, part, subIndex, !!prompt]);
  const ideaHints = (prompt?.ideas?.length ? prompt.ideas : steps.map(s => s[1])).filter(Boolean);
  const vocabularyHints = prompt ? prompt.vocabulary || [] : vocabulary[part];
  const fullText = steps.map((s, i) => `${s[2]} ${values[i] || '…'}`.trim().replace(/[.!?]+$/g, '')).join('. ') + '.';
  const importedSample = prompt?.levelSamples?.[level];
  const samples = importedSample ? [{ text: importedSample }] : rows.filter(r => r.bank === 'answers' && r.part === prompt?.part && r.question.trim().toLowerCase() === prompt?.question.trim().toLowerCase() && r.level === level);
  useEffect(() => { setValues(drafts.current.get(draftKey) || steps.map(s => s[3])); setRemaining(duration); setPreparing(false); setAudioUrl(''); }, [part, draftKey, steps, duration]);
  useEffect(() => { if (!recording && !preparing) return; const timer = window.setInterval(() => setRemaining(n => Math.max(0, n - 1)), 1000); return () => clearInterval(timer); }, [recording, preparing]);
  useEffect(() => { if (remaining !== 0) return; if (recording) recorder.current?.stop(); if (preparing) { setPreparing(false); setRemaining(duration); toast.success('Hết thời gian chuẩn bị. Bạn có thể bắt đầu ghi âm.'); } }, [remaining, recording, preparing, duration]);
  function speak(text: string) { if (!('speechSynthesis' in window)) { toast.error('Trình duyệt không hỗ trợ đọc văn bản.'); return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-GB'; utterance.rate = .88; window.speechSynthesis.speak(utterance); }
  async function record() {
    if (recording) { recorder.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast.error('Ghi âm cần trình duyệt hỗ trợ và kết nối HTTPS hoặc localhost.'); return; }
    setRequesting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const rec = new MediaRecorder(media); const chunks: Blob[] = []; recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => { media.getTracks().forEach(t => t.stop()); if (alive.current) { setRecording(false); setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))); } };
      rec.onerror = () => { media.getTracks().forEach(t => t.stop()); setRecording(false); toast.error('Không thể ghi âm. Vui lòng thử lại.'); };
      window.speechSynthesis?.cancel(); setPreparing(false); setRemaining(duration); rec.start(); setRecording(true);
    } catch { stream.current?.getTracks().forEach(t => t.stop()); toast.error('Không mở được micro. Hãy kiểm tra quyền truy cập micro.'); } finally { if (alive.current) setRequesting(false); }
  }
  function reset() { if (recording) recorder.current?.stop(); setPreparing(false); setRemaining(duration); setAudioUrl(''); if (prompt) drafts.current.delete(draftKey); setValues(steps.map(s => s[3])); }
  function save() { const next = [{ text: fullText, question: prompt?.question || questions[part], level }, ...saved].slice(0, 50); try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(next); toast.success('Đã lưu bài nói trên trình duyệt này'); } catch { toast.error('Không thể lưu bài. Bộ nhớ trình duyệt có thể đã đầy.'); } }
  async function copy() { try { await navigator.clipboard.writeText(fullText); toast.success('Đã sao chép bài nói'); } catch { toast.error('Không thể sao chép. Bạn có thể chọn văn bản để sao chép.'); } }
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <div ref={root} id="speaking-studio" className="speaking-studio">
    <button className="ss-menu-toggle" aria-expanded={sidebarOpen} aria-controls="ss-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={19} /> : <Menu size={19} />}Danh mục Speaking</button>
    <aside id="ss-sidebar" className={`ss-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <Link to="/app" className="ss-brand"><span><PenLine size={27} /></span><b>Aptis<br />Lingo</b></Link>
      <nav aria-label="Điều hướng luyện Speaking">
        <div className="ss-nav-section"><Mic size={19} /><b>Speaking</b><ChevronRight size={16} /></div>
        <div className="ss-subnav">
          {labels.map((label, i) => <button key={label} disabled={recording || requesting} aria-current={part === i ? 'page' : undefined} className={part === i ? 'active' : ''} onClick={() => { setPart(i); setIndex(0); setSavedOpen(false); setSidebarOpen(false); }}>Speaking Part {i + 1}</button>)}
          {showSidebarLibrary && <>
            <button disabled={recording || requesting} onClick={onOpenLibrary}><Library size={15} />Kho mẫu câu & đáp án</button>
            <button className={savedOpen ? 'active' : ''} onClick={() => { setSavedOpen(true); setSidebarOpen(false); window.setTimeout(() => root.current?.querySelector('.ss-saved-toggle')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0); }}><Bookmark size={15} />Bài đã lưu <span>{saved.length}</span></button>
          </>}
        </div>
      </nav>
    </aside>
    <main className="ss-main">
    <div className="ss-topline"><span>Speaking <ChevronRight size={14} /> Part {part + 1} <ChevronRight size={14} /><b>{prompt?.topic || labels[part]}</b></span><button onClick={onOpenLibrary}><BookOpen size={16} /> Kho mẫu câu & đáp án</button></div>
    <div className="ss-heading"><div><h1>Phát triển câu trả lời Speaking Aptis</h1><p>Học theo form – Thay nội dung – Tự động ghép bài nói</p></div><label className="ss-search"><Search size={19} /><input aria-label="Tìm câu hỏi Speaking" placeholder="Tìm câu hỏi, chủ đề…" value={query} onChange={e => { setQuery(e.target.value); setIndex(0); }} /></label></div>
    <div className="ss-toolbar"><div className="ss-parts">{labels.map((label, i) => <button disabled={recording || requesting} className={part === i ? 'active' : ''} key={label} onClick={() => { setPart(i); setIndex(0); setSavedOpen(false); }}><b>Part {i + 1}</b><small>{label}</small></button>)}</div><div className="ss-levels">{['B1', 'B2', 'C1'].map((l, i) => <button disabled={recording || requesting} className={level === l ? 'active' : ''} onClick={() => setLevel(l)} key={l}><b>{l}</b><small>{['Cơ bản', 'Trung cấp', 'Nâng cao'][i]}</small></button>)}</div></div>
    {loading && <p role="status" className="ss-notice">Đang tải câu hỏi từ kho Speaking…</p>}
    {bankFailed && <p role="alert" className="ss-notice">Chưa tải được kho mẫu câu và đáp án Speaking. <button onClick={() => setReload(n => n + 1)}>Thử lại</button></p>}
    {failed && <p role="alert" className="ss-notice">Chưa tải được câu hỏi từ Luyện đề theo Part. <button onClick={() => setReload(n => n + 1)}>Thử lại</button></p>}
    {!loading && !failed && !prompt && <p className="ss-notice">{query ? 'Không tìm thấy câu hỏi phù hợp.' : part === 1 ? 'Chưa có dữ liệu Speaking Part 2. Hãy import vào kho mẫu câu hoặc kho đáp án Speaking Part 2 để bắt đầu luyện.' : 'Part này chưa có câu Speaking đã import và xuất bản trong Luyện đề theo Part. Bạn có thể luyện form bên dưới trong khi chờ bổ sung câu hỏi.'}</p>}
    {(part !== 1 || prompt) && <div className="ss-columns"><section className="ss-card ss-question"><div className="ss-question-nav"><b><Mic size={17} /> {prompt ? `${group?.subQuestions ? 'Đề' : 'Câu hỏi'} ${index % prompts.length + 1}/${prompts.length}` : 'Bài luyện minh họa'}</b><div><button aria-label="Câu hỏi trước" disabled={recording || requesting || prompts.length < 2} onClick={() => setIndex((index + prompts.length - 1) % prompts.length)}><ChevronLeft size={19} /></button><button aria-label="Câu hỏi tiếp" disabled={recording || requesting || prompts.length < 2} onClick={() => setIndex((index + 1) % prompts.length)}><ChevronRight size={19} /></button></div></div>
      <span className="ss-topic">{prompt?.topic || ['Sở thích và thói quen', 'Miêu tả bức tranh', 'So sánh hai bức tranh', 'Kể trải nghiệm'][part]}</span>
      {!!group?.subQuestions?.length && <div className="ss-subquestions" role="tablist" aria-label="Câu hỏi nhỏ">{group.subQuestions.map((q, i) => <button key={i} id={`ss-q-tab-${i}`} role="tab" aria-selected={subIndex === i} aria-controls="ss-question-panel" disabled={recording || requesting} className={subIndex === i ? 'active' : ''} onClick={() => { setSubSelection({ groupId: group.id, index: i }); window.speechSynthesis?.cancel(); }}><b>Q{i + 1}</b><span>{i === 0 ? (part === 1 ? 'Mô tả tranh' : 'So sánh tranh') : i === 1 ? 'Câu hỏi liên quan' : 'Nêu ý kiến'}</span></button>)}</div>}
      {group?.subQuestions && <p className="ss-muted">Câu hỏi nhỏ {subIndex + 1}/{group.subQuestions.length} · {duration} giây mỗi câu</p>}
      {part4Questions.length > 1 ? <div className="ss-part4-questions" id="ss-question-panel"><div className="ss-part4-heading"><h2>Trả lời các câu hỏi sau</h2><span>2 phút cho toàn bộ bài nói</span></div><ol>{part4Questions.map((question, i) => <li key={i}><span className="ss-part4-number">Q{i + 1}</span><p>{question}</p><button type="button" aria-label={`Nghe câu hỏi ${i + 1}`} onClick={() => speak(question)}><Volume2 size={18} /></button></li>)}</ol></div> : <div className="ss-question-title" id="ss-question-panel" role={group?.subQuestions ? 'tabpanel' : undefined} aria-labelledby={group?.subQuestions ? `ss-q-tab-${subIndex}` : undefined}><h2>{questionText}</h2><button aria-label="Nghe câu hỏi" onClick={() => speak(questionText)}><Volume2 size={20} /></button></div>}<p className="ss-translation">{prompt ? prompt.vi : translations[part]}</p>
      {prompt && <p className="ss-muted">Nguồn: Luyện đề theo Part · {prompt.source}</p>}
      {!!prompt?.images.length && <section className="ss-picture-section" aria-label={part === 2 ? 'Hai bức tranh để so sánh' : 'Tranh miêu tả'}>{part === 2 && <h3>So sánh hai bức tranh</h3>}<div className={`ss-pictures ${part === 2 ? 'pair' : ''}`}>{prompt.images.map((src, i) => <SpeakingPicture key={`${group?.id}:${src}:${i}`} src={src} fallback={prompt.imageFallbacks?.[i]} number={i + 1} />)}</div></section>}
      {(part === 1 || part === 2) && prompt && !prompt.images.length && <p className="ss-notice">Đề này chưa có ảnh trong kho Speaking.</p>}
      <div className="ss-instruction">{part === 3 ? 'Bạn có 1 phút chuẩn bị và 2 phút để nói. Hãy phát triển câu trả lời với lý do và ví dụ.' : `Hãy trả lời trong khoảng ${duration} giây. Dùng các bước bên phải để xây dựng bài nói của bạn.`}</div>
      <div className="ss-recorder"><div className="ss-clock"><Timer size={33} /><div><small>{preparing ? 'Thời gian chuẩn bị' : 'Thời gian luyện nói'}</small><strong>{time}</strong></div><progress max={preparing ? 60 : duration} value={remaining} /></div><button className={`ss-record ${recording ? 'recording' : ''}`} disabled={requesting} onClick={() => void record()}>{recording ? <Square size={26} /> : <Mic size={29} />}<small>{requesting ? 'Đang mở micro…' : recording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}</small></button><button disabled={!audioUrl || recording} onClick={() => void audio.current?.play().catch(() => toast.error('Không phát được bản ghi.'))}><Play size={23} /><small>Nghe lại</small></button><button disabled={recording || requesting} onClick={reset}><RotateCcw size={23} /><small>Làm lại</small></button></div>
      {audioUrl && <audio ref={audio} src={audioUrl} controls className="ss-audio" />}
      {part === 3 && <button className="ss-prepare" disabled={recording || requesting} onClick={() => { setRemaining(60); setPreparing(true); }}> <Timer size={17} /> Bắt đầu 1 phút chuẩn bị</button>}
      <div className="ss-extra-actions"><button aria-pressed={hints} onClick={() => setHints(!hints)}><Lightbulb size={17} />{hints ? 'Ẩn gợi ý' : 'Hiện gợi ý'}</button><button onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen?.().catch(() => toast.error('Không thể mở toàn màn hình.')); }}><Maximize size={16} />Toàn màn hình</button></div>
      {hints && <><div className="ss-ideas"><h3><Lightbulb size={22} />Ý tưởng trả lời (bằng tiếng Việt)</h3><ul>{ideaHints.map((hint, i) => <li key={i}>{hint}</li>)}</ul></div><div className="ss-vocabulary"><h3><BookOpen size={21} />Từ vựng gợi ý <small>Bấm để nghe</small></h3><div>{vocabularyHints.map(v => <button key={v} onClick={() => speak(v)}>{v}</button>)}</div></div></>}
    </section>
    <section className="ss-card ss-builder"><div className="ss-builder-heading"><h3><Sparkles size={23} />Các bước phát triển câu trả lời</h3><div><button className={!advanced ? 'active' : ''} onClick={() => setAdvanced(false)}>Form cơ bản</button><button className={advanced ? 'active' : ''} onClick={() => setAdvanced(true)}>Form nâng cao</button></div></div>
      {prompt && !activeForms?.length && <p role="status" className="ss-instruction">Chưa có mẫu hướng dẫn cho câu hỏi này. Bạn có thể tự viết câu trả lời bên dưới.</p>}
      {advanced && <p className="ss-instruction">Phát triển mỗi ý bằng một chi tiết cụ thể, lý do hoặc ví dụ. Kết hợp câu với although, whereas hoặc which khi phù hợp.</p>}
      <div className="ss-steps">{steps.map((s, i) => <div className="ss-step" key={`${part}-${i}`}><span className="ss-number">{i + 1}</span><div className="ss-step-label"><b>{s[0]}</b><p>{s[1]}</p><em>{s[2]} …</em></div><div className="ss-step-input"><div><AutoGrowingTextarea rows={2} aria-label={`${s[0]}: ${s[2]}`} value={values[i] || ''} onChange={e => { const next = values.map((v, n) => n === i ? e.target.value : v); setValues(next); if (prompt) drafts.current.set(draftKey, next); }} /><button aria-label={`Nghe bước ${i + 1}`} onClick={() => speak(`${s[2]} ${values[i]}`)}><Volume2 size={18} /></button></div><details><summary>Gợi ý cách triển khai</summary><p>{activeForms?.[i]?.expansion_hint_vi || (advanced ? 'Thêm một trải nghiệm thực tế và giải thích tác động của nó. ' : 'Thay phần nội dung bằng ý của bạn. ')} Ví dụ: {s[2]} {s[3]}.</p></details></div></div>)}</div>
      <div className="ss-result"><div className="ss-result-title"><h3><FileIcon />Bài nói hoàn chỉnh <span>{level}</span></h3><button onClick={() => void copy()}><Copy size={15} />Sao chép toàn bộ</button></div><p>{fullText}</p><div className="ss-result-actions"><button className="primary" onClick={() => speak(fullText)}><Headphones size={18} />Nghe phát âm</button><button disabled={requesting} onClick={() => void record()}><Mic size={18} />{recording ? 'Dừng ghi âm' : 'Luyện nói'}</button><button onClick={save}><Bookmark size={18} />Lưu bài</button><button disabled={recording || requesting} onClick={reset}><RotateCcw size={18} />Làm lại</button></div></div>
      <div className="ss-models"><h3><Sparkles size={18} />Bài mẫu theo trình độ <span>{level}</span></h3>{samples.length ? samples.map((r, i) => <article key={i}><p>{r.text}</p><button onClick={() => speak(r.text)}><Play size={15} />Nghe mẫu</button></article>) : <p className="ss-muted">Chưa có đáp án {level} cho câu hỏi này trong kho. Bạn có thể dùng form trên để tự xây dựng câu trả lời.</p>}</div>
      {!!prompt?.samples.length && <div className="ss-models"><h3><BookOpen size={18} />Đáp án mẫu đã import</h3><p className="ss-muted">Đáp án từ Luyện đề theo Part, chưa phân loại trình độ.</p>{prompt.samples.map((sample, i) => <article key={`${prompt.id}:${i}`}><p style={{ whiteSpace: 'pre-wrap' }}>{sample}</p><button onClick={() => speak(sample)}><Play size={15} />Nghe mẫu</button></article>)}</div>}
      <button className="ss-saved-toggle" onClick={() => setSavedOpen(!savedOpen)}><Bookmark size={17} />Bài đã lưu trên trình duyệt ({saved.length})</button>{savedOpen && <div className="ss-saved">{!saved.length && <p>Chưa có bài đã lưu.</p>}{saved.map((s, i) => <article key={i}><b>{s.question} · {s.level}</b><p>{s.text}</p><button onClick={() => speak(s.text)}><Volume2 size={16} />Nghe bài</button></article>)}</div>}
    </section></div>}
    </main>
  </div>;
}
function FileIcon() { return <Check size={21} className="ss-file-icon" />; }

function AutoGrowingTextarea(props: ComponentProps<'textarea'>) {
  const field = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    };
    resize();
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (nextWidth !== width) { width = nextWidth; resize(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [props.value]);
  return <textarea {...props} ref={field} style={{ ...props.style, overflowY: 'hidden', resize: 'none', maxHeight: 'none' }} />;
}



function SpeakingPicture({ src, fallback, number }: { src: string; fallback?: string; number: number }) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const activeSrc = useFallback && fallback ? fallback : src;
  useEffect(() => { setFailed(false); setUseFallback(false); }, [src, fallback]);
  return <figure>{failed ? <div className="ss-picture-error" role="status">Không tải được ảnh {number}.<button onClick={() => { setFailed(false); setUseFallback(false); }}>Tải lại ảnh</button><a href={activeSrc} target="_blank" rel="noopener noreferrer" className="underline">Mở URL ảnh</a></div> : <img src={activeSrc} referrerPolicy="no-referrer" alt={`Bức tranh ${number}`} onError={() => { if (!useFallback && fallback && fallback !== src) setUseFallback(true); else setFailed(true); }} />}</figure>;
}
