import { Copy, Download, FileCheck, Pencil, Plus, RotateCcw, Save, Search, Trash2, UploadCloud } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';

type MockSkill = 'FULL' | 'SPEAKING' | 'LISTENING' | 'GRAMMAR' | 'READING' | 'WRITING';
type MockStatus = 'PUBLISHED' | 'DRAFT';

type AdminMockTest = {
  id: string;
  skill: MockSkill;
  title: string;
  description: string;
  questions: string;
  questionData?: string;
  minutes: string;
  status: MockStatus;
  updatedAt: string;
};

type MockForm = Omit<AdminMockTest, 'id' | 'updatedAt' | 'questionData'> & { id: string | null; questionData: string };

type ApiMockTest = {
  id: number;
  externalId?: string;
  skill: MockSkill;
  title: string;
  description?: string;
  questions?: string;
  questionData?: string;
  minutes?: string;
  status: MockStatus;
  updatedAt?: string;
};

const STORAGE_KEY = 'aptis-admin-mock-tests';

const skillLabels: Record<MockSkill, string> = {
  FULL: 'Full',
  SPEAKING: 'Speaking',
  LISTENING: 'Listening',
  GRAMMAR: 'Grammar',
  READING: 'Reading',
  WRITING: 'Writing'
};

const skillOrder: MockSkill[] = ['FULL', 'SPEAKING', 'LISTENING', 'GRAMMAR', 'READING', 'WRITING'];

const statusLabels: Record<MockStatus, string> = {
  PUBLISHED: 'Đang hiện',
  DRAFT: 'Bản nháp'
};

const defaultMockTests: AdminMockTest[] = [
  {
    id: 'mock-full-1',
    skill: 'FULL',
    title: 'Full Aptis Mock Test',
    description: 'Làm trọn bộ các kỹ năng trong cùng một phiên thi thử mô phỏng.',
    questions: '5 kỹ năng',
    minutes: '162 phút',
    status: 'DRAFT',
    updatedAt: '2026-08-13'
  },
  {
    id: 'mock-speaking-1',
    skill: 'SPEAKING',
    title: 'Speaking Practice Test 1',
    description: 'Mô phỏng 4 phần Speaking với đọc đề, tiếng bíp, ghi âm và chấm bài.',
    questions: '4 phần',
    minutes: '12 phút',
    status: 'PUBLISHED',
    updatedAt: '2026-08-13'
  },
  {
    id: 'mock-listening-1',
    skill: 'LISTENING',
    title: 'Listening Mock Test',
    description: 'Bài nghe gồm nhận diện từ, matching information, short conversations và monologues.',
    questions: '25 câu',
    minutes: '40 phút',
    status: 'PUBLISHED',
    updatedAt: '2026-08-13'
  },
  {
    id: 'mock-grammar-1',
    skill: 'GRAMMAR',
    title: 'Grammar & Vocabulary Mock Test',
    description: 'Bài grammar và vocabulary gồm multiple choice, matching và sentence gap fill.',
    questions: '30 câu',
    minutes: '25 phút',
    status: 'PUBLISHED',
    updatedAt: '2026-08-13'
  },
  {
    id: 'mock-reading-1',
    skill: 'READING',
    title: 'Reading Mock Test',
    description: 'Bài đọc gồm gap fill, text cohesion, opinion matching và long reading.',
    questions: '27 câu',
    minutes: '35 phút',
    status: 'PUBLISHED',
    updatedAt: '2026-08-13'
  },
  {
    id: 'mock-writing-1',
    skill: 'WRITING',
    title: 'Writing Mock Test',
    description: 'Bài viết mô phỏng 4 phần với khung trả lời, giới hạn từ và chấm bài.',
    questions: '4 phần',
    minutes: '50 phút',
    status: 'PUBLISHED',
    updatedAt: '2026-08-13'
  }
];

const emptyForm: MockForm = {
  id: null,
  skill: 'SPEAKING',
  title: '',
  description: '',
  questions: '',
  questionData: '',
  minutes: '',
  status: 'PUBLISHED'
};

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadMockTests() {
  if (typeof window === 'undefined') return defaultMockTests;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultMockTests;
    const parsed = JSON.parse(saved) as AdminMockTest[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultMockTests;
  } catch {
    return defaultMockTests;
  }
}

