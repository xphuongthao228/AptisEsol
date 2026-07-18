import { ChangeEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { FileAudio, FileImage, Trash2, UploadCloud } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';

interface MediaResponse { id: number; originalName: string; contentType: string; sizeBytes: number; type: string }

const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8080';

export function AdminMedia() {
  const { data, loading: loadingList, setData } = useApi<MediaResponse[]>(() => unwrap(api.get('/media')), []);
  const [loading, setLoading] = useState(false);
  const mediaList = data ?? [];

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setLoading(true);
    try {
      const uploaded = await unwrap<MediaResponse>(api.post('/media/upload', form));
      setData([uploaded, ...mediaList]);
      toast.success('Upload thành công');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Upload thất bại');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  async function remove(media: MediaResponse) {
    if (!window.confirm(`Xóa file ${media.originalName}?`)) return;
    await api.delete(`/media/${media.id}`);
    setData(mediaList.filter((item) => item.id !== media.id));
    toast.success('Đã xóa file');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Quản lý media</h1>
          <p className="mt-1 text-sm text-slate-500">Upload, xem và xóa ảnh/audio cho câu hỏi Aptis.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-slate-500">Tổng file</p>
          <p className="text-2xl font-extrabold">{mediaList.length}</p>
        </div>
      </div>

      <label className="card flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-8 text-center hover:bg-brand-50">
        <UploadCloud className="text-brand-600" size={42} />
        <span className="text-lg font-extrabold">{loading ? 'Đang upload...' : 'Chọn file ảnh hoặc audio'}</span>
        <span className="text-sm text-slate-500">Hỗ trợ image/* và audio/*, tối đa theo cấu hình backend.</span>
        <input className="hidden" type="file" accept="image/*,audio/*" onChange={upload} />
      </label>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-extrabold">Thư viện media</h2>
        </div>
        {loadingList ? <div className="p-6 text-sm text-slate-500">Đang tải media...</div> : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {mediaList.map((media) => {
              const Icon = media.type === 'AUDIO' ? FileAudio : FileImage;
              return (
                <div className="rounded-xl border border-slate-200 p-4" key={media.id}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{media.originalName}</p>
                      <p className="mt-1 text-xs text-slate-500">{media.type} | {Math.round(media.sizeBytes / 1024)} KB</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a className="btn-secondary h-9 flex-1 px-3" href={`${baseUrl}/api/media/${media.id}`} target="_blank">Xem</a>
                    <button className="btn-secondary h-9 px-3 text-red-600" onClick={() => remove(media)}><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loadingList && !mediaList.length && <div className="p-6 text-center text-sm text-slate-500">Chưa có media nào.</div>}
      </section>
    </div>
  );
}
