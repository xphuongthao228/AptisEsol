import { ChangeEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Eye, EyeOff, FileAudio, FileImage, ImagePlus, Link, Trash2, UploadCloud } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';

interface MediaResponse {
  id: number;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  type: string;
  banner: boolean;
  bannerActive: boolean;
  bannerSortOrder: number;
  sourceUrl?: string | null;
}

const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8080';

export function AdminMedia() {
  const { data, loading: loadingList, setData } = useApi<MediaResponse[]>(() => unwrap(api.get('/media')), []);
  const [loading, setLoading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const mediaList = data ?? [];
  const bannerList = mediaList
    .filter((media) => media.banner)
    .sort((first, second) => first.bannerSortOrder - second.bannerSortOrder || first.id - second.id);

  async function saveBanner(media: MediaResponse, changes: Partial<Pick<MediaResponse, 'banner' | 'bannerActive' | 'bannerSortOrder'>>) {
    const next = { ...media, ...changes };
    const updated = await unwrap<MediaResponse>(api.patch(`/media/${media.id}/banner`, {
      banner: next.banner,
      active: next.bannerActive,
      sortOrder: next.bannerSortOrder
    }));
    setData((current) => (current ?? []).map((item) => item.id === updated.id ? updated : item));
    return updated;
  }

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

  async function uploadBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Banner phải là file ảnh');
      event.target.value = '';
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setLoading(true);
    try {
      const uploaded = await unwrap<MediaResponse>(api.post('/media/upload', form));
      const banner = await unwrap<MediaResponse>(api.patch(`/media/${uploaded.id}/banner`, {
        banner: true,
        active: true,
        sortOrder: bannerList.length
      }));
      setData((current) => [banner, ...(current ?? [])]);
      toast.success('Đã thêm ảnh vào banner');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không thể thêm ảnh banner');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  async function addBannerUrl() {
    const url = bannerUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      toast.error('Vui lòng nhập URL ảnh hợp lệ (http hoặc https)');
      return;
    }
    setLoading(true);
    try {
      const banner = await unwrap<MediaResponse>(api.post('/media/banner-url', { url, sortOrder: bannerList.length }));
      setData((current) => [banner, ...(current ?? [])]);
      setBannerUrl('');
      toast.success('Đã thêm URL vào banner');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không thể thêm URL banner');
    } finally {
      setLoading(false);
    }
  }

  async function moveBanner(index: number, direction: number) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= bannerList.length) return;
    const current = bannerList[index];
    const target = bannerList[targetIndex];
    try {
      const [updatedCurrent, updatedTarget] = await Promise.all([
        unwrap<MediaResponse>(api.patch(`/media/${current.id}/banner`, { banner: true, active: current.bannerActive, sortOrder: targetIndex })),
        unwrap<MediaResponse>(api.patch(`/media/${target.id}/banner`, { banner: true, active: target.bannerActive, sortOrder: index }))
      ]);
      setData((items) => (items ?? []).map((item) => {
        if (item.id === updatedCurrent.id) return updatedCurrent;
        if (item.id === updatedTarget.id) return updatedTarget;
        return item;
      }));
    } catch {
      toast.error('Không thể đổi thứ tự banner');
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
          <p className="mt-1 text-sm text-slate-600">Upload, xem và xóa ảnh/audio cho câu hỏi Aptis.</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-slate-600">Tổng file</p>
          <p className="text-2xl font-extrabold">{mediaList.length}</p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-brand-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold">Ảnh banner trang chủ</h2>
            <p className="mt-1 text-sm text-slate-600">Quản lý ảnh và thứ tự xuất hiện trong slider.</p>
          </div>
          <label className="btn-primary h-10 cursor-pointer px-4 text-sm">
            <ImagePlus size={17} />{loading ? 'Đang tải...' : 'Thêm ảnh banner'}
            <input className="hidden" type="file" accept="image/*" onChange={uploadBanner} disabled={loading} />
          </label>
        </div>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Link size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input h-10 w-full pl-10" type="url" value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} placeholder="Dán URL ảnh banner, ví dụ https://.../banner.jpg" disabled={loading} />
          </div>
          <button type="button" className="btn-secondary h-10 px-4 text-sm" onClick={addBannerUrl} disabled={loading || !bannerUrl.trim()}>Thêm từ URL</button>
        </div>
        {bannerList.length ? (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {bannerList.map((media, index) => (
              <article className="overflow-hidden rounded-lg border border-brand-100 bg-white" key={media.id}>
                <div className="aspect-[16/6] bg-slate-100">
                  <img src={media.sourceUrl || `${baseUrl}/api/media/${media.id}`} alt={media.originalName} className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-navy">{media.originalName}</p>
                    <p className={`mt-0.5 text-xs font-bold ${media.bannerActive ? 'text-emerald-600' : 'text-slate-400'}`}>{media.bannerActive ? 'Đang hiển thị' : 'Đang ẩn'}</p>
                  </div>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 disabled:opacity-30" disabled={index === 0} onClick={() => moveBanner(index, -1)} title="Đưa lên"><ArrowUp size={16} /></button>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 disabled:opacity-30" disabled={index === bannerList.length - 1} onClick={() => moveBanner(index, 1)} title="Đưa xuống"><ArrowDown size={16} /></button>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-brand-700" onClick={() => saveBanner(media, { bannerActive: !media.bannerActive })} title={media.bannerActive ? 'Ẩn banner' : 'Hiện banner'}>{media.bannerActive ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-red-100 text-red-600" onClick={() => remove(media)} title="Xóa ảnh"><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-600">Chưa có ảnh banner. Trang chủ đang dùng hình mặc định.</div>
        )}
      </section>

      <label className="card flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-8 text-center hover:bg-brand-50">
        <UploadCloud className="text-brand-600" size={42} />
        <span className="text-lg font-extrabold">{loading ? 'Đang upload...' : 'Chọn file ảnh hoặc audio'}</span>
        <span className="text-sm text-slate-600">Hỗ trợ image/* và audio/*, tối đa theo cấu hình backend.</span>
        <input className="hidden" type="file" accept="image/*,audio/*" onChange={upload} />
      </label>

      <section className="card overflow-hidden">
        <div className="border-b border-brand-100 p-5">
          <h2 className="text-xl font-extrabold">Thư viện media</h2>
        </div>
        {loadingList ? <div className="p-6 text-sm text-slate-600">Đang tải media...</div> : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {mediaList.map((media) => {
              const Icon = media.type === 'AUDIO' ? FileAudio : FileImage;
              return (
                <div className="rounded-xl border border-brand-100 p-4" key={media.id}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{media.originalName}</p>
                      <p className="mt-1 text-xs text-slate-600">{media.type} | {Math.round(media.sizeBytes / 1024)} KB</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a className="btn-secondary h-9 flex-1 px-3" href={media.sourceUrl || `${baseUrl}/api/media/${media.id}`} target="_blank" rel="noreferrer">Xem</a>
                    <button className="btn-secondary h-9 px-3 text-red-600" onClick={() => remove(media)}><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loadingList && !mediaList.length && <div className="p-6 text-center text-sm text-slate-600">Chưa có media nào.</div>}
      </section>
    </div>
  );
}


