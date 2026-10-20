import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Download, Search, Trash2, UploadCloud } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api, unwrap } from '../../api/client';
import { AdminSpeakingQuestions } from './AdminSpeakingQuestions';

type SentenceType = 'opening' | 'body' | 'ending';
type Sentence = { text: string; vi: string; level: string; tag: string };
type WritingBankRow = {
  id: string;
  part: string;
  topic: string;
  form: string;
  question: string;
  vi: string;
  targetWords: string;
  section: SentenceType;
  text: string;
  textVi: string;
  level: string;
  tag: string;
};
type WritingPrompt = {
  id: string;
  part: string;
  topic: string;
  form: string;
  question: string;
  vi: string;
  targetWords: string;
  sentences: Record<SentenceType, Sentence[]>;
};
type BankType = 'samples' | 'answers';

const sentenceOrder: SentenceType[] = ['opening', 'body', 'ending'];

export function AdminWritingBank({ skill = 'writing' }: { skill?: 'writing' | 'speaking' }) {
  return skill === 'speaking' ? <AdminSpeakingManager /> : <AdminSentenceBank skill={skill} />;
}

function AdminSpeakingManager() {
  const [tab, setTab] = useState<'questions' | 'sentences'>('questions');
  return <div className="space-y-5"><div className="flex flex-wrap gap-3"><button className={tab === 'questions' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('questions')}>Câu hỏi Part 1–4</button><button className={tab === 'sentences' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('sentences')}>Kho mẫu câu & đáp án</button></div>{tab === 'questions' ? <AdminSpeakingQuestions /> : <AdminSentenceBank skill="speaking" />}</div>;
}

