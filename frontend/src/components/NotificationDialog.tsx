import { Bell, Pin, X } from 'lucide-react';
import type { AppNotification } from '../types';

const notificationLevelStyles: Record<AppNotification['level'], string> = {
  INFO: 'bg-blue-50 text-blue-700 ring-blue-100',
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  WARNING: 'bg-amber-50 text-amber-700 ring-amber-100',
  DANGER: 'bg-rose-50 text-rose-700 ring-rose-100'
};

const notificationLevelLabels: Record<AppNotification['level'], string> = {
  INFO: 'Thông tin',
  SUCCESS: 'Thành công',
  WARNING: 'Cảnh báo',
  DANGER: 'Khẩn cấp'
};

export function NotificationDialog({ notification, onClose }: { notification: AppNotification | null; onClose: () => void }) {
  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="notification-dialog-title">
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-brand-100 bg-white text-left shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-brand-100 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Bell size={21} />
            </span>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {notification.pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-extrabold text-white">
                    <Pin size={12} />
                    Ghim
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${notificationLevelStyles[notification.level]}`}>
                  {notificationLevelLabels[notification.level]}
                </span>
              </div>
              <h2 id="notification-dialog-title" className="text-xl font-extrabold leading-7 text-navy">
                {notification.title}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{formatNotificationDialogDate(notification.createdAt)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
            aria-label="Đóng thông báo"
          >
            <X size={19} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          <p className="whitespace-pre-line text-sm font-medium leading-7 text-slate-700">{notification.message}</p>
        </div>
      </div>
    </div>
  );
}

function formatNotificationDialogDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}
