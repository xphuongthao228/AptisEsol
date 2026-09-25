import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Flame,
  GraduationCap,
  MessageCircle,
  Monitor,
  Pin,
  Rocket,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, publicApi, unwrap } from '../../api/client';
import { NotificationDialog } from '../../components/NotificationDialog';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { AppNotification, MockTestResult, Progress, Submission } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

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

import { communityInviteDismissedKey, facebookCommunityUrl, zaloCommunityUrl, zaloCommunityUrl2 } from '../../utils/community';

const zaloContactUrl = 'https://zalo.me/0867833227';
const mediaBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8080';

type BannerMedia = { id: number; originalName: string; sourceUrl?: string | null };
type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  href: string;
  tone: string;
  visual: string;
  imageUrl?: string;
  imageAlt?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

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
  const user = useAuthStore((state) => state.user);
  const [showCommunityInvite, setShowCommunityInvite] = useState(false);

  useEffect(() => {
    if (user) return;
    if (sessionStorage.getItem(communityInviteDismissedKey)) return;
    const timer = window.setTimeout(() => setShowCommunityInvite(true), 850);
    return () => window.clearTimeout(timer);
  }, [user]);

  function closeCommunityInvite() {
    sessionStorage.setItem(communityInviteDismissedKey, '1');
    setShowCommunityInvite(false);
  }

  if (user) return <StudentLearningDashboard />;

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

