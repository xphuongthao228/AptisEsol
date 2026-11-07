import { useState, type FormEvent } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { BlogPost } from '../student/Blog';

const empty = { title: '', summary: '', content: '', coverUrl: '', category: 'Phương pháp học', published: false };

export function AdminBlog() {
  const { data, loading, error, reload, setData } = useApi(() => unwrap<BlogPost[]>(api.get('/blog/manage')), []);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  function reset() { setEditing(null); setForm({ ...empty }); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (![form.title, form.summary, form.content, form.category].every(value => value.trim())) { toast.error('Vui lòng điền đầy đủ nội dung bài viết'); return; }
    setSaving(true);
    try {
      const post = await unwrap<BlogPost>(editing ? api.put(`/blog/${editing}`, form) : api.post('/blog', form));
      setData(current => [post, ...(current ?? []).filter(p => p.id !== post.id)]);
      toast.success(post.published ? 'Đã đăng bài viết' : 'Đã lưu bản nháp');
      reset();
    } catch (error: any) { toast.error(error?.message || 'Không thể lưu bài viết'); }
    finally { setSaving(false); }
  }
  async function remove(post: BlogPost) {
    if (!window.confirm(`Xóa bài viết “${post.title}”?`)) return;
    try {
      await api.delete(`/blog/${post.id}`);
      setData(current => (current ?? []).filter(p => p.id !== post.id));
      if (editing === post.id) reset();
      toast.success('Đã xóa bài viết');
    } catch (error: any) { toast.error(error?.message || 'Không thể xóa bài viết'); }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold">Blog học tập</h1><p className="mt-2 text-sm text-slate-500">Viết bài chia sẻ và chọn thời điểm đăng lên trang chủ.</p></div><button onClick={reset} disabled={saving} className="btn-secondary px-4 py-3"><Plus size={16} /> Bài viết mới</button></div>
    <form onSubmit={save} className="card space-y-4 p-5 sm:p-7">
      <h2 className="text-lg font-extrabold">{editing ? 'Chỉnh sửa bài viết' : 'Soạn bài viết'}</h2>
      <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm font-bold">Tiêu đề<input required maxLength={200} className="input mt-2 w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ví dụ: Xây dựng thói quen luyện Listening mỗi ngày" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Chủ đề<input required maxLength={80} className="input mt-2 w-full" list="blog-categories" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /><datalist id="blog-categories">{['Phương pháp học','Listening','Speaking','Reading','Writing','Kinh nghiệm ôn thi'].map(c => <option key={c} value={c} />)}</datalist></label>
          <label className="block text-sm font-bold">URL ảnh bìa (tùy chọn)<input type="url" maxLength={2000} className="input mt-2 w-full" value={form.coverUrl} onChange={e => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://…" /></label></div>
        <label className="block text-sm font-bold">Mô tả ngắn<textarea required maxLength={600} rows={3} className="input mt-2 w-full" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></label>
        <label className="block text-sm font-bold">Nội dung<textarea required maxLength={100000} rows={14} className="input mt-2 w-full leading-7" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Viết nội dung tại đây. Để một dòng trống giữa các đoạn văn." /></label>
        <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />Đăng công khai (bỏ chọn để lưu nháp)</label>
        <button className="btn-primary px-5 py-3" type="submit">{saving ? 'Đang lưu…' : form.published ? 'Lưu và đăng bài' : 'Lưu bản nháp'}</button>
      </fieldset>
    </form>
    <section className="card p-5 sm:p-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="flex items-center gap-2 text-lg font-extrabold"><BookOpen size={20} /> Bài viết ({data?.length ?? 0})</h2><input aria-label="Tìm bài viết" className="input" placeholder="Tìm bài viết…" value={query} onChange={e => setQuery(e.target.value)} /></div>
      {loading ? <p>Đang tải…</p> : error ? <p>Chưa tải được bài viết. <button onClick={reload} className="underline">Thử lại</button></p> : !data?.length ? <p className="py-6 text-center text-slate-500">Chưa có bài viết. Soạn bài đầu tiên ở trên.</p> : <div className="divide-y divide-slate-100">{data.filter(p => p.title.toLowerCase().includes(query.toLowerCase())).map(post => <div key={post.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="font-bold">{post.title}</p><p className="mt-1 text-xs text-slate-500">{post.category} · <span className={post.published ? 'text-emerald-600' : 'text-amber-600'}>{post.published ? 'Đã đăng' : 'Bản nháp'}</span></p></div><div className="flex gap-2"><button disabled={saving} className="btn-secondary px-3 py-2" onClick={() => { setEditing(post.id); setForm({ title: post.title, summary: post.summary, content: post.content, category: post.category, coverUrl: post.coverUrl ?? '', published: post.published }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={15} /> Sửa</button><button disabled={saving} aria-label={`Xóa ${post.title}`} className="btn-secondary px-3 py-2 text-red-600" onClick={() => remove(post)}><Trash2 size={15} /></button></div></div>)}</div>}
    </section>
  </div>;
}
