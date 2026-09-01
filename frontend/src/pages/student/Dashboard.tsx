import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Lightbulb,
  MessageCircle,
  Monitor,
  Pin,
  Rocket,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import type { AppNotification } from '../../types';

const stats = [
  ['120+', 'Bộ luyện Aptis'],
  ['850+', 'Tài khoản học viên'],
  ['18K+', 'Bài đã hoàn thành'],
  ['24h', 'Cập nhật nội dung']
];

const testimonialSlides = [
  {
    image: '/testimonials/score-01.png',
    alt: 'Học viên đạt B2 sau khi ôn Aptis Lingo',
    quote: 'Ôn aim B1 mà được B2 nha mọi người.'
  },
  {
    image: '/testimonials/score-02.png',
    alt: 'Kết quả Aptis B2 của học viên',
    quote: 'Đạt aim rồi mọi người ơi, học theo key admin đi.'
  },
  {
    image: '/testimonials/score-03.png',
    alt: 'Học viên nhận kết quả Aptis B2',
    quote: 'Ca sáng 8/8 tra được điểm rồi ạ.'
  },
  {
    image: '/testimonials/score-04.png',
    alt: 'Feedback học viên vượt aim Aptis',
    quote: 'Đã vượt qua sóng gió.'
  },
  {
    image: '/testimonials/score-05.png',
    alt: 'Chứng chỉ Aptis B2 của học viên',
    quote: 'Cảm ơn admin, cảm ơn web rất nhiều.'
  },
  {
    image: '/testimonials/score-06.png',
    alt: 'Kết quả Aptis B2 và lời cảm ơn',
    quote: 'Đội ơn admin, đội ơn vía của mọi người.'
  },
  {
    image: '/testimonials/score-07.png',
    alt: 'Học viên đạt aim Aptis nhờ ôn theo web',
    quote: 'Mình đạt aim rồi, cảm ơn admin và web nhiều lắm.'
  },
  {
    image: '/testimonials/score-08.png',
    alt: 'Học viên đạt aim Aptis sau khi ôn trên web',
    quote: 'Em đạt aim rồi cả nhà ơi.'
  },
  {
    image: '/testimonials/score-09.png',
    alt: 'Học viên vượt aim Aptis lần đầu thi',
    quote: 'Vượt aim luôn, lần đầu tui thi.'
  },
  {
    image: '/testimonials/score-10.png',
    alt: 'Học viên đạt C1 Aptis',
    quote: 'Cảm ơn web của bạn nhé.'
  }
];

const whyChooseItems: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Monitor,
    title: 'Luyện đúng cấu trúc bài thi',
    text: 'Các bài luyện được chia theo kỹ năng, part và thời lượng để bạn làm quen cách phân bổ thời gian trước khi vào phòng thi.'
  },
  {
    icon: Bot,
    title: 'Nhận phản hồi sau khi nộp bài',
    text: 'Bài Speaking và Writing được phân tích theo tiêu chí điểm, kèm nhận xét cụ thể để bạn biết nên sửa phần nào trước.'
  },
  {
    icon: ClipboardList,
    title: 'Ôn trọng tâm theo điểm yếu',
    text: 'Bạn có thể chọn riêng phần còn yếu, luyện lại nhiều lần và xem đáp án mẫu để biến mỗi lượt làm bài thành một lần tiến bộ.'
  },
  {
    icon: TrendingUp,
    title: 'Theo dõi quá trình học',
    text: 'Kết quả làm bài được lưu lại để bạn nhìn thấy nhịp học, điểm số và những kỹ năng cần ưu tiên trong buổi ôn tiếp theo.'
  }
];

export const communityInviteDismissedKey = 'aptis-community-invite-dismissed';

const facebookCommunityUrl = 'https://www.facebook.com/groups/1017783430680359';
const zaloCommunityUrl = 'https://zalo.me/g/n1f3m9mamomr1vnhs6lw';
const zaloContactUrl = 'https://zalo.me/0867833227';

