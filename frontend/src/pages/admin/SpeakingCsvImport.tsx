import { useRef, useState } from 'react';
import { Download, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import type { Test } from '../../types';

type CsvRow = Record<string, string>;
type Prepared = { part: number; topic: string; content: string };
const columns = ['part', 'topic', 'question', 'answer1', 'answer2', 'urlpic1', 'urlpic2', 'question1', 'question1_answer', 'question2', 'question2_answer', 'question3', 'question3_answer'];
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function csv(rows: unknown[][]) { return rows.map(row => row.map(cell).join(',')).join('\r\n'); }
function prepare(rows: CsvRow[]): Prepared[] {
  if (!rows.length) throw new Error('File CSV không có dòng dữ liệu.');
  return rows.map((source, index) => {
    const row = { ...source };
    if (!row.part && !row.type && row.question1 && 'q2_forms_json' in row && 'q3_forms_json' in row) row.part = '4';
    if (Number((row.part || row.type || '').match(/[1-4]/)?.[0]) === 4 && !row.question?.trim()) {
      row.question = [row.question1, row.question2, row.question3].filter(Boolean).join('\n');
      row.duration_seconds = row.duration_seconds || '120';
    }
    const part = Number((row.part || row.type || '').match(/[1-4]/)?.[0]);
    let data: Record<string, unknown> | undefined;
    if (row.content?.trim()) {
      try { data = JSON.parse(row.content); } catch { throw new Error(`Dòng ${index + 2}: content phải là JSON hợp lệ.`); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Dòng ${index + 2}: content không hợp lệ.`);
    }
    const templatePart = Number(String(data?.template || '').match(/^SPEAKING_PART([1-4])$/)?.[1]);
    const selectedPart = templatePart || part;
    if (![1, 2, 3, 4].includes(selectedPart)) throw new Error(`Dòng ${index + 2}: part phải là 1, 2, 3 hoặc 4.`);
    if (templatePart && part && templatePart !== part) throw new Error(`Dòng ${index + 2}: part và template không khớp.`);
    if (!data) {
      const item: Record<string, unknown> = { ...row };
      for (const key of ['forms_json', 'ideas_vi_json', 'vocabulary_json']) {
        if (!row[key]?.trim()) continue;
        try {
          const parsed: unknown = JSON.parse(row[key]);
          if (!Array.isArray(parsed)) throw new Error();
          if (key === 'forms_json' && parsed.some(step => !step || typeof step !== 'object' || typeof step.title !== 'string' || typeof step.suggested_answer !== 'string')) throw new Error();
          if (key !== 'forms_json' && parsed.some(value => typeof value !== 'string')) throw new Error();
          item[key] = parsed;
        } catch { throw new Error(`Dòng ${index + 2}: ${key} phải là mảng JSON hợp lệ${key === 'forms_json' ? ' gồm các bước có title và suggested_answer' : ' gồm các chuỗi'}.`); }
      }
      item.answer1 = row.answer1 || row.original_answer1 || '';
      item.answer2 = row.answer2 || row.original_answer2 || '';
      delete item.part; delete item.type; delete item.topic;
      if (selectedPart === 2 || selectedPart === 3) {
        for (let n = 1; n <= 3; n++) if (!row[`question${n}`]?.trim()) throw new Error(`Dòng ${index + 2}: Part ${selectedPart} cần đủ question1, question2, question3.`);
      } else if (!row.question?.trim()) throw new Error(`Dòng ${index + 2}: thiếu question.`);
      data = { template: `SPEAKING_PART${selectedPart}`, part: `Part ${selectedPart}`, total: 1, questions: [item] };
    }
    if (data.template !== `SPEAKING_PART${selectedPart}`) throw new Error(`Dòng ${index + 2}: template Speaking không hợp lệ.`);
    const items = Array.isArray(data.questions) ? data.questions : [data];
    if (!items.length || items.some(item => !item || typeof item !== 'object' || (selectedPart === 2 || selectedPart === 3 ? [1, 2, 3].some(n => !String(item[`question${n}`] || item[`q${n}`] || '').trim()) : !String(item.question || item.prompt || '').trim()))) throw new Error(`Dòng ${index + 2}: thiếu nội dung câu hỏi trong content.`);
    return { part: selectedPart, topic: row.topic || `Speaking Part ${selectedPart}`, content: JSON.stringify(data) };
  });
}
export function SpeakingCsvImport({ tests, disabled, onBusy, onImported }: { tests: Test[]; disabled: boolean; onBusy: (busy: boolean) => void; onImported: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [testId, setTestId] = useState('');
  const [prepared, setPrepared] = useState<Prepared[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  function download() {
    const examples: CsvRow[] = [
      { part: '1', topic: 'Family', question: 'Please tell me about your family.', answer1: 'There are four people in my family.', answer2: 'I live with my parents and my sister.' },
      { part: '2', topic: 'Outdoor activities', urlpic1: '/images/speaking/part2/1.png', question1: 'Describe this picture.', question1_answer: 'I can see some people outdoors.', question2: 'Do you enjoy outdoor activities?', question2_answer: 'Yes, they help me relax.', question3: 'Why are outdoor activities popular?', question3_answer: 'They are a good way to spend time with friends.' },
      { part: '3', topic: 'Compare activities', urlpic1: '/images/speaking/part3/de01_1.png', urlpic2: '/images/speaking/part3/de01_2.png', question1: 'Compare these two pictures.', question1_answer: 'Both pictures show everyday activities.', question2: 'Which activity do you prefer?', question2_answer: 'I prefer the first activity.', question3: 'Why do people enjoy these activities?', question3_answer: 'They help people relax.' },
      { part: '4', topic: 'Helping others', question: 'Tell me about a time when you helped someone.', answer1: 'Last year, I helped a friend prepare for an exam.' }
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv([columns, ...examples.map(row => columns.map(col => row[col] || ''))])], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'speaking-part1-4-mau.csv'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function read(file: File) {
    setPrepared([]); setError(''); setName(file.name); setReading(true);
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('Vui lòng chọn file .csv.');
      const raw = (await file.text()).replace(/^\uFEFF/, '');
      const book = XLSX.read(raw, { type: 'string', raw: true });
      const rows = XLSX.utils.sheet_to_json<CsvRow>(book.Sheets[book.SheetNames[0]], { defval: '', raw: false }).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value)])));
      setPrepared(prepare(rows));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không đọc được file CSV.'); } finally { setReading(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function upload() {
    if (!testId || !prepared.length) return;
    onBusy(true); setError('');
    try {
      // Convert friendly CSV columns into the existing transactional question-import format.
      const form = new FormData();
      form.append('file', new File([csv([['type', 'topic', 'content', 'points'], ...prepared.map(row => [`SPEAKING_PART${row.part}`, row.topic, row.content, 1])])], 'speaking-import.csv', { type: 'text/csv' }));
      await unwrap(api.post(`/questions/import-csv?testId=${testId}`, form));
      await onImported(); setPrepared([]); setName(''); toast.success(`Đã import ${prepared.length} dòng CSV vào bài luyện Speaking.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import thất bại.'); } finally { onBusy(false); }
  }
  return <section className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap gap-3"><button type="button" disabled={disabled || reading} className="btn-secondary" onClick={() => setOpen(!open)}><UploadCloud size={17} />Import CSV</button><button type="button" className="btn-secondary" onClick={download}><Download size={17} />Tải CSV mẫu Part 1–4</button></div>{open && <div className="mt-4 space-y-4"><p className="text-sm text-slate-600">Mỗi dòng là một đề. Part 2–3 nhập đủ Q1–Q3; Part 3 dùng hai cột urlpic1 và urlpic2. Dữ liệu được thêm vào bài luyện đã chọn, giữ nguyên các câu hiện có.</p><label className="block text-sm font-bold">Bài luyện nhận câu hỏi<select aria-label="Bài luyện nhận CSV" className="mt-1 w-full rounded-lg border p-3" value={testId} disabled={disabled} onChange={e => setTestId(e.target.value)}><option value="">Chọn bài luyện Speaking</option>{tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label><input ref={fileInput} aria-label="File CSV Speaking" type="file" accept=".csv,text/csv" disabled={disabled || reading} onChange={e => { const file = e.target.files?.[0]; if (file) void read(file); }} />{reading && <p role="status">Đang đọc CSV…</p>}{name && <p className="text-sm">File: {name}</p>}{error && <p role="alert" className="text-sm text-red-600">{error}</p>}{!!prepared.length && <div className="rounded-xl bg-pink-50 p-3 text-sm"><b>{prepared.length} dòng hợp lệ</b><p>{[1, 2, 3, 4].map(p => `Part ${p}: ${prepared.filter(row => row.part === p).length}`).join(' · ')}</p><p className="mt-2">{prepared.slice(0, 3).map(row => row.topic).join(' · ')}</p></div>}<button type="button" className="btn-primary" disabled={disabled || reading || !testId || !prepared.length} onClick={() => void upload()}>{disabled ? 'Đang xử lý…' : 'Import vào bài luyện'}</button></div>}</section>;
}
