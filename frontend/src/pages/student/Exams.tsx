import { ArrowRight, BookOpen, Clock, FileCheck, Headphones, Loader2, Lock, Mic, PenLine, Search, Shuffle, SpellCheck } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { SkillType, SubscriptionResponse, Test } from '../../types';

type ExamCategory = 'ALL' | SkillType;

const categoryFilters: Array<{ value: ExamCategory; label: string }> = [
  { value: 'ALL', label: 'Tất cả đề thi thử' },
  { value: 'LISTENING', label: 'Nghe' },
  { value: 'SPEAKING', label: 'Nói' },
  { value: 'READING', label: 'Đọc hiểu' },
  { value: 'WRITING', label: 'Viết' },
  { value: 'GRAMMAR', label: 'Grammar' }
];

const categoryMeta: Record<Exclude<ExamCategory, 'ALL'>, { label: string; icon: ReactNode; color: string }> = {
  LISTENING: { label: 'Nghe', icon: <Headphones size={20} />, color: 'bg-blue-50 text-blue-700' },
  SPEAKING: { label: 'Nói', icon: <Mic size={20} />, color: 'bg-rose-50 text-rose-700' },
  READING: { label: 'Đọc hiểu', icon: <BookOpen size={20} />, color: 'bg-emerald-50 text-emerald-700' },
  WRITING: { label: 'Viết', icon: <PenLine size={20} />, color: 'bg-amber-50 text-amber-700' },
  GRAMMAR: { label: 'Grammar', icon: <SpellCheck size={20} />, color: 'bg-violet-50 text-violet-700' }
};

const categoryOrder: Record<Exclude<ExamCategory, 'ALL'>, number> = {
  LISTENING: 1,
  SPEAKING: 2,
  READING: 3,
  WRITING: 4,
  GRAMMAR: 5
};

