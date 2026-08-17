import { ArrowRight, Bell, BookOpen, FileText, Headphones, Lightbulb, Megaphone, MessageCircle, Mic, PenLine, Sparkles, SpellCheck, Users, X } from 'lucide-react';
import { useState, type MouseEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { AppNotification, Skill, SubscriptionResponse, Test } from '../../types';
import { formatSubscriptionDate, getSubscriptionStatus, saveSubscriptionUntil } from '../../utils/subscription';

const skillStyles = {
  Reading: { icon: BookOpen, color: 'bg-brand-600', soft: 'bg-blue-50 text-brand-600', subtitle: 'Tư duy đọc hiểu và từ vựng' },
  Listening: { icon: Headphones, color: 'bg-green-600', soft: 'bg-green-50 text-green-600', subtitle: 'Phản xạ nghe và ghi chú' },
  Speaking: { icon: Mic, color: 'bg-slate-700', soft: 'bg-slate-100 text-slate-600', subtitle: 'Phát âm và diễn đạt' },
  Writing: { icon: PenLine, color: 'bg-red-600', soft: 'bg-red-50 text-red-600', subtitle: 'Cấu trúc câu và văn phong' }
};

const publicSkills: Skill[] = [
  { id: 1, type: 'READING', name: 'Reading', description: 'Reading practice' },
  { id: 2, type: 'LISTENING', name: 'Listening', description: 'Listening practice' },
  { id: 3, type: 'SPEAKING', name: 'Speaking', description: 'Speaking practice' },
  { id: 4, type: 'WRITING', name: 'Writing', description: 'Writing practice' }
];

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
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: skills } = useApi<Skill[]>(() => unwrap(api.get('/skills')), []);
  const { data: tests } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const { data: notifications } = useApi<AppNotification[]>(() => unwrap(api.get('/notifications/public')), []);
  const localSubscription = accessToken ? getSubscriptionStatus() : { active: false, expired: false, expireDate: null, daysLeft: 0 };
  const { data: serverSubscription } = useApi<SubscriptionResponse>(async () => {
    if (!accessToken) return { active: false, expiresAt: null, daysLeft: 0 };
    const subscription = await unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'));
    if (subscription.active) saveSubscriptionUntil(subscription.expiresAt);
    return subscription;
  }, [accessToken]);

  const displaySkills = skills?.length ? skills : publicSkills;
  const ordered = ['Reading', 'Listening', 'Speaking', 'Writing', 'Grammar']
    .map((name) => displaySkills.find((skill) => skill.name === name))
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
      <CommunityInviteModal />
      <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
              <Sparkles size={16} /> LingoMaster Aptis ESOL
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
              Luyện Aptis theo bộ đề, học mẹo nhanh và nhận nhận xét AI sau khi làm bài
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              Web hỗ trợ Reading, Listening, Speaking, Writing và Grammar với giao diện luyện thi rõ ràng. Phần Writing và Speaking có chấm AI để ước tính điểm, CEFR, chỉ ra lỗi chính và gợi ý cách cải thiện bài làm.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/app/exams" className="btn-primary h-12 px-5">
                Vào bộ đề <ArrowRight size={18} />
              </Link>
              <Link to="/app/mock-tests" className="btn-secondary h-12 px-5">
                Thi thử AI
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0">
            <FeaturePill icon={<PenLine size={20} />} title="Writing AI" text="Chấm bài viết, sửa lỗi và gợi ý bài mẫu." />
            <FeaturePill icon={<Mic size={20} />} title="Speaking AI" text="Nhận xét transcript, điểm mạnh và cách nói tốt hơn." />
            <FeaturePill icon={<MessageCircle size={20} />} title="Lingo" text="Hỏi nhanh ngữ pháp, từ vựng và cách làm bài." />
          </div>
        </div>
      </section>

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
            subtitle: 'Ngữ pháp, từ vựng và collocation'
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
                <ActionRow to="/app/lessons" icon={<Lightbulb size={22} />} label="Mẹo học hay" />
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}

function FeaturePill({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h2 className="text-sm font-extrabold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

export const communityInviteDismissedKey = 'aptis-community-invite-dismissed';

function CommunityInviteModal() {
  const [open, setOpen] = useState(() => sessionStorage.getItem(communityInviteDismissedKey) !== 'true');

  const dismiss = () => {
    sessionStorage.setItem(communityInviteDismissedKey, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm" onClick={dismiss}>
      <section className="relative w-full max-w-[474px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0757d8] via-[#0787ff] to-[#63d7ff] px-9 pb-9 pt-8 text-center text-white shadow-[0_24px_80px_rgba(15,23,42,0.38)]" onClick={(event) => event.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:22px_22px]" />
          <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-white/70 text-white transition hover:bg-white/15"
          aria-label={'\u0110\u00f3ng popup c\u1ed9ng \u0111\u1ed3ng'}
        >
          <X size={26} />
        </button>

        <div className="relative z-10">
          <div className="mx-auto grid h-[74px] w-[74px] place-items-center rounded-full bg-white/16 shadow-[0_0_0_6px_rgba(255,255,255,0.08)]">
            <Users size={36} strokeWidth={2.2} />
          </div>
          <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-white/24 px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide">
            <Sparkles size={15} />
            AptisLingo
          </p>
          <h2 className="mt-6 text-[28px] font-black leading-tight">
            {'Tham gia nh\u00f3m h\u1ecdc t\u1eadp & Review \u0111\u1ec1'}
          </h2>
          <p className="mx-auto mt-5 max-w-[360px] text-[19px] font-semibold leading-8 text-white/92">
            {'Tham gia c\u1ed9ng \u0111\u1ed3ng t\u1ef1 h\u1ecdc & gi\u1ea3i \u0111\u00e1p Aptis \u0111\u1ec3 nhanh \u0111\u1ea1t m\u1ee5c ti\u00eau.'}
          </p>

          <div className="mt-8 space-y-4">
            <a
              href="https://www.facebook.com/groups/1017783430680359"
              target="_blank"
              rel="noreferrer"
              className="flex h-14 items-center justify-center gap-3 rounded-full bg-white px-5 text-[17px] font-extrabold text-[#0757d8] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1877f2] text-sm font-black leading-none text-white">f</span>
              {'C\u1ed9ng \u0111\u1ed3ng Facebook'}
              <ArrowRight size={18} />
            </a>
            <a
              href="https://zalo.me/g/n1f3m9mamomr1vnhs6lw"
              target="_blank"
              rel="noreferrer"
              className="flex h-14 items-center justify-center gap-3 rounded-full bg-[#087cff] px-5 text-[17px] font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <MessageCircle size={20} fill="currentColor" />
              {'C\u1ed9ng \u0111\u1ed3ng Zalo'}
              <ArrowRight size={18} />
            </a>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-6 text-base font-bold text-white/88 transition hover:text-white"
          >
            {'\u0110\u1ec3 sau'}
          </button>
        </div>
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
  const accessToken = useAuthStore((s) => s.accessToken);

  const requireLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    if (accessToken) return;

    event.preventDefault();
    toast.error('Bạn cần đăng nhập để sử dụng chức năng này.', { id: 'login-required' });
  };

  return (
    <Link to={to} onClick={requireLogin} className={`flex h-[58px] items-center justify-between rounded-xl px-5 text-base font-bold transition ${primary ? `${color} text-white shadow-soft` : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
      <span className="flex items-center gap-4">{icon}{label}</span>
      {primary ? <ArrowRight size={20} /> : <ArrowRight size={18} className="text-slate-400" />}
    </Link>
  );
}