function StudentLearningDashboard() {
  const user = useAuthStore((state) => state.user)!;
  const goalStorageKey = `aptis-learning-goal:${user.id}`;
  const [learningGoal, setLearningGoal] = useState<{ examDate: string; level: 'B1' | 'B2' | 'C1' } | null>(() => loadLearningGoal(goalStorageKey));
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<{ examDate: string; level: 'B1' | 'B2' | 'C1' }>(() => learningGoal ?? { examDate: '', level: 'B2' });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false);
  const { data: submissionData, loading: loadingSubmissions } = useApi<Submission[]>(
    () => unwrap(api.get('/submissions/my-results')),
    []
  );
  const { data: mockResultData, loading: loadingMockResults } = useApi<MockTestResult[]>(
    () => unwrap(api.get('/mock-tests/results/my')),
    []
  );
  const { data: progressData } = useApi<Progress[]>(
    () => unwrap(api.get('/progress/me')),
    []
  );
  const submissions = submissionData ?? [];
  const mockResults = mockResultData ?? [];
  const progress = progressData ?? [];
  const scoreEntries = useMemo(() => [
    ...submissions.map((value) => ({ kind: 'submission' as const, value })),
    ...mockResults.map((value) => ({ kind: 'mock' as const, value }))
  ], [mockResults, submissions]);
  const totalQuestions = submissions.reduce((total, item) => total + (item.answers?.length ?? 0), 0);
  const correctQuestions = submissions.reduce(
    (total, item) => total + (item.answers?.filter((answer) => answer.correct).length ?? 0),
    0
  );
  const accuracy = totalQuestions ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  const averageScore = scoreEntries.length
    ? Math.round(scoreEntries.reduce((total, item) => total + scoreEntryPercent(item), 0) / scoreEntries.length)
    : 0;
  const streak = calculateLearningStreak(scoreEntries);
  const skillProgress = buildSkillProgress(progress, submissions);
  const recentResults = scoreEntries
    .sort((first, second) => new Date(second.value.createdAt).getTime() - new Date(first.value.createdAt).getTime())
    .slice(0, 4);
  const isPro = Boolean(user.proExpiresAt && new Date(user.proExpiresAt).getTime() > Date.now());
  const level = averageScore >= 80 ? 'C1' : averageScore >= 65 ? 'B2' : averageScore >= 45 ? 'B1' : 'Đang xác định';
  const canInstallApp = Boolean(installPrompt) && !appInstalled;

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  function openGoalDialog() {
    setGoalDraft(learningGoal ?? { examDate: '', level: 'B2' });
    setGoalDialogOpen(true);
  }

  function saveLearningGoal() {
    if (!goalDraft.examDate) return;
    window.localStorage.setItem(goalStorageKey, JSON.stringify(goalDraft));
    setLearningGoal(goalDraft);
    setGoalDialogOpen(false);
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (!choice || choice.outcome !== 'dismissed') setInstallPrompt(null);
      return;
    }

    window.alert(
      /iPad|iPhone|iPod/.test(navigator.userAgent)
        ? 'Bấm nút Chia sẻ trên Safari, sau đó chọn “Thêm vào Màn hình chính”.'
        : 'Mở menu trình duyệt rồi chọn “Thêm vào màn hình chính” hoặc “Cài đặt ứng dụng”.'
    );
  }

  return (
    <div className="student-dashboard space-y-6 pb-10">
      <div className="overflow-hidden rounded-lg border border-brand-100 shadow-soft">
        <HeroSection showNotifications={false} />
      </div>

      <section className="relative overflow-hidden rounded-lg border border-red-100 bg-[linear-gradient(110deg,#fff1eb_0%,#fff_48%,#fff3ed_100%)] p-5 shadow-soft sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-extrabold text-brand-700">
              <BarChart3 size={14} /> Dashboard
            </span>
            <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
              Xin chào, <span className="text-brand-600">{user.fullName}</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">
              Đã có dữ liệu <strong className="text-slate-900">{skillProgress.filter((item) => item.completedTests > 0).length}/4 kỹ năng</strong>
              {' '}· Chuỗi học <strong className="text-brand-600">{streak} ngày</strong> · Hôm nay luyện tiếp nhé!
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button type="button" onClick={installApp} className="btn-secondary h-11 self-start px-5 sm:hidden">
              <Download size={17} /> Cài đặt app
            </button>
            {canInstallApp && (
              <button type="button" onClick={installApp} className="btn-secondary h-11 self-start px-5">
                <Download size={17} /> Cài đặt app
              </button>
            )}
            <Link to="/app/mock-tests" className="btn-primary h-11 self-start px-5">
              <Rocket size={17} /> Thi thử ngay
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardMetric icon={Flame} label="Chuỗi ngày" value={`${streak} ngày`} tone="bg-red-100 text-red-600" />
          <DashboardMetric icon={CheckCircle2} label="Câu đã làm" value={String(totalQuestions)} tone="bg-amber-100 text-amber-600" />
          <DashboardMetric icon={Target} label="Chính xác" value={`${accuracy}%`} tone="bg-emerald-100 text-emerald-600" />
          <DashboardMetric icon={TrendingUp} label="Trình độ" value={level} tone="bg-violet-100 text-violet-600" />
          <DashboardMetric icon={Trophy} label="Gói hiện tại" value={isPro ? 'Pro' : 'Miễn phí'} tone="bg-slate-100 text-slate-600" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-brand-600">
            <GraduationCap size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-950 sm:text-lg">Hướng dẫn người mới học Aptis trên Aptis Lingo</h2>
            <p className="mt-1 text-sm text-slate-500">Xem lộ trình và các bước bắt đầu luyện Aptis hiệu quả trên Aptis Lingo.</p>
          </div>
          <a
            href="https://docs.google.com/document/d/1watnMSe6cibOX1qRb31z4DKerySzN56g/edit"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-600 px-4 text-sm font-extrabold text-brand-600 transition hover:bg-brand-50"
          >
            Xem hướng dẫn <ArrowRight size={16} />
          </a>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-amber-50 text-brand-600">
            <Target size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-950 sm:text-lg">Set up mục tiêu của bạn</h2>
            <p className="mt-1 text-sm text-slate-500">
              {learningGoal
                ? `Mục tiêu ${learningGoal.level} · Ngày thi ${formatGoalDate(learningGoal.examDate)}`
                : 'Chọn ngày thi và trình độ mục tiêu B1, B2 hoặc C1.'}
            </p>
          </div>
          <button type="button" onClick={openGoalDialog} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-extrabold text-white transition hover:bg-brand-700">
            {learningGoal ? 'Thay đổi' : 'Đặt ngay'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-black text-slate-950">Thống kê tiến độ luyện tập</h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">Theo dõi sự tiến bộ điểm số của bạn qua các lần luyện tập và thi thử.</p>
          </div>
          <Link to="/app/history" className="text-sm font-extrabold text-brand-600 hover:text-brand-700">Xem lịch sử</Link>
        </div>
        {loadingSubmissions || loadingMockResults ? <DashboardLoading /> : <ProgressLineChart submissions={submissions} mockResults={mockResults} />}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-600">Học tiếp</p>
            <h2 className="mt-1 text-xl font-black text-navy">Bài làm gần đây</h2>
          </div>
          <Link to="/app/tests/parts" className="btn-primary h-10 px-4 text-sm">Luyện ngay <ArrowRight size={16} /></Link>
        </div>
        {loadingSubmissions || loadingMockResults ? <DashboardLoading /> : recentResults.length ? (
          <div className="mt-5 divide-y divide-slate-100">
            {recentResults.map((item) => {
              const title = item.kind === 'submission' ? item.value.testTitle : item.value.title;
              const skill = item.kind === 'submission' ? item.value.skillName : item.value.skill;
              const percent = item.value.maxScore ? Math.round(((item.kind === 'submission' ? item.value.totalScore : item.value.score) * 100) / item.value.maxScore) : 0;
              return (
              <Link to={`/app/history?result=${item.kind}:${item.value.id}`} className="flex items-center gap-4 py-4 transition hover:bg-slate-50" key={`${item.kind}:${item.value.id}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"><FileText size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-navy">{repairMojibake(title)}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{item.kind === 'mock' ? 'Thi thử · ' : ''}{repairMojibake(skill)} · {formatDashboardDate(item.value.createdAt)}</p>
                </div>
                <span className="text-sm font-black text-brand-600">{percent}%</span>
              </Link>
            );})}
          </div>
        ) : (
          <div className="mt-5 border border-dashed border-slate-300 p-7 text-center text-sm font-medium text-slate-600">
            Bạn chưa có bài làm nào. Hãy bắt đầu một bài luyện để tạo thống kê tiến độ.
          </div>
        )}
      </section>

      {goalDialogOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="learning-goal-title">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-brand-600">Mục tiêu học tập</p>
                <h2 id="learning-goal-title" className="mt-1 text-2xl font-black text-navy">Bạn muốn đạt band nào?</h2>
              </div>
              <button type="button" onClick={() => setGoalDialogOpen(false)} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={19} /></button>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-sm font-extrabold text-slate-800">Trình độ mục tiêu</p>
              <div className="grid grid-cols-3 gap-2">
                {(['B1', 'B2', 'C1'] as const).map((targetLevel) => (
                  <button
                    type="button"
                    key={targetLevel}
                    onClick={() => setGoalDraft((current) => ({ ...current, level: targetLevel }))}
                    className={`h-12 rounded-md border text-base font-black transition ${goalDraft.level === targetLevel ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'}`}
                  >
                    {targetLevel}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-extrabold text-slate-800">Ngày thi dự kiến</span>
              <input
                type="date"
                min={localDateKey(new Date())}
                value={goalDraft.examDate}
                onChange={(event) => setGoalDraft((current) => ({ ...current, examDate: event.target.value }))}
                className="input"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setGoalDialogOpen(false)} className="btn-secondary h-10 px-4 text-sm">Hủy</button>
              <button type="button" onClick={saveLearningGoal} disabled={!goalDraft.examDate} className="btn-primary h-10 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50">Lưu mục tiêu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-[112px] items-center gap-3 rounded-lg border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={22} /></span>
      <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p></div>
    </div>
  );
}

const progressChartSeries = [
  { key: 'reading', label: 'Reading Practice', color: '#3b82f6' },
  { key: 'listening', label: 'Listening Practice', color: '#10b981' },
  { key: 'writing', label: 'Writing Practice', color: '#8b5cf6' },
  { key: 'grammar', label: 'Grammar Practice', color: '#ec4899' },
  { key: 'speaking', label: 'Speaking Practice', color: '#f97316' },
  { key: 'full', label: 'Mock Test (Full)', color: '#f59e0b', dashed: true }
] as const;

type ScoreEntry =
  | { kind: 'submission'; value: Submission }
  | { kind: 'mock'; value: MockTestResult };

function ProgressLineChart({ submissions, mockResults }: { submissions: Submission[]; mockResults: MockTestResult[] }) {
  const chart = buildProgressChart([
    ...submissions.map((value) => ({ kind: 'submission' as const, value })),
    ...mockResults.map((value) => ({ kind: 'mock' as const, value }))
  ]);
  if (!chart.dates.length) {
    return (
      <div className="mt-6 border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-600">
        Hoàn thành bài luyện hoặc thi thử để bắt đầu biểu đồ tiến độ.
      </div>
    );
  }

  const width = Math.max(920, chart.dates.length * 72);
  const height = 330;
  const left = 48;
  const right = 20;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (chart.dates.length === 1 ? plotWidth / 2 : (index / (chart.dates.length - 1)) * plotWidth);
  const y = (value: number) => top + ((100 - value) / 100) * plotHeight;

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {progressChartSeries.map((series) => (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600" key={series.key}>
            <span className="h-2.5 w-8 border-2 bg-white" style={{ borderColor: series.color, borderStyle: 'dashed' in series && series.dashed ? 'dashed' : 'solid' }} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[330px] min-w-[920px] w-full" role="img" aria-label="Biểu đồ tiến độ điểm số theo ngày">
          {Array.from({ length: 11 }, (_, index) => index * 10).map((value) => (
            <g key={value}>
              <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={left - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#64748b">{value}%</text>
            </g>
          ))}
          {chart.dates.map((date, index) => (
            <g key={date}>
              <line x1={x(index)} x2={x(index)} y1={top} y2={height - bottom} stroke="#e2e8f0" strokeWidth="1" />
              <text x={x(index)} y={height - 17} textAnchor="middle" fontSize="11" fill="#64748b">{formatChartDate(date)}</text>
            </g>
          ))}
          {progressChartSeries.map((series) => {
            const points = chart.values[series.key];
            const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.dateIndex)} ${y(point.value)}`).join(' ');
            return (
              <g key={series.key}>
                {points.length > 1 && <path d={path} fill="none" stroke={series.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={'dashed' in series && series.dashed ? '7 6' : undefined} />}
                {points.map((point) => (
                  <circle key={`${point.dateIndex}-${point.value}`} cx={x(point.dateIndex)} cy={y(point.value)} r="3.5" fill="white" stroke={series.color} strokeWidth="2.5">
                    <title>{`${series.label} · ${formatChartDate(chart.dates[point.dateIndex])}: ${point.value}%`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function buildProgressChart(entries: ScoreEntry[]) {
  const sorted = [...entries].sort((first, second) => new Date(first.value.createdAt).getTime() - new Date(second.value.createdAt).getTime());
  const dates = Array.from(new Set(sorted.map((item) => localDateKey(new Date(item.value.createdAt))))).slice(-24);
  const values: Record<typeof progressChartSeries[number]['key'], Array<{ dateIndex: number; value: number }>> = {
    reading: [],
    listening: [],
    writing: [],
    grammar: [],
    speaking: [],
    full: []
  };

  dates.forEach((date, dateIndex) => {
    progressChartSeries.forEach((series) => {
      const matching = sorted.filter((entry) => localDateKey(new Date(entry.value.createdAt)) === date && scoreEntryChartSeries(entry) === series.key);
      if (!matching.length) return;
      const value = Math.round(matching.reduce((total, entry) => total + scoreEntryPercent(entry), 0) / matching.length);
      values[series.key].push({ dateIndex, value });
    });
  });
  return { dates, values };
}

function scoreEntryChartSeries(entry: ScoreEntry): typeof progressChartSeries[number]['key'] {
  const searchable = entry.kind === 'submission'
    ? `${entry.value.skillName} ${entry.value.testTitle}`.toLowerCase()
    : `${entry.value.skill} ${entry.value.title}`.toLowerCase();
  if (/full|toàn bộ|tong hop|tổng hợp/.test(searchable)) return 'full';
  if (searchable.includes('listening')) return 'listening';
  if (searchable.includes('writing')) return 'writing';
  if (searchable.includes('grammar')) return 'grammar';
  if (searchable.includes('speaking')) return 'speaking';
  return 'reading';
}

function formatChartDate(value: string) {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}

function DashboardLoading() {
  return <div className="mt-6 h-32 animate-pulse rounded-md bg-slate-100" />;
}

function submissionPercent(submission: Submission) {
  return submission.maxScore ? Math.round((submission.totalScore / submission.maxScore) * 100) : 0;
}

function mockResultPercent(result: MockTestResult) {
  return result.maxScore ? Math.round((result.score / result.maxScore) * 100) : 0;
}

function scoreEntryPercent(entry: ScoreEntry) {
  return entry.kind === 'submission' ? submissionPercent(entry.value) : mockResultPercent(entry.value);
}

function calculateLearningStreak(entries: ScoreEntry[]) {
  const activeDays = new Set(entries.map((item) => localDateKey(new Date(item.value.createdAt))));
  if (!activeDays.size) return 0;
  const cursor = new Date();
  if (!activeDays.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildSkillProgress(progress: Progress[], submissions: Submission[]) {
  const skills = [
    { name: 'Listening', color: 'bg-sky-500' },
    { name: 'Speaking', color: 'bg-violet-500' },
    { name: 'Reading', color: 'bg-emerald-500' },
    { name: 'Writing', color: 'bg-amber-500' }
  ];
  return skills.map((skill) => {
    const progressItem = progress.find((item) => item.skillName.toLowerCase().includes(skill.name.toLowerCase()));
    const skillSubmissions = submissions.filter((item) => item.skillName.toLowerCase().includes(skill.name.toLowerCase()));
    const percent = skillSubmissions.length
      ? Math.round(skillSubmissions.reduce((total, item) => total + submissionPercent(item), 0) / skillSubmissions.length)
      : 0;
    return { ...skill, percent, completedTests: progressItem?.completedTests ?? skillSubmissions.length };
  });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function loadLearningGoal(storageKey: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
    if (!parsed?.examDate || !['B1', 'B2', 'C1'].includes(parsed.level)) return null;
    return parsed as { examDate: string; level: 'B1' | 'B2' | 'C1' };
  } catch {
    return null;
  }
}

function formatGoalDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
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

function HeroSection({ showNotifications = true }: { showNotifications?: boolean } = {}) {
  const defaultSlides: HeroSlide[] = [
    {
      eyebrow: 'Aptis Lingo học theo lộ trình',
      title: 'Học Aptis đúng hướng, tiến bộ mỗi ngày',
      description: 'Biết nên luyện phần nào trước và tập trung sửa đúng lỗi để về đích nhanh hơn.',
      action: 'Vào luyện ngay',
      href: '/app/tests/parts',
      tone: 'from-[#fff8f2] via-[#fff1c7] to-[#fffdf7]',
      visual: 'study'
    },
    {
      eyebrow: 'Lộ trình cá nhân',
      title: 'Một ca học gọn trong 35 phút',
      description: 'Reading, Speaking và Writing được sắp xếp thành từng bước rõ ràng, dễ bắt đầu.',
      action: 'Xem lộ trình',
      href: '/app/tests/parts',
      tone: 'from-[#fff4f4] via-white to-[#fff6d8]',
      visual: 'plan'
    },
    {
      eyebrow: 'Phản hồi sau bài làm',
      title: 'Biết lỗi ở đâu, sửa ngay ở đó',
      description: 'Nhận góp ý cho Speaking và Writing, theo dõi tiến độ để ưu tiên đúng kỹ năng còn yếu.',
      action: 'Luyện kỹ năng',
      href: '/app/tests/parts',
      tone: 'from-[#f3fbff] via-white to-[#fff3d5]',
      visual: 'feedback'
    }
  ];
  const [bannerMedia, setBannerMedia] = useState<BannerMedia[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'previous'>('next');
  const [sliderPaused, setSliderPaused] = useState(false);
  const slides = bannerMedia.length
    ? bannerMedia.map((media, index) => ({
        ...defaultSlides[index % defaultSlides.length],
        imageUrl: media.sourceUrl || `${mediaBaseUrl}/api/media/${media.id}`,
        imageAlt: media.originalName
      }))
    : defaultSlides;

  useEffect(() => {
    let mounted = true;
    unwrap<BannerMedia[]>(publicApi.get('/media/banners'))
      .then((items) => {
        if (mounted) setBannerMedia(items);
      })
      .catch(() => {
        if (mounted) setBannerMedia([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (sliderPaused) return;
    const timer = window.setInterval(() => {
      setSlideDirection('next');
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [sliderPaused, slides.length]);

  const slide = slides[activeSlide];
  const moveSlide = (direction: number) => {
    setSlideDirection(direction > 0 ? 'next' : 'previous');
    setActiveSlide((current) => (current + direction + slides.length) % slides.length);
  };

  const selectSlide = (index: number) => {
    if (index === activeSlide) return;
    setSlideDirection(index > activeSlide ? 'next' : 'previous');
    setActiveSlide(index);
  };

  return (
    <section
      className={`dashboard-hero relative overflow-hidden ${bannerMedia.length ? 'min-h-[430px] bg-slate-100' : `bg-gradient-to-r ${slide.tone} px-4 py-6 sm:px-6 lg:px-10 lg:py-8`} transition-colors duration-700`}
      onMouseEnter={() => setSliderPaused(true)}
      onMouseLeave={() => setSliderPaused(false)}
    >
      {showNotifications && <DashboardNotificationPanel />}
      <div className="relative mx-auto min-h-[430px] max-w-[1560px]">
        {bannerMedia.length ? (
          <img key={activeSlide} src={slide.imageUrl} alt={slide.imageAlt ?? ''} className={`dashboard-slide dashboard-slide-${slideDirection} absolute inset-0 h-full min-h-[430px] w-full object-cover`} />
        ) : (
        <div key={activeSlide} className={`dashboard-slide dashboard-slide-${slideDirection} grid min-h-[430px] items-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10`}>
          <div className="relative z-10 px-1 py-8 sm:px-5 lg:py-6">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase text-brand-700 shadow-soft">
            <Sparkles size={17} />
              {slide.eyebrow}
            </div>
            <h1 className="max-w-[680px] text-4xl font-extrabold leading-tight text-navy sm:text-5xl lg:text-[52px]">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-[650px] text-base font-medium leading-7 text-slate-700 sm:text-lg">
              {slide.description}
            </p>
            <Link to={slide.href} className="btn-primary mt-6 h-12 px-6 text-sm sm:text-base">
              {slide.action} <ArrowRight size={18} />
            </Link>
          </div>

          <div className="relative hidden h-[350px] items-center justify-center lg:flex" aria-hidden="true">
            <HeroSlideVisual visual={slide.visual} imageUrl={slide.imageUrl} imageAlt={slide.imageAlt} />
          </div>
        </div>
        )}

        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {slides.map((item, index) => (
            <button
              type="button"
              key={item.title}
              onClick={() => selectSlide(index)}
              className={`h-2.5 transition-all ${index === activeSlide ? 'w-7 bg-brand-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
              aria-label={`Xem banner ${index + 1}`}
              aria-current={index === activeSlide}
            />
          ))}
        </div>
        <button type="button" onClick={() => moveSlide(-1)} className="absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-brand-100 bg-white/90 text-navy shadow-soft hover:bg-white sm:grid" aria-label="Banner trước">
          <ChevronLeft size={20} />
        </button>
        <button type="button" onClick={() => moveSlide(1)} className="absolute right-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-brand-100 bg-white/90 text-navy shadow-soft hover:bg-white sm:grid" aria-label="Banner tiếp theo">
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

function HeroSlideVisual({ visual, imageUrl, imageAlt }: { visual: string; imageUrl?: string; imageAlt?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={imageAlt ?? ''} className="h-[340px] w-full max-w-[680px] rounded-lg border border-white/80 object-cover shadow-lift" />;
  }

  if (visual === 'study') {
    return <img src="/brand/mobile-study-reference.png" alt="" width={512} height={279} className="w-full max-w-[650px] rounded-lg border border-white/80 object-cover shadow-lift" />;
  }

  if (visual === 'plan') {
    return (
      <div className="w-full max-w-[650px] rounded-lg border border-brand-100 bg-white p-5 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs font-extrabold uppercase text-brand-700">Lộ trình hôm nay</p><p className="mt-1 text-xl font-black text-navy">Ca học 35 phút</p></div>
          <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-extrabold text-white">B2 target</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Ôn Reading', 'Ghi âm Speaking', 'Sửa Writing'].map((label, index) => (
            <div className="border-l-4 border-brand-500 bg-[#fffaf0] p-4" key={label}>
              <span className="text-xs font-black text-brand-600">0{index + 1}</span>
              <p className="mt-2 text-sm font-extrabold text-navy">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-[650px] grid-cols-[1.2fr_0.8fr] gap-4">
      <div className="rounded-lg border border-brand-100 bg-white p-6 shadow-lift">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-700"><Bot size={23} /></span><div><p className="font-extrabold text-navy">Chấm Speaking & Writing</p><p className="text-xs text-slate-500">Góp ý theo tiêu chí</p></div></div>
        <div className="mt-5 space-y-3">{[82, 68, 74].map((value, index) => <div key={value}><div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>{['Từ vựng', 'Ngữ pháp', 'Mạch lạc'][index]}</span><span>{value}%</span></div><div className="h-2 bg-slate-100"><div className="h-full bg-brand-500" style={{ width: `${value}%` }} /></div></div>)}</div>
      </div>
      <div className="flex flex-col justify-center rounded-lg bg-[#5f0b0f] p-5 text-white shadow-lift"><TrendingUp size={28} className="text-yellow-300" /><p className="mt-4 text-3xl font-black">+18%</p><p className="mt-1 text-sm font-semibold text-white/75">Tiến bộ tuần này</p></div>
    </div>
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
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

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
          <button
            type="button"
            className="w-full rounded-xl bg-sky-50/70 p-2.5 text-left transition hover:bg-brand-50"
            key={notification.id}
            onClick={() => setSelectedNotification(notification)}
          >
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
          </button>
        )) : (
          <div className="rounded-xl bg-sky-50/70 px-3 py-5 text-center">
            <Bell className="mx-auto mb-2 text-slate-300" size={26} />
            <p className="text-xs font-bold text-slate-600">Chưa có thông báo mới</p>
          </div>
        )}
      </div>
      <NotificationDialog notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
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
          <a href={zaloCommunityUrl2} target="_blank" rel="noreferrer" onClick={onClose} className="flex h-[56px] items-center justify-center gap-3 rounded-full bg-[#d71920] px-5 text-base font-extrabold text-white shadow-[0_16px_36px_rgba(80,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-[#a50f15]">
            <MessageCircle size={21} fill="currentColor" strokeWidth={0} />
            Cộng đồng Zalo 2
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
            <Link to="/app/tests/parts" className="btn-primary mt-8 h-12 px-8">
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


