import { type FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, CheckCircle2, Megaphone, Pencil, Pin, PinOff, Plus, Trash2, XCircle } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import type { AppNotification, NotificationAudience, NotificationLevel } from '../../types';

type FormState = {
  title: string;
  message: string;
  audience: NotificationAudience;
  level: NotificationLevel;
  active: boolean;
  pinned: boolean;
};

const emptyForm: FormState = {
  title: '',
  message: '',
  audience: 'ALL',
  level: 'INFO',
  active: true,
  pinned: false
};

const audienceLabels: Record<NotificationAudience, string> = {
  ALL: 'Tất cả',
  STUDENT: 'Học viên',
  ADMIN: 'Quản trị viên'
};

const levelLabels: Record<NotificationLevel, string> = {
  INFO: 'Thông tin',
  SUCCESS: 'Thành công',
  WARNING: 'Cảnh báo',
  DANGER: 'Khẩn cấp'
};

const levelStyles: Record<NotificationLevel, string> = {
  INFO: 'bg-blue-50 text-blue-700 ring-blue-100',
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  WARNING: 'bg-amber-50 text-amber-700 ring-amber-100',
  DANGER: 'bg-rose-50 text-rose-700 ring-rose-100'
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function apiErrorMessage(error: any, fallback: string) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  const errors = error?.response?.data?.errors;

  if (status === 403) {
    return `${fallback}: tài khoản hiện tại không có quyền ADMIN hoặc phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại bằng tài khoản admin.`;
  }

  if (errors && typeof errors === 'object') {
    const detail = Object.entries(errors)
      .map(([field, value]) => `${field}: ${String(value)}`)
      .join(', ');
    if (detail) return `${fallback}: ${detail}`;
  }

  if (message) return `${fallback}: ${message}`;
  if (status) return `${fallback} (HTTP ${status})`;
  return fallback;
}

function sortNotifications(items: AppNotification[]) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function AdminNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const activeCount = useMemo(() => items.filter((item) => item.active).length, [items]);
  const pinnedCount = useMemo(() => items.filter((item) => item.pinned).length, [items]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      setItems(sortNotifications(await unwrap<AppNotification[]>(api.get('/notifications'))));
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không tải được thông báo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung thông báo');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), message: form.message.trim() };
      const saved = editingId
        ? await unwrap<AppNotification>(api.put(`/notifications/${editingId}`, payload))
        : await unwrap<AppNotification>(api.post('/notifications', payload));

      setItems((current) => sortNotifications(
        editingId ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]
      ));
      toast.success(editingId ? 'Đã cập nhật thông báo' : 'Đã tạo thông báo');
      resetForm();
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không lưu được thông báo'));
    } finally {
      setSaving(false);
    }
  };

  const edit = (notification: AppNotification) => {
    setEditingId(notification.id);
    setForm({
      title: notification.title,
      message: notification.message,
      audience: notification.audience,
      level: notification.level,
      active: notification.active,
      pinned: notification.pinned
    });
  };

  const togglePinned = async (notification: AppNotification) => {
    try {
      const saved = await unwrap<AppNotification>(api.put(`/notifications/${notification.id}`, {
        title: notification.title,
        message: notification.message,
        audience: notification.audience,
        level: notification.level,
        active: notification.active,
        pinned: !notification.pinned
      }));
      setItems((current) => sortNotifications(current.map((item) => (item.id === saved.id ? saved : item))));
      toast.success(saved.pinned ? 'Đã ghim thông báo lên đầu' : 'Đã bỏ ghim thông báo');
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không cập nhật trạng thái ghim'));
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Bạn muốn xóa thông báo này?')) return;
    try {
      await unwrap(api.delete(`/notifications/${id}`));
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success('Đã xóa thông báo');
      if (editingId === id) resetForm();
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không xóa được thông báo'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              <Megaphone size={15} />
              Trung tâm thông báo
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Quản lý thông báo</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Tạo thông báo cho học viên hoặc quản trị viên. Thông báo được ghim sẽ luôn nổi lên đầu danh sách.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-extrabold">{items.length}</p>
              <p className="text-xs font-semibold text-slate-300">Tổng</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-extrabold">{activeCount}</p>
              <p className="text-xs font-semibold text-slate-300">Đang bật</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-extrabold">{pinnedCount}</p>
              <p className="text-xs font-semibold text-slate-300">Đã ghim</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-brand-600">
              <Bell size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">{editingId ? 'Sửa thông báo' : 'Tạo thông báo'}</h2>
              <p className="text-sm text-slate-500">Nội dung ngắn gọn, dễ hiểu.</p>
            </div>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-bold text-slate-700">Tiêu đề</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Ví dụ: Lịch bảo trì hệ thống"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-bold text-slate-700">Nội dung</span>
            <textarea
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              rows={5}
              placeholder="Nhập nội dung thông báo..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </label>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-sm font-bold text-slate-700">Người nhận</span>
              <select
                value={form.audience}
                onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as NotificationAudience }))}
                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {Object.entries(audienceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-bold text-slate-700">Mức độ</span>
              <select
                value={form.level}
                onChange={(event) => setForm((current) => ({ ...current, level: event.target.value as NotificationLevel }))}
                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {Object.entries(levelLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-700">Hiển thị thông báo</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                <Pin size={16} />
                Ghim lên đầu
              </span>
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                className="h-5 w-5 rounded border-blue-200 text-brand-600 focus:ring-brand-500"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={18} />
              {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo thông báo'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
            )}
          </div>
        </form>

        <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">Danh sách thông báo</h2>
              <p className="text-sm text-slate-500">Thông báo đã ghim sẽ nằm trên cùng.</p>
            </div>
            <button
              onClick={loadNotifications}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Tải lại
            </button>
          </div>

          <div className="max-h-[680px] space-y-3 overflow-y-auto p-5">
            {loading && <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">Đang tải thông báo...</div>}
            {!loading && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <Bell className="mx-auto mb-3 text-slate-300" size={36} />
                <p className="font-bold text-slate-700">Chưa có thông báo nào</p>
                <p className="mt-1 text-sm text-slate-500">Tạo thông báo đầu tiên ở form bên trái.</p>
              </div>
            )}
            {!loading && items.map((notification) => (
              <article key={notification.id} className={`rounded-2xl border p-4 transition hover:shadow-sm ${notification.pinned ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-brand-200'}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {notification.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-extrabold text-white">
                          <Pin size={13} />
                          Đã ghim
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${levelStyles[notification.level]}`}>
                        {levelLabels[notification.level]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {audienceLabels[notification.audience]}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${notification.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {notification.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {notification.active ? 'Đang bật' : 'Đã tắt'}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-950">{notification.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{notification.message}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-400">Tạo lúc {formatDate(notification.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => togglePinned(notification)}
                      className={`grid h-10 w-10 place-items-center rounded-xl border ${notification.pinned ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      title={notification.pinned ? 'Bỏ ghim thông báo' : 'Ghim thông báo lên đầu'}
                    >
                      {notification.pinned ? <PinOff size={18} /> : <Pin size={18} />}
                    </button>
                    <button
                      onClick={() => edit(notification)}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Sửa thông báo"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => remove(notification.id)}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50"
                      title="Xóa thông báo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
