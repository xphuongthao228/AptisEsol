import { MaterialEditor } from '../../components/MaterialEditor';
import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { materialCategories, mediaUrl, normalizeMaterialContent, validMaterialUrl, type LearningMaterial } from '../../utils/learningMaterials';

type Draft = Omit<LearningMaterial, 'id'>;
const emptyDraft = (): Draft => ({ title: '', category: 'Grammar', description: '', coverUrl: '', resourceUrl: '', content: '', visible: true, sortOrder: 0 });

export function AdminLearningMaterials() {
  const { data, loading, error, reload, setData } = useApi<LearningMaterial[]>(() => unwrap(api.get('/learning-materials')));
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const items = (data ?? []).filter(item => (!category || item.category === category) && item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  function edit(item?: LearningMaterial) {
    setEditing(item?.id ?? null);
    setDraft(item ? { ...item, content: normalizeMaterialContent(item.content ?? '') } : { ...emptyDraft(), sortOrder: Math.max(-1, ...(data ?? []).map(value => value.sortOrder)) + 1 });
    setFormOpen(true);
  }
  async function upload(event: ChangeEvent<HTMLInputElement>, field: 'resourceUrl' | 'coverUrl') {
    const file = event.target.files?.[0];
    if (!file) return;
    const isCover = field === 'coverUrl';
    if (!(isCover ? /\.(png|jpe?g|webp|gif)$/i : /\.(pdf|docx?|xlsx?|pptx?|zip)$/i).test(file.name)) {
      toast.error(isCover ? 'Chọn ảnh PNG, JPG, WEBP hoặc GIF' : 'Chọn file PDF, Word, Excel, PowerPoint hoặc ZIP');
      event.target.value = '';
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      const result = await unwrap<{ id: number }>(api.post('/media/upload', form));
      setDraft(current => ({ ...current, [field]: mediaUrl(result.id) }));
      toast.success('Đã tải file lên. Bấm Lưu để cập nhật tài liệu.');
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Không thể tải file lên'); }
    finally { setBusy(false); event.target.value = ''; }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if ((draft.content?.length ?? 0) > 100000) { toast.error('Nội dung quá dài. Vui lòng rút gọn trước khi lưu.'); return; }
    if (!validMaterialUrl(draft.resourceUrl ?? '') || !validMaterialUrl(draft.coverUrl ?? '')) {
      toast.error('Liên kết phải bắt đầu bằng http://, https:// hoặc /'); return;
    }
    setBusy(true);
    try {
      const payload = { ...draft, content: normalizeMaterialContent(draft.content ?? ''), title: draft.title.trim(), coverUrl: draft.coverUrl?.trim(), resourceUrl: draft.resourceUrl?.trim() };
      const item = await unwrap<LearningMaterial>(editing === null ? api.post('/learning-materials', payload) : api.put(`/learning-materials/${editing}`, payload));
      setData(current => [...(current ?? []).filter(value => value.id !== item.id), item].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
      setFormOpen(false);
      reload();
      toast.success('Đã lưu tài liệu');
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Không thể lưu tài liệu'); }
    finally { setBusy(false); }
  }
  async function remove(item: LearningMaterial) {
    if (!window.confirm(`Xóa tài liệu “${item.title}”?`)) return;
    setBusy(true);
    try {
      await api.delete(`/learning-materials/${item.id}`);
      setData(current => (current ?? []).filter(value => value.id !== item.id));
      if (editing === item.id) setFormOpen(false);
      toast.success('Đã xóa tài liệu');
    } catch { toast.error('Không thể xóa tài liệu'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">Quản lý tài liệu học tập</h1><p className="mt-1 text-sm text-slate-600">Quản lý chung bài viết học tập và file tài liệu tải về.</p></div>
      <button type="button" className="btn-primary" disabled={busy || loading} onClick={() => edit()}><Plus size={18} />Thêm tài liệu</button>
    </div>
    {formOpen && <form className="card space-y-4 p-5" onSubmit={save}>
      <h2 className="text-lg font-extrabold">{editing === null ? 'Thêm tài liệu' : 'Chỉnh sửa tài liệu'}</h2>
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2 disabled:opacity-60">
        <label className="space-y-1 text-sm font-bold">Tên tài liệu<input className="input w-full" required maxLength={255} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label className="space-y-1 text-sm font-bold">Phân loại<select className="input w-full" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{[...new Set([...materialCategories, ...(data ?? []).map(item => item.category)])].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="space-y-1 text-sm font-bold md:col-span-2">Mô tả<textarea className="input min-h-24 w-full" maxLength={1000} value={draft.description ?? ''} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <div className="space-y-2"><label className="block text-sm font-bold">Liên kết tài liệu<input className="input mt-1 w-full" placeholder="https://... hoặc /docs/..." value={draft.resourceUrl ?? ''} onChange={e => setDraft({ ...draft, resourceUrl: e.target.value })} /></label><input aria-label="Tải file tài liệu" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={e => upload(e, 'resourceUrl')} /><p className="text-xs text-slate-500">Có thể để trống nếu chỉ đăng bài viết để đọc.</p></div>
        <div className="space-y-2"><label className="block text-sm font-bold">Liên kết ảnh bìa<input className="input mt-1 w-full" placeholder="Để trống để dùng bìa mặc định" value={draft.coverUrl ?? ''} onChange={e => setDraft({ ...draft, coverUrl: e.target.value })} /></label><input aria-label="Tải ảnh bìa" type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={e => upload(e, 'coverUrl')} />{draft.coverUrl && validMaterialUrl(draft.coverUrl) && <img src={draft.coverUrl} alt="Ảnh bìa tài liệu" className="h-24 w-40 rounded-lg object-cover" />}</div>
        <div className="space-y-2 text-sm md:col-span-2"><h3 className="font-bold">Nội dung bài viết</h3><MaterialEditor key={editing ?? "new"} value={draft.content ?? ""} disabled={busy} onChange={content => setDraft(current => ({ ...current, content }))} /></div>
        <label className="space-y-1 text-sm font-bold">Thứ tự hiển thị<input className="input w-full" required type="number" min={0} step={1} value={draft.sortOrder} onChange={e => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /><span className="block text-xs font-normal text-slate-500">Số nhỏ hiển thị trước.</span></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.visible} onChange={e => setDraft({ ...draft, visible: e.target.checked })} />Hiển thị cho học viên</label>
      </fieldset>
      <div className="flex gap-2"><button className="btn-primary" disabled={busy}>{busy ? 'Đang xử lý...' : 'Lưu tài liệu'}</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => setFormOpen(false)}>Hủy</button></div>
    </form>}
    <div className="flex flex-wrap gap-3"><input className="input flex-1" aria-label="Tìm tài liệu" placeholder="Tìm theo tên tài liệu..." value={search} onChange={e => setSearch(e.target.value)} /><select className="input" aria-label="Lọc phân loại" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả phân loại</option>{materialCategories.map(value => <option key={value}>{value}</option>)}</select></div>
    {loading ? <p>Đang tải tài liệu...</p> : error ? <div className="card p-5"><p>{error}</p><button className="btn-secondary mt-3" onClick={reload}>Thử lại</button></div> : <div className="grid gap-4 lg:grid-cols-2">
      {items.map(item => <article key={item.id} className="card space-y-3 p-5">
        <div className="flex gap-3">{item.coverUrl && <img src={item.coverUrl} alt="" className="h-20 w-24 rounded-lg object-cover" />}<div className="min-w-0"><h2 className="break-words font-extrabold">{item.title}</h2><p className="text-xs text-slate-500">{item.category} · Thứ tự {item.sortOrder} · {item.visible ? 'Đang hiển thị' : 'Đang ẩn'}</p><p className="mt-2 break-words text-sm text-slate-600">{item.description}</p></div></div>
        <p className={`text-xs font-bold ${item.resourceUrl || item.content ? 'text-emerald-700' : 'text-amber-700'}`}>{[item.content ? 'Có bài viết' : '', item.resourceUrl ? 'Có file đính kèm' : ''].filter(Boolean).join(' · ') || 'Đang cập nhật'}</p>
        <div className="flex flex-wrap gap-2">{item.resourceUrl && <a className="btn-secondary" href={item.resourceUrl} target="_blank" rel="noopener noreferrer"><Download size={16} />Xem file</a>}<button className="btn-secondary" disabled={busy} onClick={() => edit(item)}><Pencil size={16} />Sửa</button><button className="btn-secondary text-red-600" disabled={busy} onClick={() => remove(item)}><Trash2 size={16} />Xóa</button></div>
      </article>)}
      {!items.length && <p className="p-5 text-sm text-slate-500">Chưa có tài liệu phù hợp. Bấm “Thêm tài liệu” để tạo mới.</p>}
    </div>}
  </div>;
}
