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
      toast.error(apiErrorMessage(error, 'Khong tai duoc danh sach du doan de'));
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
      toast.error('Vui long nhap tieu de va noi dung du doan');
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
      toast.success(form.id ? 'Da cap nhat du doan de' : 'Da tao du doan de moi');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Khong luu duoc du doan de'));
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
    if (!confirm('Xoa du doan de nay?')) return;
    try {
      await unwrap(api.delete(`/predictions/${id}`));
      setItems((current) => current.filter((item) => item.id !== id));
      if (form.id === id) setForm(emptyForm);
      toast.success('Da xoa du doan de');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Khong xoa duoc du doan de'));
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Quan ly du doan de</h1>
        <p className="mt-2 text-slate-500">Tao noi dung du doan de, sap xep uu tien va hien thi cho hoc vien.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <FileSearch size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{form.id ? 'Sua du doan' : 'Tao du doan'}</h2>
              <p className="text-sm text-slate-500">Hoc vien chi thay muc dang hien.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Ky nang</span>
                <select className="input" value={form.skill} onChange={(event) => setForm((current) => ({ ...current, skill: event.target.value as SkillType }))}>
                  {Object.entries(skillLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Trang thai</span>
                <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PredictionStatus }))}>
                  <option value="PUBLISHED">Dang hien</option>
                  <option value="DRAFT">Ban nhap</option>
                  <option value="ARCHIVED">Luu tru</option>
                </select>
              </label>
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Uu tien</span>
                <input className="input" type="number" min={1} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))} />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tieu de</span>
              <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="VD: Chu de Speaking de gap tuan nay" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Mo ta ngan</span>
              <textarea className="input min-h-[80px]" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Tom tat du doan..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Noi dung du doan</span>
              <textarea className="input min-h-[170px]" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Nhap noi dung chi tiet..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tag</span>
              <input className="input" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="VD: writing,email,part 4" />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" className="btn-primary justify-center" onClick={savePrediction} disabled={saving}>
                {form.id ? <Save size={18} /> : <Plus size={18} />}
                {saving ? 'Dang luu...' : form.id ? 'Cap nhat' : 'Luu du doan'}
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
                <h2 className="text-xl font-extrabold">Danh sach du doan</h2>
                <p className="text-sm text-slate-500">{items.length} muc du doan</p>
              </div>
              <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 lg:max-w-[320px]">
                <Search size={18} />
                <input className="w-full bg-transparent text-sm text-slate-700 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tim du doan..." />
              </label>
            </div>
          </div>

          <div className="max-h-[720px] space-y-3 overflow-y-auto p-5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-10 text-center font-bold text-slate-500">Dang tai du doan...</div>
            ) : filteredItems.length > 0 ? filteredItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{skillLabels[item.skill]}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{item.status}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Uu tien {item.priority}</span>
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
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center font-bold text-slate-500">Chua co du doan de nao.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