const flagFlakes = [
  { left: '4%', size: 22, delay: '-1s', duration: '13s' },
  { left: '9%', size: 17, delay: '-11s', duration: '16s' },
  { left: '15%', size: 25, delay: '-6s', duration: '18s' },
  { left: '21%', size: 19, delay: '-13s', duration: '14s' },
  { left: '27%', size: 23, delay: '-3s', duration: '17s' },
  { left: '33%', size: 16, delay: '-9s', duration: '15s' },
  { left: '39%', size: 24, delay: '-16s', duration: '19s' },
  { left: '45%', size: 18, delay: '-5s', duration: '13s' },
  { left: '51%', size: 26, delay: '-12s', duration: '18s' },
  { left: '57%', size: 17, delay: '-7s', duration: '16s' },
  { left: '63%', size: 22, delay: '-14s', duration: '15s' },
  { left: '69%', size: 20, delay: '-4s', duration: '17s' },
  { left: '75%', size: 25, delay: '-18s', duration: '20s' },
  { left: '81%', size: 18, delay: '-8s', duration: '14s' },
  { left: '87%', size: 24, delay: '-15s', duration: '18s' },
  { left: '93%', size: 19, delay: '-10s', duration: '16s' }
];

export function Dashboard() {
  const [showCommunityInvite, setShowCommunityInvite] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(communityInviteDismissedKey)) return;
    const timer = window.setTimeout(() => setShowCommunityInvite(true), 850);
    return () => window.clearTimeout(timer);
  }, []);

  function closeCommunityInvite() {
    sessionStorage.setItem(communityInviteDismissedKey, '1');
    setShowCommunityInvite(false);
  }

  return (
    <div className="dashboard-page -mx-4 -mt-6 overflow-hidden bg-[#fff8f2] text-navy sm:-mx-6 lg:-mx-10">
      <div className="dashboard-flag-zone relative overflow-hidden">
        <FlagFall />
        <HeroSection />

        <LazySection minHeight={180}>
          <StatsBanner />
        </LazySection>

        <LazySection minHeight={1160}>
          <FeatureShowcase />
        </LazySection>

        <LazySection minHeight={520}>
          <WhyChooseSection />
        </LazySection>

        <LazySection minHeight={420}>
          <HomeContactSection />
        </LazySection>

        <LazySection minHeight={760}>
          <TestimonialsAndCta />
        </LazySection>

        <LazySection minHeight={360}>
          <OverviewFooter />
        </LazySection>
      </div>

      {showCommunityInvite && <CommunityInviteModal onClose={closeCommunityInvite} />}
    </div>
  );
}

