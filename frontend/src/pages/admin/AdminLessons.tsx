import { BookOpen, Pencil, Plus, RotateCcw, Save, Search, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import type { SkillType } from '../../types';

type LessonStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

type AdminLesson = {
  id: number;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  status: LessonStatus;
  updatedAt: string;
};

type LessonForm = {
  id: number | null;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  status: LessonStatus;
};

const emptyForm: LessonForm = {
  id: null,
  skill: 'LISTENING',
  title: '',
  summary: '',
  content: '',
  status: 'PUBLISHED'
};

const skillLabels: Record<SkillType, string> = {
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  READING: 'Reading',
  WRITING: 'Writing',
  GRAMMAR: 'Grammar'
};

function apiErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message ?? error?.response?.data?.errors?.[0] ?? error?.message;
  const status = error?.response?.status;
  return message ? `${fallback}: ${message}` : `${fallback}${status ? ` (HTTP ${status})` : ''}`;
}

export function AdminLessons() {
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      setLoading(true);
      setLessons(await unwrap<AdminLesson[]>(api.get('/lessons')));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Khong tai duoc danh sach bai hoc'));
    } finally {
      setLoading(false);
    }
  }

  const filteredLessons = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return lessons;
    return lessons.filter((lesson) =>
      [lesson.title, lesson.summary, lesson.content, skillLabels[lesson.skill]]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [lessons, query]);

  function resetForm() {
    setForm(emptyForm);
  }

  async function saveLesson() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Vui long nhap tieu de va noi dung bai hoc');
      return;
    }

    const payload = {
      skill: form.skill,
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      status: form.status
    };

    try {
      setSaving(true);
      const saved = form.id
        ? await unwrap<AdminLesson>(api.put(`/lessons/${form.id}`, payload))
        : await unwrap<AdminLesson>(api.post('/lessons', payload));

      setLessons((current) => form.id
        ? current.map((lesson) => (lesson.id === saved.id ? saved : lesson))
        : [saved, ...current]);
      setForm(emptyForm);
      toast.success(form.id ? 'Da cap nhat bai hoc' : 'Da tao bai hoc moi');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Khong luu duoc bai hoc'));
    } finally {
      setSaving(false);
    }
  }

  function editLesson(lesson: AdminLesson) {
    setForm({
      id: lesson.id,
      skill: lesson.skill,
      title: lesson.title,
      summary: lesson.summary ?? '',
      content: lesson.content,
      status: lesson.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteLesson(id: number) {
    if (!confirm('Xoa bai hoc nay?')) return;
    try {
      await unwrap(api.delete(`/lessons/${id}`));
      setLessons((current) => current.filter((lesson) => lesson.id !== id));
      if (form.id === id) setForm(emptyForm);
      toast.success('Da xoa bai hoc');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Khong xoa duoc bai hoc'));
    }
  }

  async function importLessonsCsv(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const imported = await unwrap<AdminLesson[]>(api.post('/lessons/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
      setLessons((current) => [...imported, ...current]);
      toast.success(`Da import ${imported.length} bai hoc/tai lieu`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Khong import duoc bai hoc/tai lieu tu CSV'));
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Quan ly bai hoc</h1>
        <p className="mt-2 text-slate-500">Tao va cap nhat noi dung bai hoc cho hoc vien.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{form.id ? 'Sua bai hoc' : 'Tao bai hoc'}</h2>
              <p className="text-sm text-slate-500">Noi dung nay duoc luu vao backend.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-600">Ky nang</span>
                <select
                  className="input"
                  value={form.skill}
                  onChange={(event) => setForm((current) => ({ ...current, skill: event.target.value as SkillType }))}
                >
                  {Object.entries(skillLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-600">Trang thai</span>
                <select
                  className="input"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LessonStatus }))}
                >
                  <option value="PUBLISHED">Dang hien</option>
                  <option value="DRAFT">Ban nhap</option>
                  <option value="ARCHIVED">Luu tru</option>
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tieu de</span>
              <input
                className="input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="VD: Cach nghe bat keyword Part 1"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Mo ta ngan</span>
              <textarea
                className="input min-h-[90px]"
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Tom tat bai hoc..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Noi dung bai hoc</span>
              <textarea
                className="input min-h-[180px]"
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Nhap noi dung chi tiet..."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" className="btn-primary justify-center" onClick={saveLesson} disabled={saving}>
                {form.id ? <Save size={18} /> : <Plus size={18} />}
                {saving ? 'Dang luu...' : form.id ? 'Cap nhat' : 'Luu bai hoc'}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={resetForm}>
                <RotateCcw size={18} />
                Lam moi
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Danh sach bai hoc</h2>
                <p className="text-sm text-slate-500">{lessons.length} bai hoc</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="btn-primary h-11 cursor-pointer justify-center px-4">
                  <UploadCloud size={18} />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      importLessonsCsv(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
                <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 lg:w-[320px]">
                  <Search size={18} />
                  <input
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tim bai hoc..."
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="max-h-[720px] space-y-3 overflow-y-auto p-5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-10 text-center font-bold text-slate-500">
                Dang tai bai hoc...
              </div>
            ) : filteredLessons.length > 0 ? filteredLessons.map((lesson) => (
              <article key={lesson.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">
                        {skillLabels[lesson.skill]}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        lesson.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lesson.status === 'PUBLISHED' ? 'Dang hien' : lesson.status === 'DRAFT' ? 'Ban nhap' : 'Luu tru'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-950">{lesson.title}</h3>
                    {lesson.summary && <p className="mt-2 text-sm leading-6 text-slate-500">{lesson.summary}</p>}
                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      Cap nhat: {new Date(lesson.updatedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary h-11 px-4" onClick={() => editLesson(lesson)}>
                      <Pencil size={17} />
                    </button>
                    <button type="button" className="btn-secondary h-11 px-4 text-red-600" onClick={() => deleteLesson(lesson.id)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="font-extrabold text-slate-700">Chua co bai hoc nao</p>
                <p className="mt-2 text-sm text-slate-500">Tao bai hoc dau tien tu form ben trai.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