export function Exams() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const { data: subscription } = useApi<SubscriptionResponse | null>(
    () => accessToken ? unwrap<SubscriptionResponse>(api.get('/payments/subscription/me')).catch(() => null) : Promise.resolve(null),
    [accessToken]
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExamCategory>('ALL');
  const [creatingRandom, setCreatingRandom] = useState(false);

  const tests = data ?? [];
  const filteredTests = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tests.filter(isExamTest).filter((test) => !isRandomTest(test)).filter((test) => {
      const testCategory = normalizeCategory(test);
      const matchesCategory = category === 'ALL' || testCategory === category;
      const matchesQuery =
        !keyword ||
        test.title.toLowerCase().includes(keyword) ||
        test.description?.toLowerCase().includes(keyword) ||
        getCategoryLabel(testCategory).toLowerCase().includes(keyword);

      return matchesCategory && matchesQuery;
    }).sort(compareExamTests);
  }, [category, query, tests]);
  const proActive = Boolean(subscription?.proActive);
  if (loading) return <div className="rounded-[18px] border border-brand-100 bg-white p-7">Đang tải danh sách đề thi thử...</div>;
  if (error && accessToken) return <div className="rounded-[18px] border border-red-200 bg-white p-7 text-red-600">{error}</div>;

  const requireLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    if (accessToken) return;

    event.preventDefault();
    toast.error('Bạn cần đăng nhập để học bài.', { id: 'login-required' });
  };

  const requireUpgrade = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    toast.error('Bạn cần nâng cấp tài khoản để sử dụng tính năng này.', { id: 'upgrade-required' });
    window.setTimeout(() => navigate('/app/renewal'), 900);
  };

  async function createRandomExam() {
    if (!accessToken) {
      toast.error('Bạn cần đăng nhập để tạo đề thi thử random.', { id: 'login-required' });
      navigate('/login');
      return;
    }

    const skill = category === 'ALL' ? 'LISTENING' : category;
    setCreatingRandom(true);
    try {
      const randomTest = await unwrap<Test>(api.post('/tests/random', { skill, mode: 'EXAM' }));
      toast.success('Đã tạo đề thi thử random.');
      navigate(`/app/exams/${randomTest.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tạo được đề thi thử random.');
    } finally {
      setCreatingRandom(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">Đề thi</p>
          <h1 className="mt-4 text-4xl font-extrabold text-navy">Danh sách đề thi thử Aptis</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
            Chọn đề thi thử theo kỹ năng hoặc Grammar để vào giao diện làm bài.
          </p>
        </div>

        <div className="grid w-full gap-3 md:max-w-[420px]">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 text-slate-500 shadow-soft">
            <Search size={20} />
            <input
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên đề thi thử, kỹ năng hoặc Grammar..."
            />
          </label>
          <button type="button" onClick={createRandomExam} disabled={creatingRandom} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-emerald-700 disabled:opacity-70">
            {creatingRandom ? <Loader2 className="animate-spin" size={18} /> : <Shuffle size={18} />}
            {creatingRandom ? 'Đang tạo đề...' : 'Tạo đề thi thử random'}
          </button>
          <p className="rounded-xl bg-white/80 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
            Random lấy câu hỏi từ các đề thi thử đã xuất bản trong ngân hàng câu hỏi.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {categoryFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value)}
            className={`h-11 rounded-xl px-5 text-sm font-extrabold transition ${
              category === item.value
                ? 'bg-brand-600 text-white shadow-soft'
                : 'border border-brand-100 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </section>

      {filteredTests.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTests.map((test) => {
            const testCategory = normalizeCategory(test);
            const meta = categoryMeta[testCategory];
            const locked = Boolean(accessToken) && !proActive && !isFreeAllowedExam(tests, test);

            return (
              <Link
                key={test.id}
                to={locked ? '/app/renewal' : `/app/exams/${test.id}`}
                onClick={locked ? requireUpgrade : requireLogin}
                className={`group rounded-[24px] border bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift ${locked ? 'border-slate-200 opacity-80 hover:border-brand-200' : 'border-brand-100 hover:border-brand-300'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                    {meta.label}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${locked ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {locked ? 'Pro' : 'Miễn phí'}
                  </span>
                </div>

                <h2 className="mt-6 line-clamp-2 text-xl font-extrabold text-navy">{test.title}</h2>
                <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
                  {test.description || 'Đề thi thử Aptis được tạo từ trang quản trị.'}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-sky-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Clock size={17} />
                      Thời gian
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-navy">{test.durationMinutes || 0} phút</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <FileCheck size={17} />
                      Câu hỏi
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-navy">{test.questionCount ?? 0}</p>
                  </div>
                </div>

                <div className={`mt-6 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold ${locked ? 'bg-slate-100 text-slate-600' : 'bg-brand-600 text-white'}`}>
                  {locked ? 'Nâng cấp để làm' : 'Vào đề thi thử'}
                  {locked ? <Lock size={18} /> : <ArrowRight className="transition group-hover:translate-x-1" size={18} />}
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <FileCheck />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-navy">Chưa có đề thi thử phù hợp</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-600">
            Nếu muốn hiện ở mục Grammar, hãy đặt tên hoặc mô tả đề có chữ "Grammar" hoặc "Ngữ pháp".
          </p>
        </section>
      )}
    </div>
  );
}

function normalizeCategory(test: Test): Exclude<ExamCategory, 'ALL'> {
  const value = `${test.skillName ?? ''} ${test.title ?? ''} ${test.description ?? ''}`.toUpperCase();
  if (value.includes('GRAMMAR') || value.includes('NGỮ PHÁP') || value.includes('NGU PHAP')) return 'GRAMMAR';
  if (value.includes('SPEAKING')) return 'SPEAKING';
  if (value.includes('READING')) return 'READING';
  if (value.includes('WRITING')) return 'WRITING';
  return 'LISTENING';
}

function getCategoryLabel(category: Exclude<ExamCategory, 'ALL'>) {
  return categoryMeta[category].label;
}

function compareExamTests(left: Test, right: Test) {
  const leftCategory = normalizeCategory(left);
  const rightCategory = normalizeCategory(right);
  const categoryCompare = categoryOrder[leftCategory] - categoryOrder[rightCategory];
  if (categoryCompare !== 0) return categoryCompare;

  const leftNumber = getExamNumber(left.title);
  const rightNumber = getExamNumber(right.title);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) return leftNumber - rightNumber;
  if (leftNumber !== null && rightNumber === null) return -1;
  if (leftNumber === null && rightNumber !== null) return 1;

  return left.title.localeCompare(right.title, 'vi', { numeric: true, sensitivity: 'base' });
}

function isFreeAllowedExam(tests: Test[], target: Test) {
  const category = normalizeCategory(target);
  return tests
    .filter((test) => test.mode === 'EXAM' && test.status === 'PUBLISHED')
    .filter((test) => !isRandomTest(test))
    .filter((test) => normalizeCategory(test) === category)
    .sort((left, right) => left.id - right.id)
    .slice(0, 2)
    .some((test) => test.id === target.id);
}

function getExamNumber(title?: string) {
  const match = String(title ?? '').match(/(?:đề|de|test|exam)\s*0*(\d+)/i);
  return match?.[1] ? Number(match[1]) : null;
}

function isExamTest(test: Test) {
  if (test.mode) return test.mode === 'EXAM';
  const value = `${test.title ?? ''} ${test.description ?? ''}`.toLowerCase();
  if (value.includes('practice') || value.includes('luyen tap') || value.includes('luyện tập')) return false;
  return value.includes('bộ đề') || value.includes('bo de') || value.includes('đề thi') || value.includes('de thi') || value.includes('exam') || value.includes('mock');
}

function isRandomTest(test: Test) {
  const title = test.title.toLowerCase();
  return title.startsWith('đề thi thử random') || title.startsWith('bộ đề random');
}