function AdminSentenceBank({ skill = 'writing' }: { skill?: 'writing' | 'speaking' }) {
  const skillLabel = skill === 'speaking' ? 'Speaking' : 'Writing';
  const writingBankStorageKey = `aptis-${skill}-bank-prompts`;
  const writingAnswerBankStorageKey = `aptis-${skill}-answer-bank-prompts`;
  const bankConfig: Record<BankType, { label: string; storageKey: string; sentenceLabel: string }> = {
    samples: { label: 'Kho mẫu câu', storageKey: writingBankStorageKey, sentenceLabel: 'Câu mẫu' },
    answers: { label: 'Kho đáp án', storageKey: writingAnswerBankStorageKey, sentenceLabel: 'Đáp án' }
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeBank, setActiveBank] = useState<BankType>(() => parseBankType(searchParams.get('bank')) ?? 'samples');
  const [banks, setBanks] = useState<Record<BankType, WritingPrompt[]>>(() => ({
    samples: loadStoredPrompts(writingBankStorageKey),
    answers: loadStoredPrompts(writingAnswerBankStorageKey)
  }));
  const [query, setQuery] = useState('');
  const [speakingPart, setSpeakingPart] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const loadWarningShownRef = useRef(false);
  const prompts = skill === 'speaking' ? banks[activeBank].filter(p => p.part === `Speaking Part ${speakingPart}`) : banks[activeBank];
  const activeConfig = bankConfig[activeBank];

  useEffect(() => {
    void loadBanks();
  }, []);

  useEffect(() => {
    const bank = parseBankType(searchParams.get('bank'));
    if (bank && bank !== activeBank) {
      setActiveBank(bank);
      setSelectedIds(new Set());
      setQuery('');
    }
  }, [searchParams, activeBank]);

  useEffect(() => {
    savePrompts(writingBankStorageKey, banks.samples);
    savePrompts(writingAnswerBankStorageKey, banks.answers);
  }, [banks.samples, banks.answers]);

  const filteredPrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return prompts;
    return prompts.filter((prompt) =>
      [prompt.part, prompt.topic, prompt.form, prompt.question, prompt.vi, prompt.targetWords]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [prompts, query]);
  const filteredIds = useMemo(() => filteredPrompts.map((prompt) => prompt.id), [filteredPrompts]);
  const selectedCount = selectedIds.size;
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  async function importCsv(event: ChangeEvent<HTMLInputElement>, bankType: BankType) {
    const file = event.target.files?.[0];
    if (!file) return;

    const config = bankConfig[bankType];
    let imported: WritingPrompt[] = [];
    try {
      const rows = file.name.toLowerCase().endsWith('.csv')
        ? parseCsv(await file.text())
        : readWorkbookRows(await file.arrayBuffer());
      imported = parseWritingPromptRows(skill === 'speaking' ? convertDynamicSpeakingRows(rows, bankType) : rows);
      if (!imported.length) throw new Error('invalid-template');
      if (skill === 'speaking') imported = validateSpeakingPartImport(imported, speakingPart);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error && error.message !== 'invalid-template' ? error.message : 'File CSV chưa đúng mẫu cột hoặc chưa có dữ liệu hợp lệ');
      event.target.value = '';
      return;
    }

    try {
      const latest = skill === 'speaking' ? rowsToPrompts(await unwrap<WritingBankRow[]>(api.get(`/speaking-bank/${bankType}`))) : [];
      const next = skill === 'speaking' ? replaceSpeakingPart(latest, imported, speakingPart) : imported;
      await saveBank(bankType, next);
      switchBank(bankType);
      toast.success(`Đã import ${imported.length} câu hỏi vào ${config.label.toLowerCase()}${skill === 'speaking' ? ` Part ${speakingPart}` : ''}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error
        ? `Không import được dữ liệu: ${error.message}`
        : 'Không import được dữ liệu. Vui lòng thử lại.');
    } finally {
      event.target.value = '';
    }
  }
  async function removePrompt(id: string) {
    if (!confirm(`Xóa chủ đề này khỏi ${activeConfig.label.toLowerCase()}?`)) return;
    try {
      const next = banks[activeBank].filter((prompt) => prompt.id !== id);
      await saveBank(activeBank, next);
      setSelectedIds((current) => {
        const selected = new Set(current);
        selected.delete(id);
        return selected;
      });
      toast.success('Đã xóa chủ đề');
    } catch (error) {
      console.error(error);
      toast.error('Không xóa được dữ liệu. Hãy kiểm tra backend và quyền admin.');
    }
  }

  async function removeSelectedPrompts() {
    if (!selectedCount) return;
    if (!confirm(`Xóa ${selectedCount} chủ đề đã chọn khỏi ${activeConfig.label.toLowerCase()}?`)) return;
    try {
      const next = banks[activeBank].filter((prompt) => !selectedIds.has(prompt.id));
      await saveBank(activeBank, next);
      setSelectedIds(new Set());
      toast.success(`Đã xóa ${selectedCount} chủ đề`);
    } catch (error) {
      console.error(error);
      toast.error('Không xóa được dữ liệu đã chọn. Hãy kiểm tra backend và quyền admin.');
    }
  }

  async function removeSentence(promptId: string, section: SentenceType, sentenceIndex: number) {
    const prompt = prompts.find((item) => item.id === promptId);
    if (!prompt) return;
    const sentence = prompt.sentences[section][sentenceIndex];
    if (!sentence) return;
    if (!confirm(`Xóa câu này khỏi ${activeConfig.label.toLowerCase()}?`)) return;

    try {
      const next = banks[activeBank]
        .map((item) => {
          if (item.id !== promptId) return item;
          return {
            ...item,
            sentences: {
              ...item.sentences,
              [section]: item.sentences[section].filter((_, index) => index !== sentenceIndex)
            }
          };
        })
        .filter((item) => sentenceOrder.some((type) => item.sentences[type].length));

      await saveBank(activeBank, next);
      toast.success('Đã xóa câu');
    } catch (error) {
      console.error(error);
      toast.error('Không xóa được câu. Hãy kiểm tra backend và quyền admin.');
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFilteredSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function clearImportedBank(bankType: BankType = activeBank) {
    if (!confirm(`Xóa toàn bộ dữ liệu ${bankConfig[bankType].label.toLowerCase()}${skill === 'speaking' ? ` Part ${speakingPart}` : ''} đã import?`)) return;
    try {
      await saveBank(bankType, skill === 'speaking' ? banks[bankType].filter(p => p.part !== `Speaking Part ${speakingPart}`) : []);
      setSelectedIds(new Set());
      toast.success('Đã xóa dữ liệu import');
    } catch (error) {
      console.error(error);
      toast.error('Không xóa được dữ liệu import. Hãy kiểm tra backend và quyền admin.');
    }
  }

  async function loadBanks() {
    const [samplesResult, answersResult] = await Promise.allSettled([
      unwrap<WritingBankRow[]>(api.get(`/${skill}-bank/samples`)),
      unwrap<WritingBankRow[]>(api.get(`/${skill}-bank/answers`))
    ]);

    setBanks((current) => {
      const next = { ...current };

      if (samplesResult.status === 'fulfilled') {
        const loadedSamples = rowsToPrompts(samplesResult.value);
        next.samples = loadedSamples;
        savePrompts(writingBankStorageKey, next.samples);
      } else {
        console.error(samplesResult.reason);
      }

      if (answersResult.status === 'fulfilled') {
        const loadedAnswers = rowsToPrompts(answersResult.value);
        next.answers = loadedAnswers;
        savePrompts(writingAnswerBankStorageKey, next.answers);
      } else {
        console.error(answersResult.reason);
      }

      return next;
    });

    if ((samplesResult.status === 'rejected' || answersResult.status === 'rejected') && !loadWarningShownRef.current) {
      loadWarningShownRef.current = true;
      toast.error(`Chưa kết nối được backend kho ${skillLabel}. Nếu vừa cập nhật code, hãy restart backend.`);
    }
  }

  async function saveBank(bankType: BankType, nextPrompts: WritingPrompt[]) {
    const savedRows = await unwrap<WritingBankRow[]>(api.put(`/${skill}-bank/${bankType}`, flattenPrompts(nextPrompts)));
    const savedPrompts = rowsToPrompts(savedRows);
    savePrompts(bankConfig[bankType].storageKey, savedPrompts);
    setBanks((current) => ({ ...current, [bankType]: savedPrompts }));
    if (skill === 'speaking') {
      window.dispatchEvent(new Event('speaking-bank-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('speaking-bank-sync');
        channel.postMessage('updated');
        channel.close();
      }
    }
    return savedPrompts;
  }

  function switchBank(bank: BankType) {
    setActiveBank(bank);
    setSelectedIds(new Set());
    setQuery('');
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('bank', bank);
      return next;
    }, { replace: true });
  }

  function downloadTemplate() {
    const rows = [
      ['id', 'part', 'topic', 'form', 'question', 'vi', 'targetWords', 'section', 'text', 'textVi', 'level', 'tag'],
      ['profile-free-time', 'Writing Part 1', 'Free time', 'Complete sentences', 'Complete the short profile about your free time.', 'Hoàn thành phần giới thiệu ngắn về thời gian rảnh của bạn.', '1-5 từ mỗi câu', 'opening', 'In my free time, I usually read books.', 'Trong thời gian rảnh, tôi thường đọc sách.', 'A1', 'Câu đơn giản'],
      ['profile-free-time', 'Writing Part 1', 'Free time', 'Complete sentences', 'Complete the short profile about your free time.', 'Hoàn thành phần giới thiệu ngắn về thời gian rảnh của bạn.', '1-5 từ mỗi câu', 'body', 'My favourite hobby is playing badminton.', 'Sở thích yêu thích của tôi là chơi cầu lông.', 'A1', 'Sở thích'],
      ['profile-free-time', 'Writing Part 1', 'Free time', 'Complete sentences', 'Complete the short profile about your free time.', 'Hoàn thành phần giới thiệu ngắn về thời gian rảnh của bạn.', '1-5 từ mỗi câu', 'ending', 'It makes me feel happy.', 'Nó làm tôi cảm thấy vui.', 'A1', 'Kết ý']
    ];
    if (skill === 'speaking') {
      rows.splice(1, rows.length - 1,
        ['free-time', 'Speaking Part 1', 'Free time', 'Personal questions', 'What do you do in your free time?', 'Bạn làm gì trong thời gian rảnh?', '30 giây', 'opening', 'I enjoy reading books in my free time.', 'Tôi thích đọc sách trong thời gian rảnh.', 'B1', 'Giới thiệu'],
        ['free-time', 'Speaking Part 1', 'Free time', 'Personal questions', 'What do you do in your free time?', 'Bạn làm gì trong thời gian rảnh?', '30 giây', 'body', 'It helps me relax after a busy day.', 'Điều đó giúp tôi thư giãn sau một ngày bận rộn.', 'B1', 'Lý do']);
      const exampleQuestions = ['What do you do in your free time?', 'Describe this picture.', 'Compare these two pictures.', 'Tell me about a memorable journey.'];
      for (const row of rows.slice(1)) {
        row[0] = `part${speakingPart}-example`; row[1] = `Speaking Part ${speakingPart}`;
        row[4] = exampleQuestions[speakingPart - 1]; row[5] = ''; row[6] = `${speakingPart === 1 ? 30 : speakingPart === 4 ? 120 : 45} giây`;
        if (speakingPart !== 1) { row[2] = 'Example'; row[3] = 'Speaking'; row[8] = 'Write your sample answer here.'; row[9] = ''; }
      }
    }
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${skill}-bank${skill === 'speaking' ? `-part${speakingPart}` : ''}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {skill === 'speaking' && <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Chọn Part để import">
        {[1, 2, 3, 4].map(part => <button type="button" key={part} aria-pressed={speakingPart === part} className={`${speakingPart === part ? 'border-pink-500 bg-pink-50 text-pink-700' : 'bg-white text-slate-700'} rounded-2xl border p-4 text-left`} onClick={() => { setSpeakingPart(part); switchBank('samples'); }}><span className="block text-lg font-extrabold">Part {part}</span><span className="mt-1 block text-sm">{banks.samples.filter(p => p.part === `Speaking Part ${part}`).length} câu hỏi mẫu · {banks.answers.filter(p => p.part === `Speaking Part ${part}`).length} câu hỏi có đáp án</span></button>)}
      </section>}
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Admin</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy">Quản lý kho đề {skillLabel}</h1>
          <p className="mt-2 text-slate-600">Import CSV và quản lý kho mẫu câu/kho đáp án hiển thị cho học viên.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary h-11 px-4" onClick={downloadTemplate}>
            <Download size={17} />
            Tải file mẫu
          </button>
          <label className="btn-primary h-11 cursor-pointer justify-center px-4">
            <UploadCloud size={18} />
            Import kho mẫu câu {skill === 'speaking' ? `Part ${speakingPart}` : ''}
            <input className="hidden" type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => importCsv(event, 'samples')} />
          </label>
          <label className="btn-primary h-11 cursor-pointer justify-center px-4">
            <UploadCloud size={18} />
            Import kho đáp án {skill === 'speaking' ? `Part ${speakingPart}` : skillLabel}
            <input className="hidden" type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => importCsv(event, 'answers')} />
          </label>
          {skill === 'speaking' ? (['samples', 'answers'] as BankType[]).map(bank => <button key={bank} type="button" className="btn-secondary h-11 px-4 text-red-600" onClick={() => void clearImportedBank(bank)} disabled={!banks[bank].some(prompt => prompt.part === `Speaking Part ${speakingPart}`)}><Trash2 size={17} />Xóa {bankConfig[bank].label.toLowerCase()} Part {speakingPart}</button>) : <button type="button" className="btn-secondary h-11 px-4 text-red-600" onClick={() => void clearImportedBank()} disabled={!prompts.length}>
            <Trash2 size={17} />
            Xóa {activeConfig.label.toLowerCase()}
          </button>}
        </div>
      </section>

      {skill === 'speaking' && (
        <details className="rounded-2xl border border-brand-100 bg-white p-5 text-sm text-slate-600">
          <summary className="cursor-pointer font-bold text-navy">Hướng dẫn import Speaking Part {speakingPart} bằng CSV</summary>
          <p className="mt-2">Tải file mẫu, điền câu hỏi và đáp án rồi chọn “Import kho đáp án Speaking”. Mỗi dòng là một đoạn đáp án; dùng cùng id để ghép các đoạn của một câu hỏi.</p>
          <p className="mt-2">Chọn Part 1, 2, 3 hoặc 4 ở trên, sau đó import mẫu câu hoặc đáp án cho Part đó. File phải chứa đúng Part đã chọn. Import chỉ thay thế dữ liệu của Part này trong kho tương ứng, giữ nguyên các Part còn lại.</p>
          {skill === 'speaking' && <p className="mt-2">Hỗ trợ cả CSV động: forms_json được đưa vào kho mẫu câu; b1_sample, b2_sample, c1_sample và original_answer1/2 được đưa vào kho đáp án. Để nhập form luyện nói đầy đủ, dùng tab Câu hỏi Part 1–4.</p>}
        </details>
      )}

      <section className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-2 sm:grid-cols-2">
        {(Object.keys(bankConfig) as BankType[]).map((bank) => {
          const config = bankConfig[bank];
          const bankPrompts = skill === 'speaking' ? banks[bank].filter(prompt => prompt.part === `Speaking Part ${speakingPart}`) : banks[bank];
          const totalSentences = bankPrompts.reduce((total, prompt) => total + sentenceOrder.reduce((sum, type) => sum + prompt.sentences[type].length, 0), 0);
          const active = activeBank === bank;
          return (
            <button
              key={bank}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchBank(bank)}
              className={`rounded-xl px-5 py-4 text-left transition ${active ? 'bg-brand-50 text-brand-700 shadow-soft' : 'hover:bg-sky-50'}`}
            >
              <span className="block text-lg font-extrabold">{config.label}</span>
              <span className="mt-1 block text-sm font-bold text-slate-600">{countTopics(bankPrompts)} chủ đề · {bankPrompts.length} câu hỏi · {totalSentences} {config.sentenceLabel.toLowerCase()}</span>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label={`Chủ đề ${activeConfig.label.toLowerCase()}`} value={countTopics(prompts)} />
        <Stat label={activeConfig.sentenceLabel} value={prompts.reduce((total, prompt) => total + sentenceOrder.reduce((sum, type) => sum + prompt.sentences[type].length, 0), 0)} />
        <Stat label="Part" value={new Set(prompts.map((prompt) => prompt.part)).size} />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-brand-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Danh sách {activeConfig.label.toLowerCase()}{skill === 'speaking' ? ` Part ${speakingPart}` : ''}</h2>
            <p className="text-sm text-slate-600">CSV cần các cột: id, part, topic, form, question, vi, targetWords, section, text, textVi, level, tag.</p>
            {skill === 'speaking' && <p className="mt-1 text-sm text-slate-500">Part dùng Speaking Part 1–4; targetWords ghi thời lượng nói; section dùng opening, body hoặc ending.</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-brand-100 bg-white px-4 text-sm font-extrabold text-slate-700">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleFilteredSelection} disabled={!filteredIds.length} />
              Chọn tất cả
            </label>
            {selectedCount > 0 && (
              <button type="button" className="btn-secondary h-11 px-4 text-red-600" onClick={removeSelectedPrompts}>
                <Trash2 size={17} />
                Xóa đã chọn ({selectedCount})
              </button>
            )}
            <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 text-slate-500 lg:w-[340px]">
              <Search size={18} />
              <input className="w-full bg-transparent text-sm text-slate-700 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chủ đề, câu hỏi..." />
            </label>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {filteredPrompts.length ? filteredPrompts.map((prompt) => (
            <article key={prompt.id} className={`rounded-2xl border p-4 ${selectedIds.has(prompt.id) ? 'border-brand-300 bg-brand-50/40' : 'border-brand-100'}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <input className="mt-2 h-5 w-5 shrink-0" type="checkbox" checked={selectedIds.has(prompt.id)} onChange={() => toggleSelected(prompt.id)} aria-label={`Chọn ${prompt.question}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{prompt.part}</span>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-slate-700">{prompt.topic}</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                        {sentenceOrder.reduce((total, type) => total + prompt.sentences[type].length, 0)} câu
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold text-navy">{prompt.question}</h3>
                    <p className="mt-1 text-sm text-slate-600">{prompt.vi}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{prompt.form} · {prompt.targetWords}</p>
                  </div>
                </div>
                <button type="button" className="btn-secondary h-10 px-3 text-red-600" onClick={() => removePrompt(prompt.id)}>
                  <Trash2 size={16} />
                  Xóa
                </button>
              </div>
              <div className="mt-4 space-y-2 border-t border-brand-50 pt-4">
                {sentenceOrder.flatMap((section) =>
                  prompt.sentences[section].map((sentence, sentenceIndex) => (
                    <div key={`${section}-${sentenceIndex}-${sentence.text}`} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-extrabold text-brand-700">{sectionLabel(section)}</span>
                          {sentence.level && <span className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-extrabold text-rose-600">{sentence.level}</span>}
                          {sentence.tag && <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{sentence.tag}</span>}
                        </div>
                        <p className="text-sm font-bold leading-6 text-navy">{sentence.text}</p>
                        {sentence.vi && <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-500">{sentence.vi}</p>}
                      </div>
                      <button type="button" className="btn-secondary h-9 shrink-0 px-3 text-red-600" onClick={() => removeSentence(prompt.id, section, sentenceIndex)}>
                        <Trash2 size={15} />
                        Xóa câu
                      </button>
                    </div>
                  ))
                )}
              </div>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-brand-100 p-10 text-center">
              <BookOpen className="mx-auto text-brand-600" size={38} />
              <p className="mt-3 font-extrabold text-navy">Chưa có dữ liệu {activeConfig.label.toLowerCase()} đã import</p>
              <p className="mt-1 text-sm text-slate-600">Bấm nút import tương ứng để nạp dữ liệu CSV.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function countTopics(prompts: WritingPrompt[]) {
  return new Set(prompts.map((prompt) => prompt.topic.trim().toLowerCase()).filter(Boolean)).size;
}

function sectionLabel(section: SentenceType) {
  if (section === 'opening') return 'Mở bài';
  if (section === 'body') return 'Thân bài';
  return 'Kết bài';
}

function rowsToPrompts(rows: WritingBankRow[]) {
  return parseWritingPromptRows([
    ['id', 'part', 'topic', 'form', 'question', 'vi', 'targetWords', 'section', 'text', 'textVi', 'level', 'tag'],
    ...rows.map((row) => [
      row.id,
      row.part,
      row.topic,
      row.form,
      row.question,
      row.vi,
      row.targetWords,
      row.section,
      row.text,
      row.textVi,
      row.level,
      row.tag
    ])
  ]);
}

function flattenPrompts(prompts: WritingPrompt[]): WritingBankRow[] {
  return prompts.flatMap((prompt) =>
    sentenceOrder.flatMap((section) =>
      prompt.sentences[section].map((sentence) => ({
        id: prompt.id,
        part: prompt.part,
        topic: prompt.topic,
        form: prompt.form,
        question: prompt.question,
        vi: prompt.vi,
        targetWords: prompt.targetWords,
        section,
        text: sentence.text,
        textVi: sentence.vi,
        level: sentence.level,
        tag: sentence.tag
      }))
    )
  );
}

function validateSpeakingPartImport(prompts: WritingPrompt[], part: number): WritingPrompt[] {
  return prompts.map(prompt => {
    const number = prompt.part.trim().match(/^(?:Speaking\s+Part\s*|Part\s*)?([1-4])$/i)?.[1];
    if (Number(number) !== part) throw new Error(`Bạn đang import Part ${part}, nhưng file có dữ liệu ${prompt.part}. Hãy chọn đúng Part hoặc tách file theo từng Part.`);
    return { ...prompt, part: `Speaking Part ${part}` };
  });
}

function replaceSpeakingPart(existing: WritingPrompt[], incoming: WritingPrompt[], part: number) {
  const retained = existing.filter(p => p.part !== `Speaking Part ${part}`);
  if (incoming.some(p => retained.some(other => other.id === p.id))) throw new Error('ID câu hỏi bị trùng với Part khác. Hãy dùng ID riêng cho từng Part (ví dụ P1-001, P2-001).');
  return [...retained, ...incoming];
}

function convertDynamicSpeakingRows(rows: string[][], bank: BankType): string[][] {
  const [headers, ...records] = rows;
  if (headers?.some(h => cleanHeader(h).toLowerCase() === 'content')) {
    const flatHeaders = ['id', 'part', 'topic', 'question', 'duration_seconds', 'forms_json', 'ideas_vi_json', 'vocabulary_json', 'b1_sample', 'b2_sample', 'c1_sample', 'original_answer1'];
    const flat: string[][] = [flatHeaders];
    records.forEach((record, index) => {
      if (!record.some(v => v.trim())) return;
      const row = Object.fromEntries(headers.map((h, i) => [cleanHeader(h).toLowerCase(), record[i] || '']));
      let data;
      try { data = JSON.parse(row.content); } catch { throw new Error(`Dòng ${index + 2}: content phải là JSON hợp lệ.`); }
      const part = String(data?.template || row.type || '').match(/^SPEAKING_PART([1-4])$/i)?.[1];
      const development = data?.development_data?.questions;
      if (!part || !Array.isArray(development) || !development.length) throw new Error(`Dòng ${index + 2}: content cần template SPEAKING_PART1–4 và development_data.questions.`);
      development.forEach((item, subIndex) => {
        if (!item || typeof item.question !== 'string') throw new Error(`Dòng ${index + 2}, câu ${subIndex + 1}: thiếu question.`);
        const fields: Record<string, unknown> = { ...item, id: item.question_id || `P${part}-${index + 1}-Q${subIndex + 1}`, part, topic: row.topic || data.title || item.question, original_answer1: item.imported_answer || '' };
        flat.push(flatHeaders.map(key => typeof fields[key] === 'object' ? JSON.stringify(fields[key]) : String(fields[key] ?? '')));
      });
    });
    return convertDynamicSpeakingRows(flat, bank);
  }
  if (!headers?.some(h => ['forms_json', 'b1_sample', 'b2_sample', 'c1_sample'].includes(cleanHeader(h).toLowerCase()))) return rows;
  const output = [['id', 'part', 'topic', 'form', 'question', 'vi', 'targetWords', 'section', 'text', 'textVi', 'level', 'tag']];
  records.forEach((record, index) => {
    if (!record.some(v => v.trim())) return;
    const row = Object.fromEntries(headers.map((h, i) => [cleanHeader(h).toLowerCase(), record[i]?.trim() || '']));
    if (!row.part && row.question1 && 'q2_forms_json' in row && 'q3_forms_json' in row) {
      row.part = '4';
      row.id = row.id || `P4-${row.sort_order || index + 1}`;
      row.question = [row.question1, row.question2, row.question3].filter(Boolean).join('\n');
      row.duration_seconds = row.duration_seconds || '120';
      const steps: Record<string, unknown>[] = [];
      for (const [n, key] of ['forms_json', 'q2_forms_json', 'q3_forms_json'].entries()) {
        let parsed: unknown;
        try { parsed = JSON.parse(row[key] || '[]'); } catch { throw new Error(`Dòng ${index + 2}: ${key} không phải JSON hợp lệ.`); }
        if (!Array.isArray(parsed)) throw new Error(`Dòng ${index + 2}: ${key} phải là mảng các bước trả lời.`);
        parsed.forEach(step => {
          if (!step || typeof step !== 'object') throw new Error(`Dòng ${index + 2}: bước trong ${key} không hợp lệ.`);
          steps.push({ ...step, title: `Q${n + 1} · ${step.title || 'Triển khai câu trả lời'}` });
        });
      }
      row.forms_json = JSON.stringify(steps);
    }
    const part = row.part?.match(/^(?:Speaking\s+Part\s*|Part\s*)?([1-4])$/i)?.[1];
    if (!part || !row.question) throw new Error(`Dòng ${index + 2}: cần part (1–4) và question.`);
    const add = (section: SentenceType, text: string, vi: string, level: string, tag: string) => output.push([
      row.id || `speaking-${part}-${index + 1}`, `Speaking Part ${part}`, row.topic || row.question, row.form || 'Speaking', row.question, row.vi || '', row.duration_seconds ? `${row.duration_seconds} giây` : '', section, text, vi, level, tag
    ]);
    if (bank === 'answers') {
      let count = 0;
      for (const level of ['B1', 'B2', 'C1']) {
        const text = row[`${level.toLowerCase()}_sample`];
        if (text) { add('body', text, '', level, 'Bài mẫu'); count++; }
      }
      for (const n of [1, 2]) if (row[`original_answer${n}`]) { add('body', row[`original_answer${n}`], '', '', `Đáp án gốc ${n}`); count++; }
      if (!count) throw new Error(`Dòng ${index + 2}: thiếu b1_sample/b2_sample/c1_sample hoặc original_answer1/2.`);
    } else {
      let steps: unknown;
      try { steps = JSON.parse(row.forms_json || 'null'); } catch { throw new Error(`Dòng ${index + 2}: forms_json không phải JSON hợp lệ.`); }
      if (!Array.isArray(steps) || !steps.length) throw new Error(`Dòng ${index + 2}: forms_json phải là mảng các bước trả lời.`);
      steps.forEach((step, i) => {
        const answer = step?.suggested_answer ?? step?.value;
        if (typeof answer !== 'string') throw new Error(`Dòng ${index + 2}, bước ${i + 1}: thiếu suggested_answer hoặc value.`);
        if (!answer.trim()) return;
        add(i === 0 ? 'opening' : i === steps.length - 1 ? 'ending' : 'body', answer.trim(), typeof step.hint_vi === 'string' ? step.hint_vi : '', '', typeof step.title === 'string' ? step.title : `Bước ${i + 1}`);
      });
    }
  });
  return output;
}

function parseWritingPromptRows(rows: string[][]): WritingPrompt[] {
  const [headers, ...records] = rows;
  if (!headers?.length) return [];

  const prompts = new Map<string, WritingPrompt>();
  records.forEach((record) => {
    const row = Object.fromEntries(headers.map((header, index) => [cleanHeader(header), record[index] ?? '']));
    const section = row.section as SentenceType;
    if (!row.id || !row.part || !row.topic || !row.question || !isSentenceType(section) || !row.text) return;

    const prompt = prompts.get(row.id) ?? {
      id: row.id,
      part: row.part,
      topic: row.topic,
      form: row.form,
      question: row.question,
      vi: row.vi,
      targetWords: row.targetWords,
      sentences: { opening: [], body: [], ending: [] }
    };

    prompt.sentences[section].push({
      text: row.text,
      vi: row.textVi,
      level: row.level,
      tag: row.tag
    });
    prompts.set(row.id, prompt);
  });

  return [...prompts.values()].filter((prompt) => sentenceOrder.some((type) => prompt.sentences[type].length));
}

function readWorkbookRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) throw new Error('empty-workbook');

  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
    .map((row) => row.map((cell) => String(cell).trim()))
    .filter((row) => row.some(Boolean));
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = csv.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function cleanHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim();
}

function isSentenceType(value: string): value is SentenceType {
  return value === 'opening' || value === 'body' || value === 'ending';
}

function parseBankType(value: string | null): BankType | null {
  return value === 'samples' || value === 'answers' ? value : null;
}

function loadStoredPrompts(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WritingPrompt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePrompts(storageKey: string, prompts: WritingPrompt[]) {
  localStorage.setItem(storageKey, JSON.stringify(prompts));
  const skill = storageKey.startsWith('aptis-speaking-') ? 'speaking' : 'writing';
  window.dispatchEvent(new CustomEvent(`${skill}-bank-updated`, { detail: { storageKey } }));
  const channel = new BroadcastChannel(`${skill}-bank-sync`);
  channel.postMessage({ storageKey, prompts });
  channel.close();
}

