import { ArrowLeft, ArrowRight, BookOpen, FileText, Headphones, Lightbulb, Loader2, Lock, Mic, PenLine, Search, Shuffle, SpellCheck, Star, Timer } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { Question, SkillType, SubscriptionResponse, Test } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

const POINTS_PER_QUESTION = 2;
const PART_MENU_SKILL_KEY = 'aptis-part-menu-skill';

const skillCards: Array<{
  type: SkillType;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
}> = [
  {
    type: 'LISTENING',
    title: 'Listening',
    subtitle: 'Luyện nghe theo từng part và mẹo bắt keyword.',
    accent: 'bg-blue-50 text-brand-600',
    icon: <Headphones />
  },
  {
    type: 'SPEAKING',
    title: 'Speaking',
    subtitle: 'Luyện nói từng part, câu hỏi hình ảnh và bài mẫu.',
    accent: 'bg-rose-50 text-rose-600',
    icon: <Mic />
  },
  {
    type: 'READING',
    title: 'Reading',
    subtitle: 'Luyện gap-fill, sắp xếp câu, forum matching và đọc hiểu.',
    accent: 'bg-emerald-50 text-emerald-600',
    icon: <BookOpen />
  },
  {
    type: 'WRITING',
    title: 'Writing',
    subtitle: 'Luyện form, email, chat response và cách đếm từ.',
    accent: 'bg-amber-50 text-amber-600',
    icon: <PenLine />
  },
  {
    type: 'GRAMMAR',
    title: 'Grammar',
    subtitle: 'Luyện ngữ pháp, từ vựng, collocation và các dạng chọn đáp án.',
    accent: 'bg-violet-50 text-violet-600',
    icon: <SpellCheck />
  }
];

const defaultParts = [1, 2, 3, 4];

function useRequireLogin() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (accessToken) return;

    event.preventDefault();
    toast.error('Bạn cần đăng nhập để làm bài luyện.', { id: 'login-required' });
    navigate('/login');
  };
}

export function Tests() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const { data: subscription } = useApi<SubscriptionResponse | null>(
    () => accessToken ? unwrap<SubscriptionResponse>(api.get('/payments/subscription/me')).catch(() => null) : Promise.resolve(null),
    [accessToken]
  );
  const [query, setQuery] = useState('');
  const tests = data ?? [];
  const proActive = Boolean(subscription?.proActive);

  if (loading) return <InfoCard>Đang tải danh sách bài luyện...</InfoCard>;
  if (error && accessToken) return <InfoCard error>{error}</InfoCard>;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Luyện tập theo 5 kỹ năng</h1>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-slate-600">
            Chọn kỹ năng để luyện theo từng part hoặc xem mẹo làm bài.
          </p>
        </div>
        <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 text-slate-500 shadow-soft md:max-w-[420px]">
          <Search size={20} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kỹ năng hoặc bài luyện..."
          />
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {skillCards.map((skill) => (
          <SkillPracticeCard
            key={skill.type}
            skill={skill}
            proActive={proActive}
            tests={tests
              .filter((test) => !isRandomTest(test))
              .filter((test) => normalizeSkill(test.skillName) === skill.type)
              .filter((test) => {
                const keyword = query.trim().toLowerCase();
                if (!keyword) return true;
                return skill.title.toLowerCase().includes(keyword) || test.title.toLowerCase().includes(keyword);
              })}
          />
        ))}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-brand-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-3 font-semibold text-slate-700"><ArrowLeft />Quay lại</Link>
          <span className="rounded-full bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700">Chọn kỹ năng để bắt đầu</span>
          <span className="hidden items-center gap-3 font-semibold text-slate-700 sm:inline-flex">Kế tiếp <ArrowRight /></span>
        </div>
      </div>
    </div>
  );
}

