import { ArrowRight, Bell, BookOpen, FileText, Headphones, Lightbulb, Megaphone, Mic, PenLine, SpellCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { AppNotification, Skill, SubscriptionResponse, Test } from '../../types';
import { formatSubscriptionDate, getSubscriptionStatus, saveSubscriptionUntil } from '../../utils/subscription';

const skillStyles = {
  Reading: { icon: BookOpen, color: 'bg-brand-600', soft: 'bg-blue-50 text-brand-600', subtitle: 'Tư duy đọc hiểu và từ vựng' },
  Listening: { icon: Headphones, color: 'bg-green-600', soft: 'bg-green-50 text-green-600', subtitle: 'Phản xạ nghe và ghi chú' },
  Speaking: { icon: Mic, color: 'bg-slate-700', soft: 'bg-slate-100 text-slate-600', subtitle: 'Phát âm và diễn đạt' },
  Writing: { icon: PenLine, color: 'bg-red-600', soft: 'bg-red-50 text-red-600', subtitle: 'Cấu trúc câu và văn phong' }
};

const notificationStyles = {
  INFO: {
    wrapper: 'border-blue-100 bg-blue-50/60',
    icon: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-600 text-white',
    label: 'Thông tin'
  },
  SUCCESS: {
    wrapper: 'border-emerald-100 bg-emerald-50/60',
    icon: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-600 text-white',
    label: 'Thành công'
  },
  WARNING: {
    wrapper: 'border-amber-100 bg-amber-50/70',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-500 text-white',
    label: 'Cảnh báo'
  },
  DANGER: {
    wrapper: 'border-rose-100 bg-rose-50/70',
    icon: 'bg-rose-100 text-rose-700',
    badge: 'bg-rose-600 text-white',
    label: 'Khẩn cấp'
  }
};

export function Dashboard() {
  const { data: skills } = useApi<Skill[]>(() => unwrap(api.get('/skills')), []);
  const { data: tests } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const { data: notifications } = useApi<AppNotification[]>(() => unwrap(api.get('/notifications/public')), []);
  const localSubscription = getSubscriptionStatus();
  const { data: serverSubscription } = useApi<SubscriptionResponse>(async () => {
    const subscription = await unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'));
    if (subscription.active) saveSubscriptionUntil(subscription.expiresAt);
    return subscription;
  }, []);

  const ordered = ['Reading', 'Listening', 'Speaking', 'Writing', 'Grammar']
    .map((name) => skills?.find((skill) => skill.name === name))
    .filter(Boolean) as Skill[];

  const visibleNotifications = (notifications ?? [])
    .filter((item) => item.audience === 'ALL' || item.audience === 'STUDENT')
    .slice(0, 5);
  const hasServerState = serverSubscription !== null;
  const subscription = {
    active: hasServerState ? Boolean(serverSubscription?.active) : localSubscription.active,
    expired: hasServerState ? Boolean(serverSubscription?.expiresAt && !serverSubscription.active) : localSubscription.expired,
    expireDate: serverSubscription?.expiresAt ? new Date(serverSubscription.expiresAt) : localSubscription.expireDate,
    daysLeft: serverSubscription?.daysLeft ?? localSubscription.daysLeft
  };

  return (
    <div className="space-y-9">
      <section className="overflow-hidden rounded-[18px] border border-brand-100 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
            <Megaphone size={16} /> Thông báo
          </div>
          <h1 className="text-2xl font-extrabold tracking-normal text-slate-950 sm:text-3xl">Thông báo hệ thống</h1>
        </div>

        <div className="rounded-2xl bg-brand-50/70 p-3">
          <div className="max-h-[300px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
            {visibleNotifications.length > 0 ? visibleNotifications.map((item, index) => (
              <NotificationItem
                key={item.id}
                icon={<Bell size={18} />}
                title={item.title}
                text={item.message}
                level={item.level}
                createdAt={item.createdAt}
                last={index === visibleNotifications.length - 1}
              />
            )) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
                Chưa có thông báo nào.
              </div>
            )}
          </div>
        </div>
      </section>

      {(subscription.active || subscription.expired) && (
        <section className={`rounded-[18px] border p-4 shadow-soft ${
          subscription.active ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-extrabold">
                {subscription.active ? 'Gói gia hạn đang hoạt động' : 'Gói gia hạn đã hết hạn'}
              </h2>
              <p className="mt-1 text-sm font-semibold">
                {subscription.active
                  ? `Bạn còn ${subscription.daysLeft} ngày học liệu, hết hạn ngày ${formatSubscriptionDate(subscription.expireDate)}.`
                  : `Gói của bạn đã hết hạn ngày ${formatSubscriptionDate(subscription.expireDate)}. Vui lòng gia hạn để tiếp tục học bài học và tài liệu form.`}
              </p>
            </div>
            <Link to="/app/renewal" className="btn-secondary h-10 px-5">
              {subscription.active ? 'Gia hạn thêm' : 'Gia hạn lại'}
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-7 md:grid-cols-2">
        {ordered.map((skill) => {
          const style = skillStyles[skill.name as keyof typeof skillStyles] ?? {
            icon: SpellCheck,
            color: 'bg-violet-600',
            soft: 'bg-violet-50 text-violet-600',
            subtitle: 'Ngu phap, tu vung va collocation'
          };
          const Icon = style.icon;
          const firstTest = tests?.find((test) => test.skillId === skill.id);
          return (
            <div className="rounded-[18px] border border-slate-200 bg-white p-7 shadow-soft" key={skill.id}>
              <div className="mb-7 flex items-center gap-4">
                <div className={`grid h-14 w-14 place-items-center rounded-xl ${style.soft}`}><Icon size={25} /></div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">{skill.name}</h2>
                  <p className="text-sm text-slate-500">{style.subtitle}</p>
                </div>
              </div>
              <div className="space-y-3">
                <ActionRow to={firstTest ? `/app/tests/${firstTest.id}` : '/app/tests'} color={style.color} icon={<FileText size={22} />} label="Học theo câu hỏi" primary />
                <ActionRow to="/app/tests" icon={<BookOpen size={22} />} label="Học theo bộ đề" />
                <ActionRow to="/app/tests" icon={<Lightbulb size={22} />} label="Mẹo học hay" />
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}

function NotificationItem({
  icon,
  title,
  text,
  level = 'INFO',
  createdAt,
  last
}: {
  icon: ReactNode;
  title: string;
  text: string;
  level?: AppNotification['level'];
  createdAt?: string;
  last?: boolean;
}) {
  const style = notificationStyles[level];

  return (
    <div className={`mb-3 flex gap-3 rounded-2xl border p-3 ${style.wrapper} ${last ? 'mb-0' : ''}`}>
      <div className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.icon}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-slate-900">{title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${style.badge}`}>{style.label}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
        {createdAt && <p className="mt-1 text-xs font-semibold text-slate-400">{formatNoticeDate(createdAt)}</p>}
      </div>
    </div>
  );
}

function formatNoticeDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(value));
}

function ActionRow({ to, icon, label, primary, color }: { to: string; icon: ReactNode; label: string; primary?: boolean; color?: string }) {
  return (
    <Link to={to} className={`flex h-[58px] items-center justify-between rounded-xl px-5 text-base font-bold transition ${primary ? `${color} text-white shadow-soft` : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
      <span className="flex items-center gap-4">{icon}{label}</span>
      {primary ? <ArrowRight size={20} /> : <ArrowRight size={18} className="text-slate-400" />}
    </Link>
  );
}
