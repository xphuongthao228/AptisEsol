import { FileSearch, Pencil, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import type { SkillType } from '../../types';

type PredictionStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

type AdminPrediction = {
  id: number;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  tags: string;
  priority: number;
  status: PredictionStatus;
  updatedAt: string;
};

type PredictionForm = {
  id: number | null;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  tags: string;
  priority: number;
  status: PredictionStatus;
};

const emptyForm: PredictionForm = {
  id: null,
  skill: 'LISTENING',
  title: '',
  summary: '',
  content: '',
  tags: '',
  priority: 1,
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

export function AdminPredictions() {
  const [items, setItems] = useState<AdminPrediction[]>([]);
  const [form, setForm] = useState<PredictionForm>(emptyForm);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPredictions();
  }, []);

  async function loadPredictions() {
    try {
      setLoading(true);
      setItems(await unwrap<AdminPrediction[]>(api.get('/predictions')));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không tải được danh sách dự đoán đề'));
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.title, item.summary, item.content, item.tags, skillLabels[item.skill]]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, query]);

  function resetForm() {
    setForm(emptyForm);
  }

  async function savePrediction() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung dự đoán');
      return;
    }

    const payload = {
      skill: form.skill,
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      tags: form.tags.trim(),
      priority: Number(form.priority) || 1,
      status: form.status
    };

    try {
      setSaving(true);
      const saved = form.id
        ? await unwrap<AdminPrediction>(api.put(`/predictions/${form.id}`, payload))
        : await unwrap<AdminPrediction>(api.post('/predictions', payload));

      setItems((current) => form.id
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]);
      setForm(emptyForm);
      toast.success(form.id ? 'Đã cập nhật dự đoán đề' : 'Đã tạo dự đoán đề mới');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không lưu được dự đoán đề'));
    } finally {
      setSaving(false);
    }
  }

  function editPrediction(item: AdminPrediction) {
    setForm({
      id: item.id,
      skill: item.skill,
      title: item.title,
      summary: item.summary ?? '',
      content: item.content,
      tags: item.tags ?? '',
      priority: item.priority ?? 1,
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deletePrediction(id: number) {
    if (!confirm('Xóa dự đoán đề này?')) return;
    try {
      await unwrap(api.delete(`/predictions/${id}`));
      setItems((current) => current.filter((item) => item.id !== id));
      if (form.id === id) setForm(emptyForm);
      toast.success('Đã xóa dự đoán đề');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không xóa được dự đoán đề'));
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Quản lý dự đoán đề</h1>
        <p className="mt-2 text-slate-500">Tạo nội dung dự đoán đề, sắp xếp ưu tiên và hiển thị cho học viên.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <FileSearch size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{form.id ? 'Sửa dự đoán' : 'Tạo dự đoán'}</h2>
              <p className="text-sm text-slate-500">Học viên chỉ thấy mục đang hiện.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Kỹ năng</span>
                <select className="input" value={form.skill} onChange={(event) => setForm((current) => ({ ...current, skill: event.target.value as SkillType }))}>
                  {Object.entries(skillLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Trạng thái</span>
                <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PredictionStatus }))}>
                  <option value="PUBLISHED">Đang hiện</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </label>
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Ưu tiên</span>
                <input className="input" type="number" min={1} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))} />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tiêu đề</span>
              <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="VD: Chủ đề Speaking dễ gặp tuần này" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Mô tả ngắn</span>
              <textarea className="input min-h-[80px]" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Tóm tắt dự đoán..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Nội dung dự đoán</span>
              <textarea className="input min-h-[170px]" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Nhập nội dung chi tiết..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tag</span>
              <input className="input" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="VD: writing,email,part 4" />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" className="btn-primary justify-center" onClick={savePrediction} disabled={saving}>
                {form.id ? <Save size={18} /> : <Plus size={18} />}
                {saving ? 'Đang lưu...' : form.id ? 'Cập nhật' : 'Lưu dự đoán'}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={resetForm}>
                <RotateCcw size={18} />
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Danh sách dự đoán</h2>
                <p className="text-sm text-slate-500">{items.length} mục dự đoán</p>
              </div>
              <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 lg:max-w-[320px]">
                <Search size={18} />
                <input className="w-full bg-transparent text-sm text-slate-700 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm dự đoán..." />
              </label>
            </div>
          </div>

          <div className="max-h-[720px] space-y-3 overflow-y-auto p-5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-10 text-center font-bold text-slate-500">Đang tải dự đoán...</div>
            ) : filteredItems.length > 0 ? filteredItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{skillLabels[item.skill]}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{item.status}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Ưu tiên {item.priority}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-950">{item.title}</h3>
                    {item.summary ? <p className="mt-1 text-sm text-slate-500">{item.summary}</p> : null}
                    {item.tags ? <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{item.tags}</p> : null}
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{item.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-brand-200 hover:text-brand-700" onClick={() => editPrediction(item)}>
                      <Pencil size={18} />
                    </button>
                    <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-red-200 hover:text-red-600" onClick={() => deletePrediction(item.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center font-bold text-slate-500">Chưa có dự đoán đề nào.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