function FlagFall() {
  return (
    <div className="flag-fall" aria-hidden="true">
      {flagFlakes.map((flake, index) => (
        <span
          className="flag-flake"
          key={`${flake.left}-${index}`}
          style={{
            left: flake.left,
            width: flake.size,
            height: Math.round(flake.size * 0.66),
            animationDelay: flake.delay,
            animationDuration: flake.duration
          }}
        >
          <span />
        </span>
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="dashboard-hero relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[linear-gradient(135deg,#fff8f2_0%,#fff0c2_48%,#ffffff_100%)] px-4 pb-14 pt-12 sm:px-6 lg:px-10 lg:pb-16 lg:pt-16">
      <div className="dashboard-hero-shape absolute right-0 top-0 h-full w-1/2 translate-x-1/4 rounded-l-full bg-brand-100/70" />
      <div className="dashboard-hero-glow absolute left-[-10%] top-[-20%] h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />
      <DashboardNotificationPanel />
      <div className="relative mx-auto grid min-h-[calc(100vh-10rem)] max-w-[1720px] gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-center xl:gap-16">
        <div>
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-brand-700 shadow-soft">
            <Sparkles size={17} />
            Aptis Lingo học theo lộ trình
          </div>
          <h1 className="max-w-[820px] text-5xl font-extrabold leading-[1.02] text-navy sm:text-6xl lg:text-[68px] 2xl:text-[76px]">
            Học Aptis <span className="text-brand-500">đến ngay Aptis Lingo</span>
          </h1>
          <p className="mt-7 max-w-[760px] text-lg font-medium leading-9 text-slate-700 sm:text-xl">
            Mỗi ngày mở web là biết nên luyện phần nào, làm bài nào trước và cần sửa lỗi gì để tiến bộ nhanh hơn.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link to="/app/mock-tests" className="btn-primary h-14 px-7 text-base">
              Vào luyện ngay <ArrowRight size={18} />
            </Link>
            <Link to="/app/tests/parts" className="btn-secondary h-14 px-7 text-base">
              Xem các kỹ năng
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-4">
            <TrustPill>Lộ trình học theo ngày</TrustPill>
            <TrustPill>Gợi ý sửa lỗi sau bài làm</TrustPill>
          </div>
        </div>

        <ExamMockup />
      </div>
    </section>
  );
}

const dashboardNotificationLevelStyles = {
  INFO: 'bg-blue-50 text-blue-700',
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  WARNING: 'bg-amber-50 text-amber-700',
  DANGER: 'bg-rose-50 text-rose-700'
};

function DashboardNotificationPanel() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    unwrap<AppNotification[]>(api.get('/notifications/public'))
      .then((items) => {
        if (!mounted) return;
        setNotifications(
          items
            .filter((item) => item.audience === 'ALL' || item.audience === 'STUDENT')
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3)
        );
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (dismissed) return null;

  return (
    <aside className="absolute right-4 top-[365px] z-20 hidden w-[300px] rounded-2xl border border-brand-100 bg-white/95 p-3 text-left shadow-lift backdrop-blur xl:block 2xl:right-10">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
        aria-label="Tắt bảng thông báo"
      >
        <X size={16} />
      </button>
      <div className="mb-2 flex items-center justify-between border-b border-brand-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Bell size={17} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-navy">Thông báo</h2>
            <p className="text-[11px] font-semibold text-slate-500">Cập nhật mới nhất</p>
          </div>
        </div>
        {notifications.length > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
            {notifications.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length ? notifications.map((notification) => (
          <article className="rounded-xl bg-sky-50/70 p-2.5" key={notification.id}>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {notification.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  <Pin size={10} />
                  Ghim
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${dashboardNotificationLevelStyles[notification.level]}`}>
                {dashboardNotificationLevelLabel(notification.level)}
              </span>
            </div>
            <h3 className="line-clamp-2 text-xs font-extrabold leading-5 text-navy">{notification.title}</h3>
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-[11px] font-medium leading-5 text-slate-600">{notification.message}</p>
          </article>
        )) : (
          <div className="rounded-xl bg-sky-50/70 px-3 py-5 text-center">
            <Bell className="mx-auto mb-2 text-slate-300" size={26} />
            <p className="text-xs font-bold text-slate-600">Chưa có thông báo mới</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function dashboardNotificationLevelLabel(level: AppNotification['level']) {
  const labels = {
    INFO: 'Thông tin',
    SUCCESS: 'Hoàn tất',
    WARNING: 'Lưu ý',
    DANGER: 'Gấp'
  };
  return labels[level];
}

function TrustPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-soft">
      <CheckCircle2 size={17} className="text-brand-600" />
      {children}
    </span>
  );
}

function ExamMockup() {
  return (
    <div className="relative hidden min-h-[690px] lg:block">
      <div className="dashboard-annotation absolute -left-8 top-28 z-10 flex items-center gap-3 rounded-xl border border-brand-100 bg-white px-5 py-4 text-base font-extrabold text-navy shadow-lift">
        <Lightbulb size={18} className="text-brand-600" />
        Lộ trình hôm nay
      </div>
      <div className="dashboard-annotation dashboard-annotation-delay absolute -right-3 top-56 z-10 flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-5 py-4 text-base font-extrabold text-navy shadow-lift">
        <Bot size={18} className="text-brand-600" />
        Chấm Speaking-Writing
      </div>
      <div className="dashboard-annotation dashboard-annotation-slow absolute bottom-24 left-8 z-10 rounded-xl border border-yellow-200 bg-white px-5 py-4 shadow-lift">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Mục tiêu</p>
        <p className="mt-1 text-base font-black text-navy">7 ngày lên nhịp ôn</p>
      </div>
      <div className="ml-auto max-w-[760px] overflow-hidden rounded-[28px] border border-brand-200 bg-white shadow-[0_24px_80px_rgba(165,15,21,0.18)]">
        <div className="grid grid-cols-[240px_1fr]">
          <div className="bg-[#5f0b0f] p-6 text-white">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#ffde00] text-[#5f0b0f] shadow-soft">
              <LayoutDashboard size={28} />
            </div>
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-100">Bàn học Aptis</p>
            <h3 className="mt-2 text-3xl font-black leading-tight">Hôm nay luyện gì?</h3>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/78">
              Gợi ý tự động theo kỹ năng còn yếu và bài vừa làm gần nhất.
            </p>

            <div className="mt-8 rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold text-white/70">Tiến độ tuần</p>
              <div className="mt-3 flex items-end gap-2">
                {[42, 62, 48, 78, 70, 34, 58].map((height, index) => (
                  <span
                    className={`w-full rounded-t-lg ${index === 3 ? 'bg-[#ffde00]' : 'bg-white/35'}`}
                    key={height + index}
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#fffaf0] p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Lộ trình cá nhân</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Ca học 35 phút</h3>
              </div>
              <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-extrabold text-white">B2 target</span>
            </div>

            <div className="mt-6 space-y-3">
              {[
                ['01', 'Ôn Reading Part 2', 'Sắp xếp câu theo logic đoạn văn', 'bg-brand-600 text-white'],
                ['02', 'Ghi âm Speaking', 'Trả lời 2 câu cá nhân và nhận góp ý', 'bg-white text-brand-700'],
                ['03', 'Sửa Writing task', 'Nâng cấp câu trả lời theo gợi ý AI', 'bg-white text-brand-700']
              ].map(([step, title, text, tone]) => (
                <article className="flex items-start gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft" key={step}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${tone}`}>
                    {step}
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ['Reading', '68%'],
                ['Speaking', '52%'],
                ['Writing', '74%']
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-brand-100 bg-white p-3 text-center shadow-soft" key={label}>
                  <p className="text-lg font-black text-navy">{value}</p>
                  <p className="mt-1 text-[11px] font-extrabold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsBanner() {
  return (
    <section className="bg-[linear-gradient(135deg,#a50f15_0%,#d71920_55%,#ffde00_100%)] px-4 py-12 text-white sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 text-center md:grid-cols-4 md:divide-x md:divide-white/20">
        {stats.map(([value, label]) => (
          <div className="p-3" key={label}>
            <p className="text-4xl font-extrabold text-white sm:text-5xl">{value}</p>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-100">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureShowcase() {
  return (
    <section className="dashboard-feature-section bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-16 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Cách học trên Aptis Lingo</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold text-navy sm:text-4xl">
            Ôn theo lộ trình gọn, có bài luyện và phản hồi sau mỗi lượt làm
          </h2>
        </Reveal>

        <div className="space-y-16 lg:space-y-20">
          <Reveal>
            <FeatureRow
              icon={BarChart3}
              title="Làm bài, nộp bài, xem nhận xét"
              text="Bạn có thể luyện Speaking và Writing rồi xem phản hồi về ý tưởng, từ vựng, ngữ pháp, phát âm và độ trôi chảy."
              bullets={['Gợi ý theo tiêu chí CEFR', 'Chỉ ra lỗi nổi bật và hướng sửa cụ thể']}
              visual={<AiScoreVisual />}
              reverse
            />
          </Reveal>
          <Reveal>
            <FeatureRow
              icon={Monitor}
              title="Bài luyện chia rõ từng kỹ năng"
              text="Reading, Listening, Speaking, Writing và Grammar được tách thành các dạng quen thuộc để bạn chọn nhanh phần cần ôn."
              tags={['Reading', 'Listening', 'Timer']}
              visual={<SimulatorVisual />}
            />
          </Reveal>
          <Reveal>
            <FeatureRow
              icon={TrendingUp}
              title="Xem lại tiến bộ sau mỗi buổi học"
              text="Theo dõi điểm, lịch sử làm bài và xu hướng cải thiện để biết hôm nay nên luyện tiếp phần nào."
              visual={<ProgressVisual />}
              reverse
            />
          </Reveal>
          <Reveal>
            <FeatureRow
              icon={ClipboardList}
              title="Chọn đúng part cần cải thiện"
              text="Không cần học lan man: chọn part, làm bài, đối chiếu đáp án và quay lại luyện những câu mình còn sai."
              bullets={['Có part riêng cho từng kỹ năng', 'Nội dung được cập nhật thường xuyên']}
              visual={<PartPracticeVisual />}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  text,
  bullets,
  tags,
  visual,
  reverse
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  bullets?: string[];
  tags?: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={26} />
        </div>
        <h3 className="text-2xl font-extrabold text-navy sm:text-3xl">{title}</h3>
        <p className="mt-4 max-w-xl text-base font-medium leading-8 text-slate-700">{text}</p>
        {bullets && (
          <ul className="mt-6 space-y-3">
            {bullets.map((item) => (
              <li className="flex items-start gap-3 text-base font-bold text-navy" key={item}>
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        )}
        {tags && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-extrabold text-navy" key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{visual}</div>
    </div>
  );
}

function AiScoreVisual() {
  return (
    <VisualShell>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-lift">
        <div className="mb-5 flex items-center gap-4 border-b border-brand-100 pb-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Bot size={28} />
          </div>
          <div>
            <h4 className="font-extrabold text-navy">Nhận xét bài Speaking</h4>
            <p className="text-sm font-medium text-slate-700">Gợi ý phát âm và cách diễn đạt</p>
          </div>
        </div>
        <ScoreBar label="Pronunciation" value="8.5/10" percent="85%" color="bg-emerald-500" />
        <ScoreBar label="Fluency" value="7.0/10" percent="70%" color="bg-brand-600" />
        <div className="mt-5 rounded-lg border-l-4 border-brand-600 bg-brand-50 p-3 text-sm font-medium text-slate-700">
          <span className="font-extrabold text-navy">Gợi ý:</span> Thêm ví dụ cá nhân để câu trả lời tự nhiên hơn.
        </div>
      </div>
    </VisualShell>
  );
}

function ScoreBar({ label, value, percent, color }: { label: string; value: string; percent: string; color: string }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex justify-between text-sm">
          <span className="font-bold text-slate-700">{label}</span>
        <span className="font-extrabold text-navy">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sky-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: percent }} />
      </div>
    </div>
  );
}

function SimulatorVisual() {
  return (
    <VisualShell tone="strong">
      <div className="w-full max-w-sm rounded-xl border border-brand-100 bg-white p-4 shadow-lift">
        <div className="mb-4 flex items-center justify-between border-b border-brand-100 pb-3">
          <span className="text-sm font-extrabold text-navy">Reading - Part 2</span>
          <span className="rounded bg-red-50 px-2 py-1 text-xs font-extrabold text-red-600">18:42</span>
        </div>
        <p className="text-sm font-medium leading-7 text-slate-700">
          The main cause is a lack of <span className="inline-block h-4 w-16 rounded border border-brand-200 bg-brand-50 align-middle" /> in the system. To solve this, use a new <span className="inline-block h-4 w-20 rounded border border-brand-100 bg-sky-100 align-middle" /> approach.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {['resources', 'strategic', 'funding'].map((item) => (
            <span className="rounded border border-brand-100 bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-soft" key={item}>{item}</span>
          ))}
        </div>
      </div>
    </VisualShell>
  );
}

function ProgressVisual() {
  return (
    <VisualShell>
      <div className="flex h-60 w-full max-w-md items-end justify-around border-b-2 border-brand-100 px-5">
        {[
          ['30%', 'A2', 'bg-brand-200 text-navy/60'],
          ['50%', 'B1', 'bg-brand-300 text-navy/70'],
          ['70%', 'B2', 'bg-brand-500 text-navy'],
          ['90%', 'C1', 'bg-brand-600 text-white']
        ].map(([height, label, color], index) => (
          <div className={`relative flex w-[15%] justify-center rounded-t-lg pt-3 text-xs font-extrabold ${color}`} style={{ height }} key={label}>
            {index === 3 && <span className="absolute -top-10 rounded-full bg-slatePanel px-3 py-1 text-xs text-white shadow-lift">C1</span>}
            {index !== 3 && label}
          </div>
        ))}
      </div>
    </VisualShell>
  );
}

function PartPracticeVisual() {
  return (
    <VisualShell>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-5 shadow-lift">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-extrabold text-brand-700">Part 1: Social Interaction</span>
          <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-extrabold text-brand-700">13/20 Done</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item, index) => (
            <div className={`flex items-center gap-3 rounded-xl border p-3 ${index === 0 ? 'border-brand-100 bg-brand-50' : 'border-brand-100 bg-white'}`} key={item}>
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? 'bg-brand-600 text-white' : 'bg-sky-100 text-slate-600'}`}>{item}</span>
              <span className={`h-2 flex-1 rounded-full ${index === 0 ? 'bg-brand-200' : 'bg-sky-100'}`} />
            </div>
          ))}
        </div>
      </div>
    </VisualShell>
  );
}

function VisualShell({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'strong' }) {
  return (
    <div className={`dashboard-visual-shell relative grid min-h-[320px] place-items-center overflow-hidden rounded-3xl border border-brand-200 p-6 shadow-soft ${tone === 'strong' ? 'bg-[linear-gradient(135deg,#fff0c2,#fff8f2)]' : 'bg-[linear-gradient(135deg,#fff7db,#ffffff)]'}`}>
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#d71920_1px,transparent_1px)] [background-size:24px_24px]" />
      {children}
    </div>
  );
}

function WhyChooseSection() {
  return (
    <section className="dashboard-why-section bg-[#fff0c2] px-4 py-14 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-12 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Điểm mạnh của nền tảng</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold text-navy sm:text-4xl">
            Học gọn hơn khi biết mình cần sửa gì
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-slate-700">
            Aptis Lingo giúp bạn gom bài luyện, kết quả và phản hồi vào cùng một nơi để việc ôn thi bớt rối hơn.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {whyChooseItems.map(({ icon: Icon, title, text }, index) => (
            <Reveal delay={index * 80} key={title}>
              <article className="h-full rounded-xl border border-brand-100 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift sm:p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-navy">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeContactSection() {
  return (
    <section className="dashboard-contact-section bg-white px-4 py-14 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-6 overflow-hidden rounded-[28px] border border-brand-100 bg-[linear-gradient(135deg,#ffffff_0%,#fff7db_58%,#fff8f2_100%)] p-5 shadow-soft md:grid-cols-[1.05fr_0.95fr] md:p-8 lg:p-10">
        <Reveal className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700 shadow-soft">
            <MessageCircle size={15} />
            Cần hỗ trợ?
          </div>
          <h2 className="max-w-2xl text-3xl font-extrabold text-navy sm:text-4xl">
            Gặp lỗi tài khoản hoặc muốn hỏi về bài luyện?
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-slate-700">
            Gửi tin nhắn cho admin qua Facebook hoặc Zalo, kèm email đăng ký và ảnh chụp màn hình để được kiểm tra nhanh.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href={facebookCommunityUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d71920] px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-[#a50f15]">
              <ExternalLink size={18} />
              Liên hệ qua Facebook
            </a>
            <a href={zaloContactUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#ffde00] px-5 text-sm font-extrabold text-[#5f0b0f] shadow-soft transition hover:bg-[#ffd43b]">
              <MessageCircle size={18} />
              Nhắn Zalo admin
            </a>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Send size={22} />
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-navy">Kiểm tra tài khoản</h3>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                Dành cho các trường hợp thanh toán, quyền Pro, đăng nhập hoặc dữ liệu bài làm chưa hiển thị đúng.
              </p>
            </article>
            <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users size={22} />
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-navy">Hỏi bài cùng cộng đồng</h3>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                Theo dõi thông báo mới, hỏi kinh nghiệm ôn thi và xem thêm chia sẻ từ những bạn đã thi.
              </p>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CommunityInviteModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/58 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="community-invite-title" onClick={onClose}>
      <div className="community-invite-card relative w-full max-w-[480px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#a50f15_0%,#d71920_58%,#ffde00_100%)] px-5 py-6 text-center text-white shadow-[0_28px_90px_rgba(80,0,0,0.34)] sm:px-8 sm:py-7" onClick={(event) => event.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-full border-2 border-white/85 bg-white/5 text-white transition hover:bg-white/16 sm:h-12 sm:w-12"
            aria-label="Đóng bảng cộng đồng"
          >
            <X size={26} strokeWidth={2.2} />
          </button>
          <div className="mx-auto grid h-[92px] w-[92px] place-items-center rounded-full border border-white/10 bg-white/8 shadow-[inset_0_0_0_7px_rgba(255,255,255,0.05)]">
            <div className="grid h-[68px] w-[68px] place-items-center rounded-full border border-white/10 bg-white/8">
              <Users size={34} strokeWidth={2.4} />
            </div>
          </div>
          <div className="mt-2 inline-flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wide text-white">
            <Sparkles size={15} />
            AptisLingo
          </div>
          <h2 id="community-invite-title" className="mx-auto mt-5 max-w-[380px] text-[25px] font-extrabold leading-tight tracking-normal sm:text-[28px]">
            Vào nhóm học Aptis cùng mọi người
          </h2>
          <p className="mx-auto mt-5 max-w-[380px] text-lg font-extrabold leading-7 text-white sm:text-xl">
            Cập nhật tài liệu, hỏi bài và nhận nhắc nhở ôn tập trong cộng đồng Aptis Lingo.
          </p>
          <div className="mx-auto mt-7 max-w-[392px] space-y-4">
          <a href={facebookCommunityUrl} target="_blank" rel="noreferrer" onClick={onClose} className="flex h-[56px] items-center justify-center gap-3 rounded-full bg-white px-5 text-base font-extrabold text-[#a50f15] shadow-[0_16px_36px_rgba(80,0,0,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(80,0,0,0.18)]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#d71920] text-sm font-black text-[#ffde00]">f</span>
            Cộng đồng Facebook
            <ArrowRight size={21} />
          </a>
          <a href={zaloCommunityUrl} target="_blank" rel="noreferrer" onClick={onClose} className="flex h-[56px] items-center justify-center gap-3 rounded-full bg-[#d71920] px-5 text-base font-extrabold text-white shadow-[0_16px_36px_rgba(80,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-[#a50f15]">
            <MessageCircle size={21} fill="currentColor" strokeWidth={0} />
            Cộng đồng Zalo
            <ArrowRight size={21} />
          </a>
          </div>
          <button type="button" onClick={onClose} className="mt-6 text-base font-extrabold text-white/90 transition hover:text-white">
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}

function TestimonialsAndCta() {
  return (
    <section className="dashboard-testimonials-section bg-[linear-gradient(180deg,#fff0c2_0%,#fff8f2_100%)] px-4 py-14 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-12 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Phản hồi từ học viên</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold text-navy sm:text-4xl">
            Những kết quả học viên gửi về sau quá trình ôn
          </h2>
        </Reveal>

        <Reveal className="mb-16">
          <div className="dashboard-testimonial-marquee -mx-4 overflow-hidden sm:-mx-6 lg:-mx-10">
            <div className="dashboard-testimonial-track flex w-max gap-5 px-4 sm:px-6 lg:px-10">
              {[...testimonialSlides, ...testimonialSlides].map((slide, index) => (
                <article
                  className="w-[245px] shrink-0 overflow-hidden rounded-[20px] border border-brand-100 bg-white p-2 shadow-lift sm:w-[300px] lg:w-[340px]"
                  key={`${slide.image}-${index}`}
                >
                  <div className="overflow-hidden rounded-[18px] bg-slate-100">
                    <img
                      src={slide.image}
                      alt={slide.alt}
                      className="h-[260px] w-full object-cover object-top sm:h-[335px] lg:h-[380px]"
                      loading="lazy"
                    />
                  </div>
                  <p className="line-clamp-2 px-3 py-4 text-sm font-extrabold leading-6 text-navy sm:text-base">"{slide.quote}"</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="dashboard-cta-card relative overflow-hidden rounded-3xl border border-brand-200 bg-white p-8 text-center shadow-lift sm:p-12">
          <div className="absolute left-0 top-0 h-32 w-32 rounded-br-full bg-brand-50" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-tl-full bg-sky-100" />
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
            <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white shadow-soft">
              <Rocket size={30} />
            </div>
            <h2 className="text-3xl font-extrabold text-navy sm:text-5xl">Bắt đầu một lượt luyện mới</h2>
            <p className="mt-5 text-base font-medium leading-8 text-slate-700">
              Chọn một đề hoặc một part, làm bài ngay và lưu lại kết quả để theo dõi tiến bộ của bạn.
            </p>
            <Link to="/app/mock-tests" className="btn-primary mt-8 h-12 px-8">
              Bắt đầu luyện tập
            </Link>
          </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OverviewFooter() {
  return (
    <footer className="border-t-4 border-brand-500 bg-[#5f0b0f] px-4 py-12 text-white sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-8 md:grid-cols-3">
        <div>
          <h2 className="text-2xl font-extrabold">Aptis Lingo</h2>
          <p className="mt-4 text-sm font-medium leading-7 text-slate-300">
            Nơi luyện Aptis theo kỹ năng, làm bài có bấm giờ và xem lại phản hồi sau mỗi lượt nộp.
          </p>
        </div>
        <FooterColumn title="Luyện tập" links={['Grammar & Vocab', 'Reading', 'Listening', 'Speaking', 'Writing']} />
        <FooterColumn title="Tính năng" links={['Bộ đề Aptis', 'Luyện theo kỹ năng', 'Nhận xét Speaking-Writing', 'Theo dõi tiến độ']} />
      </div>
      <div className="mx-auto mt-10 flex max-w-[1280px] flex-col gap-3 border-t border-white/10 pt-5 text-sm font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2024 Aptis Lingo. All rights reserved.</p>
        <div className="flex gap-4">
          <span>Về chúng tôi</span>
          <span>Điều khoản sử dụng</span>
          <span>Chính sách bảo mật</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-100">{title}</h3>
      <div className="mt-4 space-y-3">
        {links.map((link) => (
          <p className="text-sm font-medium text-slate-300" key={link}>{link}</p>
        ))}
      </div>
    </div>
  );
}

function LazySection({ children, minHeight }: { children: ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px 0px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? <div className="animate-[fadeInSection_520ms_ease-out_both]">{children}</div> : <SectionSkeleton minHeight={minHeight} />}
    </div>
  );
}

function SectionSkeleton({ minHeight }: { minHeight: number }) {
  return (
    <div className="dashboard-skeleton bg-[#fff8f2] px-4" style={{ minHeight }} aria-hidden="true" />
  );
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px 0px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-10 opacity-0 blur-[2px]'}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