function fromApiMockTest(item: ApiMockTest): AdminMockTest {
  return {
    id: String(item.id),
    skill: item.skill,
    title: item.title,
    description: item.description ?? '',
    questions: item.questions ?? '',
    questionData: item.questionData ?? '',
    minutes: item.minutes ?? '',
    status: item.status,
    updatedAt: item.updatedAt?.slice(0, 10) ?? today()
  };
}

function toApiMockTest(form: MockForm) {
  return {
    externalId: form.id?.startsWith('mock-') ? form.id : undefined,
    skill: form.skill,
    title: form.title.trim(),
    description: form.description.trim(),
    questions: form.questions.trim(),
    questionData: form.questionData.trim(),
    minutes: form.minutes.trim(),
    status: form.status
  };
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function sampleMockQuestionData(skill: MockSkill) {
  if (skill === 'SPEAKING') {
    return JSON.stringify([
      { part: 1, prompt: 'Please tell me about your family.', sampleAnswer: 'I live with my parents and my younger sister.' },
      { part: 2, prompt: 'Describe the picture.', imageUrl: '', sampleAnswer: 'In the picture, I can see...' }
    ]);
  }
  if (skill === 'LISTENING') {
    return JSON.stringify([
      { part: 1, prompt: 'What is the price?', audioUrl: '', options: ['3250 pounds', '3500 pounds', '2500 pounds'], answer: '3250 pounds' }
    ]);
  }
  if (skill === 'READING') {
    return JSON.stringify([
      { part: 1, prompt: "I didn't ___ it.", options: ['see', 'watch', 'look', 'view'], answer: 'see' }
    ]);
  }
  if (skill === 'WRITING') {
    return JSON.stringify([
      { part: 1, prompt: 'Fill out the form. Write short answers.', sampleAnswer: 'Name: Anna' }
    ]);
  }
  if (skill === 'GRAMMAR') {
    return JSON.stringify([
      { prompt: 'My father, ___ is a dentist, told me not to drink sugary drinks.', options: ['who', 'which', 'that'], answer: 'who' }
    ]);
  }
  return JSON.stringify([
    { skill: 'SPEAKING', prompt: 'Please tell me about your family.' },
    { skill: 'READING', prompt: "I didn't ___ it.", options: ['see', 'watch', 'look', 'view'], answer: 'see' }
  ]);
}

function toCsv(items: AdminMockTest[]) {
  const headers: Array<keyof AdminMockTest> = ['id', 'skill', 'title', 'description', 'questions', 'questionData', 'minutes', 'status', 'updatedAt'];
  const rows = items.map((item) => headers.map((header) => escapeCsvCell(String(item[header] ?? ''))).join(','));
  return `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeSkill(value: string): MockSkill | null {
  const skill = value.trim().toUpperCase();
  return skill in skillLabels ? skill as MockSkill : null;
}

function normalizeStatus(value: string): MockStatus {
  return value.trim().toUpperCase() === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
}

export function AdminMockTests() {
  const [items, setItems] = useState<AdminMockTest[]>(() => loadMockTests());
  const [form, setForm] = useState<MockForm>(emptyForm);
  const [query, setQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<MockSkill | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    unwrap<ApiMockTest[]>(api.get('/mock-tests/admin'))
      .then((data) => persist(data.map(fromApiMockTest)))
      .catch(() => undefined);
  }, []);

  const stats = useMemo(() => {
    const published = items.filter((item) => item.status === 'PUBLISHED').length;
    return {
      total: items.length,
      published,
      draft: items.length - published
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedSkill !== 'ALL' && item.skill !== selectedSkill) return false;
      if (!keyword) return true;
      return [item.title, item.description, item.questions, item.questionData ?? '', item.minutes, skillLabels[item.skill], statusLabels[item.status]]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [items, query, selectedSkill]);

  const groupedItems = useMemo(() => {
    return skillOrder
      .map((skill) => ({
        skill,
        items: filteredItems.filter((item) => item.skill === skill)
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const filteredIds = useMemo(() => filteredItems.map((item) => item.id), [filteredItems]);
  const selectedFilteredCount = selectedIds.filter((id) => filteredIds.includes(id)).length;
  const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  function persist(next: AdminMockTest[]) {
    setItems(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function saveMockTest() {
    if (!form.title.trim() || !form.questions.trim() || !form.minutes.trim()) {
      toast.error('Vui lòng nhập tên đề, số câu và thời gian');
      return;
    }

    try {
      const saved = form.id
        ? await unwrap<ApiMockTest>(api.put(`/mock-tests/${form.id}`, toApiMockTest(form)))
        : await unwrap<ApiMockTest>(api.post('/mock-tests', toApiMockTest(form)));
      const payload = fromApiMockTest(saved);
      const next = form.id
        ? items.map((item) => (item.id === form.id ? payload : item))
        : [payload, ...items];
      persist(next);
      resetForm();
      toast.success(form.id ? 'Đã cập nhật đề thi thử' : 'Đã tạo đề thi thử');
    } catch {
      toast.error('Không lưu được đề thi thử vào backend');
    }
  }

  function editMockTest(item: AdminMockTest) {
    setForm({
      id: item.id,
      skill: item.skill,
      title: item.title,
      description: item.description,
      questions: item.questions,
      questionData: item.questionData ?? '',
      minutes: item.minutes,
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function duplicateMockTest(item: AdminMockTest) {
    const copy: AdminMockTest = {
      ...item,
      id: createId(),
      title: `${item.title} Copy`,
      status: 'DRAFT',
      updatedAt: today()
    };
    persist([copy, ...items]);
    toast.success('Đã nhân bản đề thi thử');
  }

  async function deleteMockTest(id: string) {
    if (!confirm('Xóa đề thi thử này?')) return;
    try {
      await api.delete(`/mock-tests/${id}`);
      persist(items.filter((item) => item.id !== id));
      if (form.id === id) resetForm();
      toast.success('Đã xóa đề thi thử');
    } catch {
      toast.error('Không xóa được đề thi thử');
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  function toggleSelectFiltered() {
    setSelectedIds((current) => {
      if (allFilteredSelected) return current.filter((id) => !filteredIds.includes(id));
      return Array.from(new Set([...current, ...filteredIds]));
    });
  }

  async function deleteSelectedMockTests() {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const selectedItems = items.filter((item) => selectedSet.has(item.id));
    if (!confirm(`Xoa ${selectedItems.length} de thi thu da chon?`)) return;

    const results = await Promise.allSettled(selectedItems.map((item) => api.delete(`/mock-tests/${item.id}`).then(() => item.id)));
    const deletedIds = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map((result) => result.value);

    if (deletedIds.length > 0) {
      const deletedSet = new Set(deletedIds);
      persist(items.filter((item) => !deletedSet.has(item.id)));
      setSelectedIds((current) => current.filter((id) => !deletedSet.has(id)));
      if (form.id && deletedSet.has(form.id)) resetForm();
    }

    if (deletedIds.length === selectedItems.length) {
      toast.success(`Da xoa ${deletedIds.length} de thi thu`);
    } else if (deletedIds.length > 0) {
      toast.error(`Da xoa ${deletedIds.length}/${selectedItems.length} de. Mot so de chua xoa duoc`);
    } else {
      toast.error('Khong xoa duoc cac de da chon');
    }
  }

  async function toggleStatus(item: AdminMockTest) {
    const nextStatus: MockStatus = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const saved = await unwrap<ApiMockTest>(api.put(`/mock-tests/${item.id}`, {
        externalId: undefined,
        skill: item.skill,
        title: item.title,
        description: item.description,
        questions: item.questions,
        questionData: item.questionData ?? '',
        minutes: item.minutes,
        status: nextStatus
      }));
      const payload = fromApiMockTest(saved);
      persist(items.map((current) => current.id === item.id ? payload : current));
      toast.success(nextStatus === 'PUBLISHED' ? 'Đã bật hiển thị đề' : 'Đã chuyển đề về bản nháp');
    } catch {
      toast.error('Không cập nhật trạng thái đề thi thử');
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(items)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aptis-mock-tests-${today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Đã export CSV đề thi thử');
  }

  function downloadCsvTemplate() {
    const template = toCsv(defaultMockTests.slice(0, 2).map((item) => ({ ...item, questionData: sampleMockQuestionData(item.skill) })));
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mock-tests-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const importedFromApi = await unwrap<ApiMockTest[]>(api.post('/mock-tests/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
      const imported = importedFromApi.map(fromApiMockTest);
      const importedIds = new Set(imported.map((item) => item.id));
      persist([...imported, ...items.filter((item) => !importedIds.has(item.id))]);
      toast.success(`Đã import ${imported.length} đề thi thử`);
    } catch {
      try {
      const text = await file.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, ''));
      const [headers = [], ...dataRows] = rows;
      const indexes = Object.fromEntries(headers.map((header, index) => [header.trim(), index]));
      const required = ['skill', 'title', 'questions', 'minutes'];
      const missing = required.filter((field) => indexes[field] === undefined);
      if (missing.length > 0) {
        toast.error(`CSV thiếu cột: ${missing.join(', ')}`);
        return;
      }

      const imported = dataRows.reduce<AdminMockTest[]>((result, row) => {
        const skill = normalizeSkill(row[indexes.skill] ?? '');
        const title = (row[indexes.title] ?? '').trim();
        const questions = (row[indexes.questions] ?? '').trim();
        const minutes = (row[indexes.minutes] ?? '').trim();

        if (!skill || !title || !questions || !minutes) return result;

        result.push({
          id: (row[indexes.id] ?? '').trim() || createId(),
          skill,
          title,
          description: (row[indexes.description] ?? '').trim(),
          questions,
          questionData: (row[indexes.questionData] ?? '').trim(),
          minutes,
          status: normalizeStatus(row[indexes.status] ?? 'PUBLISHED'),
          updatedAt: (row[indexes.updatedAt] ?? '').trim() || today()
        });
        return result;
      }, []);

      if (imported.length === 0) {
        toast.error('CSV không có dòng đề thi thử hợp lệ');
        return;
      }

      const importedIds = new Set(imported.map((item) => item.id));
      persist([...imported, ...items.filter((item) => !importedIds.has(item.id))]);
      toast.success(`Đã import ${imported.length} đề thi thử vào bộ nhớ trình duyệt`);
      } catch {
      toast.error('Không đọc được file CSV');
      }
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Admin</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Quản lí đề thi thử</h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Tạo và quản lí các bộ thi thử riêng cho Full, Speaking, Listening, Grammar, Reading và Writing.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Tổng đề" value={stats.total} />
            <StatCard label="Đang hiện" value={stats.published} />
            <StatCard label="Bản nháp" value={stats.draft} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <FileCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">{form.id ? 'Sửa đề thi thử' : 'Tạo đề thi thử'}</h2>
              <p className="text-sm text-slate-500">Thông tin hiển thị ở trang chọn đề thi thử.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-600">Kỹ năng</span>
                <select className="input" value={form.skill} onChange={(event) => setForm((current) => ({ ...current, skill: event.target.value as MockSkill }))}>
                  {Object.entries(skillLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-600">Trạng thái</span>
                <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MockStatus }))}>
                  <option value="PUBLISHED">Đang hiện</option>
                  <option value="DRAFT">Bản nháp</option>
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tên đề</span>
              <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="VD: Speaking Practice Test 2" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Mô tả</span>
              <textarea className="input min-h-[110px]" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Mô tả ngắn về bộ thi thử..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Dữ liệu câu hỏi JSON</span>
              <textarea
                className="input min-h-[150px] font-mono text-xs"
                value={form.questionData}
                onChange={(event) => setForm((current) => ({ ...current, questionData: event.target.value }))}
                placeholder='VD: [{"prompt":"Question text","options":["A","B","C"],"answer":"A"}]'
              />
              <p className="text-xs text-slate-500">Cột CSV tương ứng là questionData. Nhập JSON mảng câu hỏi, đáp án, audioUrl/imageUrl hoặc sampleAnswer tùy kỹ năng.</p>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-600">Số câu / phần</span>
                <input className="input" value={form.questions} onChange={(event) => setForm((current) => ({ ...current, questions: event.target.value }))} placeholder="VD: 30 câu" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-600">Thời gian</span>
                <input className="input" value={form.minutes} onChange={(event) => setForm((current) => ({ ...current, minutes: event.target.value }))} placeholder="VD: 25 phút" />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" className="btn-primary justify-center" onClick={saveMockTest}>
                {form.id ? <Save size={18} /> : <Plus size={18} />}
                {form.id ? 'Cập nhật đề' : 'Lưu đề'}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={resetForm}>
                <RotateCcw size={18} />
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Danh sách đề thi thử</h2>
                <p className="text-sm text-slate-500">Quản lí trạng thái và thông tin từng bộ đề.</p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary h-11 px-4 text-sm" onClick={downloadCsvTemplate}>
                    <Download size={17} />
                    CSV mẫu
                  </button>
                  <button type="button" className="btn-secondary h-11 px-4 text-sm" onClick={exportCsv}>
                    <Download size={17} />
                    Export
                  </button>
                  <label className="btn-primary h-11 cursor-pointer px-4 text-sm">
                    <UploadCloud size={17} />
                    Import
                    <input className="hidden" type="file" accept=".csv,text/csv" onChange={importCsv} />
                  </label>
                </div>
                <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 lg:w-[260px]">
                  <Search size={18} />
                  <input className="w-full bg-transparent text-sm text-slate-700 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm đề thi thử..." />
                </label>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${selectedSkill === 'ALL' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700'}`}
                onClick={() => setSelectedSkill('ALL')}
              >
                Tất cả
              </button>
              {skillOrder.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${selectedSkill === skill ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700'}`}
                  onClick={() => setSelectedSkill(skill)}
                >
                  {skillLabels[skill]}
                </button>
              ))}
            </div>
            {filteredItems.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-extrabold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={allFilteredSelected}
                    onChange={toggleSelectFiltered}
                  />
                  Chon tat ca dang loc ({filteredItems.length})
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">Da chon {selectedIds.length} de</span>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-extrabold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                    onClick={deleteSelectedMockTests}
                    disabled={selectedIds.length === 0}
                  >
                    <Trash2 size={17} />
                    Xoa da chon
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6 p-5">
            {groupedItems.map((group) => (
              <section key={group.skill} className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-950">{skillLabels[group.skill]}</h3>
                    <p className="text-sm text-slate-500">{group.items.length} đề thi thử</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-brand-700 shadow-sm">
                    {group.items.filter((item) => item.status === 'PUBLISHED').length} đang hiện
                  </span>
                </div>

                <div className="grid gap-4">
                  {group.items.map((item) => (
                    <article key={item.id} className={`rounded-2xl border p-4 transition hover:border-brand-200 hover:shadow-sm ${selectedIds.includes(item.id) ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            aria-label={`Chon ${item.title}`}
                          />
                          <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{skillLabels[item.skill]}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${item.questionData?.trim() ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                              {item.questionData?.trim() ? 'Có câu hỏi' : 'Chưa nhập câu hỏi'}
                            </span>
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-xs font-extrabold ${item.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                              onClick={() => toggleStatus(item)}
                            >
                              {statusLabels[item.status]}
                            </button>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Cập nhật {item.updatedAt}</span>
                          </div>
                          <h3 className="mt-3 text-lg font-extrabold text-slate-950">{item.title}</h3>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{item.description || 'Chưa có mô tả.'}</p>
                          <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-xs font-bold text-slate-500">Câu hỏi</p>
                              <p className="mt-1 text-lg font-extrabold text-slate-950">{item.questions}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-xs font-bold text-slate-500">Thời gian</p>
                              <p className="mt-1 text-lg font-extrabold text-slate-950">{item.minutes}</p>
                            </div>
                          </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-brand-200 hover:text-brand-700" onClick={() => editMockTest(item)} title="Sửa">
                            <Pencil size={18} />
                          </button>
                          <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-brand-200 hover:text-brand-700" onClick={() => duplicateMockTest(item)} title="Nhân bản">
                            <Copy size={18} />
                          </button>
                          <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-red-200 hover:text-red-600" onClick={() => deleteMockTest(item.id)} title="Xóa">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center font-bold text-slate-500">
                Chưa tìm thấy đề thi thử nào.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[110px] rounded-2xl bg-slate-50 p-4 text-center">
      <p className="text-2xl font-extrabold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}