export function TestPartMenu() {
  const requireLogin = useRequireLogin();
  const partSkills = skillCards.filter((skill) => skill.type !== 'GRAMMAR');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSkillType, setSelectedSkillType] = useState<SkillType>(() => {
    const skillFromUrl = normalizeParam(searchParams.get('skill') ?? undefined);
    const skillFromStorage = getStoredPartSkill();
    return skillFromUrl || skillFromStorage || partSkills[0].type;
  });
  const selectedSkill = partSkills.find((skill) => skill.type === selectedSkillType) ?? partSkills[0];
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const selectedPracticeTests = useMemo(() => {
    return (data ?? [])
      .filter(isPartPracticeSource)
      .filter((test) => !isRandomTest(test))
      .filter(hasImportedQuestions)
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill.type)
      .sort(compareTestsByNaturalNumber);
  }, [data, selectedSkill.type]);
  const selectedPracticeTestIds = selectedPracticeTests.map((test) => test.id).join(',');
  const { data: writingGroups, loading: writingLoading, error: writingError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (selectedSkill.type !== 'WRITING' || !selectedPracticeTests.length) return [];
      return Promise.all(selectedPracticeTests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
    },
    [selectedSkill.type, selectedPracticeTestIds]
  );
  const writingTopics = useMemo(() => getWritingClubTopics(writingGroups ?? []), [writingGroups]);
  const isWritingSelected = selectedSkill.type === 'WRITING';

  useEffect(() => {
    const nextSkill = normalizeParam(searchParams.get('skill') ?? undefined);
    if (nextSkill && nextSkill !== selectedSkillType && partSkills.some((skill) => skill.type === nextSkill)) {
      setSelectedSkillType(nextSkill);
    }
  }, [searchParams]);

  function selectSkill(skillType: SkillType) {
    setSelectedSkillType(skillType);
    window.localStorage.setItem(PART_MENU_SKILL_KEY, skillType);
    setSearchParams({ skill: skillType }, { replace: true });
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
        <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">
          {isWritingSelected ? 'Luyện tập theo chủ đề' : 'Luyện tập theo part'}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold">Chọn kỹ năng</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          {isWritingSelected
            ? 'Chọn Writing, sau đó chọn chủ đề câu hỏi bạn muốn luyện.'
            : 'Chọn Nghe, Nói hoặc Đọc, sau đó chọn Part 1, 2, 3 hoặc 4 để luyện.'}
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        {partSkills.map((skill) => (
          <button
            key={skill.type}
            type="button"
            onClick={() => selectSkill(skill.type)}
            className={`inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-extrabold transition ${
              selectedSkill.type === skill.type
                ? 'bg-brand-600 text-white shadow-soft'
                : 'border border-brand-100 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            {skill.icon}
            {skill.title}
          </button>
        ))}
      </section>

      {(error || (isWritingSelected && writingError)) && <InfoCard error>{error || writingError}</InfoCard>}

      <section className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex gap-4">
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${selectedSkill.accent}`}>{selectedSkill.icon}</div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{isWritingSelected ? 'Theo chủ đề' : 'Theo part'}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-navy">{selectedSkill.title}</h2>
            <p className="mt-2 leading-7 text-slate-600">
              {isWritingSelected ? 'Luyện Writing theo từng nhóm chủ đề câu hỏi.' : selectedSkill.subtitle}
            </p>
          </div>
        </div>
      </section>

      {isWritingSelected ? (
        writingLoading || loading ? (
          <InfoCard>Đang tải chủ đề Writing...</InfoCard>
        ) : writingTopics.length ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {writingTopics.map((topic) => (
              <Link
                key={`${topic.testId}-${topic.questionId}-${topic.clubIndex}`}
                to={`/app/tests/${topic.testId}?questionId=${topic.questionId}&clubIndex=${topic.clubIndex}`}
                state={{ returnTo: '/app/tests/parts?skill=WRITING' }}
                onClick={requireLogin}
                className="group rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
              >
                <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${selectedSkill.accent}`}>
                  <FileText />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Chủ đề Writing</p>
                <h2 className="mt-1 text-2xl font-extrabold text-navy">{topic.displayName}</h2>
                <span className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white transition group-hover:bg-brand-700">
                  Bắt đầu <ArrowRight size={17} />
                </span>
              </Link>
            ))}
          </section>
        ) : (
          <InfoCard>Chưa có chủ đề Writing. Hãy import file Writing trong Admin.</InfoCard>
        )
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {partsForSkill(selectedSkill.type).map((part) => {
            const partTests = filterTestsByPart(selectedPracticeTests, part);
            const firstTest = partTests[0];
            const cardContent = (
              <>
                <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${selectedSkill.accent}`}>
                  <FileText />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{selectedSkill.title}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-navy">Part {part}</h2>
                <p className="mt-2 min-h-6 text-sm leading-6 text-slate-600">
                  {loading ? 'Đang tải bài luyện...' : `${partTests.length} bài luyện`}
                </p>
                <span className={`mt-6 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition ${
                  firstTest ? 'bg-brand-600 text-white group-hover:bg-brand-700' : 'bg-sky-100 text-slate-500'
                }`}>
                  {firstTest ? 'Bắt đầu' : 'Chưa có bài'} {firstTest && <ArrowRight size={17} />}
                </span>
              </>
            );

            if (!firstTest) {
              return (
                <div key={`${selectedSkill.type}-${part}`} className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={`${selectedSkill.type}-${part}`}
                to={`/app/tests/${firstTest.id}`}
                state={{ returnTo: `/app/tests/parts?skill=${selectedSkill.type}` }}
                className="group rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
              >
                {cardContent}
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
        <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Luyện tập theo part</p>
        <h1 className="mt-3 text-4xl font-extrabold">Chọn kỹ năng và part</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Học viên chọn trực tiếp Part 1, 2, 3 hoặc 4 của từng kỹ năng.</p>
      </section>

      <section className="grid gap-5">
        {skillCards.map((skill) => (
          <div key={skill.type} className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex gap-4">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${skill.accent}`}>{skill.icon}</div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Theo part</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-navy">{skill.title}</h2>
                  <p className="mt-2 leading-7 text-slate-600">{skill.subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
                {partsForSkill(skill.type).map((part) => (
                  <Link
                    key={`${skill.type}-${part}`}
                    to={`/app/tests/questions/${skill.type}/part/${part}`}
                    className="flex h-12 items-center justify-center rounded-xl border border-brand-200 bg-white text-sm font-extrabold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50"
                  >
                    Part {part}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function SkillQuestionParts() {
  const requireLogin = useRequireLogin();
  const { skillType } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const tests = useMemo(() => {
    if (!selectedSkill) return [];
    return (data ?? [])
      .filter(isPartPracticeSource)
      .filter((test) => !isRandomTest(test))
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill);
  }, [data, selectedSkill]);

  const { data: writingGroups, loading: writingLoading, error: writingError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (selectedSkill !== 'WRITING' || !tests.length) return [];
      return Promise.all(tests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
    },
    [selectedSkill, tests.map((test) => test.id).join(',')]
  );
  const writingTopics = useMemo(() => getWritingClubTopics(writingGroups ?? []), [writingGroups]);

  if (loading || (selectedSkill === 'WRITING' && writingLoading)) return <InfoCard>Đang tải danh sách...</InfoCard>;
  if (error || (selectedSkill === 'WRITING' && writingError)) return <InfoCard error>{error || writingError}</InfoCard>;
  if (!skill) return <InfoCard>Không tìm thấy kỹ năng.</InfoCard>;

  if (selectedSkill === 'WRITING') {
    return (
      <div className="space-y-7">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
          <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
          <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Luyện theo chủ đề</p>
          <h1 className="mt-3 text-4xl font-extrabold">Writing</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Chọn chủ đề Writing bạn muốn luyện.</p>
        </section>

        {writingTopics.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {writingTopics.map((topic) => (
              <Link
                to={`/app/tests/${topic.testId}?questionId=${topic.questionId}&clubIndex=${topic.clubIndex}`}
                onClick={requireLogin}
                className={`flex h-14 items-center justify-center rounded-lg px-5 text-lg font-semibold shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${getWritingTopicColor(topic.clubIndex)}`}
                key={`${topic.testId}-${topic.questionId}-${topic.clubIndex}`}
              >
                {topic.displayName}
              </Link>
            ))}
          </section>
        ) : (
          <InfoCard>Chưa có chủ đề Writing. Hãy import file Writing trong Admin.</InfoCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
        <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Luyện theo part</p>
        <h1 className="mt-3 text-4xl font-extrabold">{skill.title}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Chọn part bạn muốn luyện.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {partsForSkill(selectedSkill).map((part) => {
            const displayTests = filterTestsByPart(tests, part);
          const firstTest = displayTests[0];
          return (
            <div className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft" key={part}>
              <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${skill.accent}`}>
                <FileText />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{skill.title}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-navy">Part {part}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{displayTests.length} bài luyện</p>
              {firstTest ? (
                <Link to={`/app/tests/questions/${skill.type}/part/${part}`} onClick={requireLogin} className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white">
                  Bắt đầu <ArrowRight size={17} />
                </Link>
              ) : (
                <button className="mt-6 flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-sky-100 text-sm font-extrabold text-slate-500" type="button">
                  Chưa có bài
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function SkillPartQuestions() {
  const requireLogin = useRequireLogin();
  const { skillType, part } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const selectedPart = Number(part);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data: allTests, loading: testsLoading, error: testsError } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);

  const partTests = useMemo(() => {
    if (!selectedSkill || !Number.isFinite(selectedPart)) return [];
    return (allTests ?? [])
      .filter(isPartPracticeSource)
      .filter((test) => !isRandomTest(test))
      .filter(hasImportedQuestions)
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill)
      .filter((test) => selectedPart <= 4 || selectedSkill === 'READING')
      .sort(compareTestsByNaturalNumber);
  }, [allTests, selectedPart, selectedSkill]);

  const { data: questionGroups, loading: questionsLoading, error: questionsError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (!partTests.length) return [];
      const groups = await Promise.all(partTests.map(async (test) => ({
        test,
        questions: (await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`)))
          .filter((question) => isQuestionInPart(question, selectedSkill, selectedPart))
      })));
      return groups.filter((group) => group.questions.length > 0);
    },
    [partTests.map((test) => test.id).join(','), selectedPart, selectedSkill]
  );

  if (testsLoading || questionsLoading) return <InfoCard>Đang tải câu hỏi...</InfoCard>;
  if (testsError || questionsError) return <InfoCard error>{testsError || questionsError}</InfoCard>;
  if (!skill) return <InfoCard>Không tìm thấy kỹ năng.</InfoCard>;

  const totalQuestions = questionGroups?.reduce((sum, group) => sum + group.questions.length, 0) ?? 0;

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
        <Link to={`/app/tests/questions/${skill.type}`} className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại chọn part</Link>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Luyện theo part</p>
        <h1 className="mt-3 text-4xl font-extrabold">{skill.title} - Part {selectedPart}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Có {totalQuestions} câu hỏi. Chọn câu để luyện.</p>
      </section>

      {questionGroups?.length ? (
        <section className="space-y-5">
          {questionGroups.map(({ test, questions }) => (
            <div className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft" key={test.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{skill.title} - Part {selectedPart}</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-navy">{test.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{questions.length} câu hỏi</p>
                </div>
                <Link to={`/app/tests/${test.id}`} state={{ returnTo: `/app/tests/questions/${skill.type}/part/${selectedPart}` }} onClick={requireLogin} className="btn-primary h-11 px-5">Làm cả bài <ArrowRight size={17} /></Link>
              </div>

              <div className="mt-5 grid gap-3">
                {questions.map((question, index) => (
                  <Link
                    to={`/app/tests/${test.id}?questionId=${question.id}`}
                    state={{ returnTo: `/app/tests/questions/${skill.type}/part/${selectedPart}` }}
                    onClick={requireLogin}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-brand-100 bg-sky-50 px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50"
                    key={question.id}
                  >
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-sm font-extrabold text-brand-700">{index + 1}</span>
                      <div>
                        <p className="line-clamp-2 font-bold text-navy">{previewQuestion(question)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{question.type} - {displayQuestionMeta(question)}</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 shrink-0 text-slate-500" size={18} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <InfoCard>Chưa có câu hỏi nào cho {skill.title} Part {selectedPart}.</InfoCard>
      )}
    </div>
  );
}

function SkillPracticeCard({ skill, tests, proActive }: {
  skill: (typeof skillCards)[number];
  tests: Test[];
  proActive: boolean;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const practiceTests = tests.filter(isPracticeTest).filter(hasImportedQuestions);
  const firstPracticeTest = practiceTests[0];

  return (
    <div className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${skill.accent}`}>{skill.icon}</div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Kỹ năng</p>
            <h2 className="mt-1 text-2xl font-extrabold text-navy">{skill.title}</h2>
            <p className="mt-2 max-w-xl leading-7 text-slate-600">{skill.subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-slate-700">{practiceTests.length} bài luyện</span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <ModeButton
          to={`/app/tests/questions/${skill.type}`}
          icon={accessToken && !proActive ? <Lock size={18} /> : <FileText size={18} />}
          title={accessToken && !proActive ? 'Theo part cần Pro' : 'Luyện theo part'}
          disabled={Boolean(accessToken) && (!firstPracticeTest || !proActive)}
          proLocked={Boolean(accessToken) && Boolean(firstPracticeTest) && !proActive}
          primary
        />
        <ModeButton to={`/app/lessons/${skill.type}`} icon={<Lightbulb size={18} />} title="Mẹo học" />
      </div>

      {!practiceTests.length && (
        <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-slate-600">
          Chưa có bài luyện cho kỹ năng này. Tạo bài trong Admin - Nội dung - Bài luyện.
        </p>
      )}
    </div>
  );
}

function ModeButton({ to, icon, title, primary, disabled, proLocked }: {
  to: string;
  icon: ReactNode;
  title: string;
  primary?: boolean;
  disabled?: boolean;
  proLocked?: boolean;
}) {
  const requireLogin = useRequireLogin();
  const navigate = useNavigate();

  if (disabled) {
    return (
      <button
        className={`flex h-12 items-center justify-center gap-2 rounded-xl border border-brand-100 bg-sky-100 text-sm font-extrabold text-slate-500 ${proLocked ? 'cursor-pointer hover:border-brand-200 hover:text-brand-700' : 'cursor-not-allowed'}`}
        type="button"
        onClick={proLocked ? () => {
          toast.error('Bạn cần nâng cấp tài khoản để sử dụng tính năng này.', { id: 'upgrade-required' });
          window.setTimeout(() => navigate('/app/renewal'), 900);
        } : undefined}
      >
        {icon}{title}
      </button>
    );
  }

  return (
    <Link className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold ${primary ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-white text-brand-600 hover:bg-brand-50'}`} to={to} onClick={requireLogin}>
      {icon}{title}
    </Link>
  );
}

function InfoCard({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`rounded-[18px] border bg-white p-7 ${error ? 'border-red-200 text-red-600' : 'border-brand-100 text-slate-700'}`}>
      {children}
    </div>
  );
}

function normalizeSkill(skillName: string): SkillType | '' {
  const value = removeVietnameseMarks(skillName).toUpperCase();
  if (value.includes('LISTENING') || value.includes('NGHE')) return 'LISTENING';
  if (value.includes('SPEAKING') || value.includes('NOI')) return 'SPEAKING';
  if (value.includes('READING') || value.includes('DOC')) return 'READING';
  if (value.includes('WRITING') || value.includes('VIET')) return 'WRITING';
  if (value.includes('GRAMMAR') || value.includes('NGU PHAP')) return 'GRAMMAR';
  return '';
}

function removeVietnameseMarks(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function skillLabel(skillName: string) {
  const skill = normalizeSkill(skillName);
  if (skill === 'LISTENING') return 'Nghe';
  if (skill === 'SPEAKING') return 'Nói';
  if (skill === 'READING') return 'Đọc hiểu';
  if (skill === 'WRITING') return 'Viết';
  if (skill === 'GRAMMAR') return 'Grammar';
  return 'Thi thử';
}

function formatTestTitle(title: string, skillName: string) {
  const skill = skillLabel(skillName);
  const cleaned = (title || 'Đề thi thử Aptis').trim();
  return cleaned
    .replace(/^de\s+/i, 'Đề ')
    .replace(/^đề\s+/i, 'Đề ')
    .replace(/\blistening\b/i, skill === 'Nghe' ? 'Listening' : 'Listening')
    .replace(/\bspeaking\b/i, 'Speaking')
    .replace(/\breading\b/i, 'Reading')
    .replace(/\bwriting\b/i, 'Writing')
    .replace(/\bgrammar\b/i, 'Grammar');
}

function normalizeParam(value?: string): SkillType | '' {
  const upper = value?.toUpperCase();
  return upper === 'LISTENING' || upper === 'SPEAKING' || upper === 'READING' || upper === 'WRITING' || upper === 'GRAMMAR' ? upper : '';
}

function getStoredPartSkill(): SkillType | '' {
  if (typeof window === 'undefined') return '';
  return normalizeParam(window.localStorage.getItem(PART_MENU_SKILL_KEY) ?? undefined);
}

function filterTestsByPart(tests: Test[], part: number) {
  const pattern = new RegExp(`\\b(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i');
  return tests.filter((test) => pattern.test(normalizePartSearchText(`${test.title} ${test.description}`)));
}

function partsForSkill(skill?: SkillType | '') {
  return skill === 'READING' ? [1, 2, 3, 4, 5] : defaultParts;
}

function isPartPracticeSource(test: Test) {
  return isPracticeTest(test) || (test.mode === 'EXAM' && test.status === 'PUBLISHED');
}

function isQuestionInPart(question: Question, skill: SkillType | '', part: number) {
  const template = parseQuestionTemplate(question.content);
  const rawPart = template && 'part' in template ? String((template as { part?: unknown }).part ?? '') : '';
  const content = normalizePartSearchText([
    question.topic,
    question.content,
    question.explanation,
    rawPart
  ].map((value) => String(value ?? '')).join(' ')).toLowerCase();

  if (rawPart) {
    const parsed = Number(rawPart.replace(/\D+/g, ''));
    if (Number.isFinite(parsed) && parsed === part) return true;
  }

  if (skill === 'READING') {
    const templateName = String(template?.template ?? '').toUpperCase();
    if (part === 1 && templateName === 'READING_GAP_FILL') return true;
    if ((part === 2 || part === 3) && templateName === 'READING_SENTENCE_ORDER') {
      return part === 3 ? content.includes('part 3') : !content.includes('part 3');
    }
    if (part === 4 && templateName === 'READING_FORUM_MATCH') return true;
    if (part === 5 && templateName === 'READING_HEADING_MATCH') return true;
  }

  return new RegExp(`\\b(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i').test(content);
}

function normalizePartSearchText(value: string) {
  return removeVietnameseMarks(value)
    .replace(/[_/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isExamTest(test: Test) {
  if (test.mode) return test.mode === 'EXAM';
  const value = `${test.title ?? ''} ${test.description ?? ''}`.toLowerCase();
  if (value.includes('practice') || value.includes('luyen tap')) return false;
  return value.includes('bo de') || value.includes('de thi') || value.includes('exam') || value.includes('mock');
}

function isPracticeTest(test: Test) {
  return !isExamTest(test);
}

function isRandomTest(test: Test) {
  const title = test.title.toLowerCase();
  return title.startsWith('đề thi thử random') || title.startsWith('bộ đề random');
}

function hasImportedQuestions(test: Test) {
  return (test.questionCount ?? 0) > 0;
}

function isFreeAllowedExam(tests: Test[], target: Test) {
  const skill = normalizeSkill(target.skillName);
  return tests
    .filter((test) => test.mode === 'EXAM' && test.status === 'PUBLISHED')
    .filter((test) => !isRandomTest(test))
    .filter((test) => normalizeSkill(test.skillName) === skill)
    .sort((left, right) => left.id - right.id)
    .slice(0, 2)
    .some((test) => test.id === target.id);
}

function compareTestsByNaturalNumber(left: Test, right: Test) {
  const leftNumber = getTestOrderNumber(left);
  const rightNumber = getTestOrderNumber(right);

  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  if (leftNumber !== null && rightNumber === null) return -1;
  if (leftNumber === null && rightNumber !== null) return 1;

  return `${left.title} ${left.description ?? ''}`.localeCompare(
    `${right.title} ${right.description ?? ''}`,
    'vi',
    { numeric: true, sensitivity: 'base' }
  );
}

function getTestOrderNumber(test: Test) {
  const value = `${test.title ?? ''} ${test.description ?? ''}`;
  const patterns = [
    /\bpractice\s*test\s*(\d+)\b/i,
    /\btest\s*(\d+)\b/i,
    /#\s*0*(\d+)\b/i,
    /\b(?:bo\s*de|bộ\s*đề|de|đề)\s*0*(\d+)\b/i
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }

  return null;
}

function getWritingClubTopics(groups: Array<{ test: Test; questions: Question[] }>) {
  return groups.flatMap(({ test, questions }) =>
    questions.flatMap((question) => {
      const template = parseQuestionTemplate(question.content);
      if (template?.template !== 'WRITING_CLUB_COLLECTION' || !Array.isArray(template.clubs)) return [];
      return template.clubs.map((club: { clubName?: string }, clubIndex: number) => ({
        testId: test.id,
        questionId: question.id,
        clubIndex,
        clubName: club.clubName || `Chủ đề ${clubIndex + 1}`,
        displayName: displayWritingClubName(club.clubName, clubIndex)
      }));
    })
  );
}

function parseQuestionTemplate(content: string) {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed as { template?: string; clubs?: Array<{ clubName?: string }> } : null;
  } catch {
    return null;
  }
}

function getWritingTopicColor(index: number) {
  const colors = [
    'bg-amber-400 text-navy',
    'bg-emerald-700 text-white',
    'bg-amber-400 text-navy',
    'bg-red-500 text-white',
    'bg-emerald-700 text-white',
    'bg-red-500 text-white',
    'bg-emerald-700 text-white',
    'bg-cyan-500 text-navy',
    'bg-brand-600 text-white',
    'bg-brand-600 text-white',
    'bg-emerald-700 text-white',
    'bg-cyan-500 text-navy'
  ];
  return colors[index % colors.length];
}

function previewQuestion(question: Question) {
  const directTopic = cleanTopicTitle(question.topic);
  if (directTopic && !isGenericPartTopic(directTopic)) return directTopic;

  try {
    const data = JSON.parse(question.content);
    const topic = cleanTopicTitle(data.topic);
    const value = topic && !isGenericPartTopic(topic)
      ? topic
      : data.title || data.prompt || data.instructions || data.content || question.content;
    return repairMojibake(String(value));
  } catch {
    return repairMojibake(question.content);
  }
}

function cleanTopicTitle(value?: string) {
  if (!value) return '';
  return repairMojibake(value).replace(/^topic:\s*/i, '').trim();
}

function displayWritingClubName(value: string | undefined, index: number) {
  const cleaned = cleanTopicTitle(value);
  if (!cleaned || isTechnicalTopicName(cleaned)) return `Chủ đề ${index + 1}`;
  return cleaned;
}

function isTechnicalTopicName(value: string) {
  return /^[a-z]+(?:_[a-z0-9]+)+$/i.test(value.trim());
}

function isGenericPartTopic(value: string) {
  return /^(reading|listening|grammar|writing|speaking)\s+part\s+\d+$/i.test(value.trim());
}

function displayQuestionMeta(question: Question) {
  const topic = cleanTopicTitle(question.topic);
  const prefix = topic ? `${topic} - ` : '';
  return `${prefix}${POINTS_PER_QUESTION} điểm`;
}
