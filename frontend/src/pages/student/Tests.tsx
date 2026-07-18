import { ArrowLeft, ArrowRight, BookOpen, FileText, Headphones, Lightbulb, Mic, PenLine, Search, SpellCheck, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Question, SkillType, Test } from '../../types';

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
    subtitle: 'Luyện nghe theo câu hỏi, bộ đề và mẹo bắt keyword.',
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

const parts = [1, 2, 3, 4];

export function Tests() {
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const [query, setQuery] = useState('');
  const tests = data ?? [];

  if (loading) return <InfoCard>Đang tải danh sách bài luyện...</InfoCard>;
  if (error) return <InfoCard error>{error}</InfoCard>;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950">Luyện tập theo 5 kỹ năng</h1>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-slate-500">
            Chọn kỹ năng, luyện theo câu hỏi, làm bộ đề hoặc xem mẹo làm bài.
          </p>
        </div>
        <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 shadow-soft md:max-w-[420px]">
          <Search size={20} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kỹ năng hoặc bộ đề..."
          />
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {skillCards.map((skill) => (
          <SkillPracticeCard
            key={skill.type}
            skill={skill}
            tests={tests
              .filter((test) => normalizeSkill(test.skillName) === skill.type)
              .filter((test) => {
                const keyword = query.trim().toLowerCase();
                if (!keyword) return true;
                return skill.title.toLowerCase().includes(keyword) || test.title.toLowerCase().includes(keyword);
              })}
          />
        ))}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-3 font-semibold text-slate-600"><ArrowLeft />Quay lại</Link>
          <span className="rounded-full bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700">Chọn kỹ năng để bắt đầu</span>
          <span className="hidden items-center gap-3 font-semibold text-slate-600 sm:inline-flex">Kế tiếp <ArrowRight /></span>
        </div>
      </div>
    </div>
  );
}

export function SkillQuestionParts() {
  const { skillType } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const tests = useMemo(() => {
    if (!selectedSkill) return [];
    return (data ?? [])
      .filter(isPracticeTest)
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
        <section className="rounded-[24px] bg-slate-950 p-8 text-white">
          <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
          <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Học theo câu hỏi</p>
          <h1 className="mt-3 text-4xl font-extrabold">Writing</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Chọn chủ đề Writing bạn muốn luyện.</p>
        </section>

        {writingTopics.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {writingTopics.map((topic) => (
              <Link
                to={`/app/tests/${topic.testId}?questionId=${topic.questionId}&clubIndex=${topic.clubIndex}`}
                className={`flex h-14 items-center justify-center rounded-lg px-5 text-lg font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getWritingTopicColor(topic.clubIndex)}`}
                key={`${topic.testId}-${topic.questionId}-${topic.clubIndex}`}
              >
                {topic.clubName}
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
      <section className="rounded-[24px] bg-slate-950 p-8 text-white">
        <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Học theo câu hỏi</p>
        <h1 className="mt-3 text-4xl font-extrabold">{skill.title}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Chọn part bạn muốn luyện.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {parts.map((part) => {
          const displayTests = filterTestsByPart(tests, part);
          const firstTest = displayTests[0];
          return (
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft" key={part}>
              <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${skill.accent}`}>
                <FileText />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{skill.title}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Part {part}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{displayTests.length} bài luyện</p>
              {firstTest ? (
                <Link to={`/app/tests/questions/${skill.type}/part/${part}`} className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white">
                  Bắt đầu <ArrowRight size={17} />
                </Link>
              ) : (
                <button className="mt-6 flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-400" type="button">
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

export function SkillTestSets() {
  const { skillType } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const [query, setQuery] = useState('');

  const tests = useMemo(() => {
    if (!selectedSkill) return [];
    return (data ?? [])
      .filter(isExamTest)
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill)
      .filter((test) => test.title.toLowerCase().includes(query.toLowerCase()));
  }, [data, query, selectedSkill]);

  if (loading) return <InfoCard>Đang tải bộ đề...</InfoCard>;
  if (error) return <InfoCard error>{error}</InfoCard>;
  if (!skill) return <InfoCard>Không tìm thấy kỹ năng.</InfoCard>;

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] bg-slate-950 p-8 text-white">
        <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <div className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Học theo bộ đề</p>
            <h1 className="mt-3 text-4xl font-extrabold">{skill.title}</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Chọn bộ đề và bắt đầu làm bài.</p>
          </div>
          <label className="flex h-12 w-full items-center gap-3 rounded-xl bg-white px-4 text-slate-400 md:max-w-[360px]">
            <Search size={20} />
            <input
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm bộ đề..."
            />
          </label>
        </div>
      </section>

      {tests.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => (
            <Link
              key={test.id}
              to={`/app/tests/${test.id}`}
              className="group flex min-h-[190px] flex-col rounded-[20px] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{skillLabel(test.skillName)}</span>
                <ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" size={19} />
              </div>
              <h2 className="line-clamp-2 text-2xl font-extrabold leading-7 text-slate-950">{formatTestTitle(test.title, test.skillName)}</h2>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-slate-500">
                <span>{test.durationMinutes || 0} phút</span>
                <span className="text-slate-300">•</span>
                <span>{test.questionCount ?? 0} câu</span>
              </div>
              <div className="mt-auto pt-4">
                <span className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white transition group-hover:bg-brand-700">
                  Xem bộ đề <ArrowRight size={18} />
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <InfoCard>Chưa có bộ đề phù hợp với kỹ năng này.</InfoCard>
      )}
    </div>
  );
}

export function SkillPartQuestions() {
  const { skillType, part } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const selectedPart = Number(part);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data: allTests, loading: testsLoading, error: testsError } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);

  const partTests = useMemo(() => {
    if (!selectedSkill || !Number.isFinite(selectedPart)) return [];
    return filterTestsByPart(
      (allTests ?? [])
        .filter(isPracticeTest)
        .filter((test) => normalizeSkill(test.skillName) === selectedSkill),
      selectedPart
    );
  }, [allTests, selectedPart, selectedSkill]);

  const { data: questionGroups, loading: questionsLoading, error: questionsError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (!partTests.length) return [];
      return Promise.all(partTests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
    },
    [partTests.map((test) => test.id).join(',')]
  );

  if (testsLoading || questionsLoading) return <InfoCard>Đang tải câu hỏi...</InfoCard>;
  if (testsError || questionsError) return <InfoCard error>{testsError || questionsError}</InfoCard>;
  if (!skill) return <InfoCard>Không tìm thấy kỹ năng.</InfoCard>;

  const totalQuestions = questionGroups?.reduce((sum, group) => sum + group.questions.length, 0) ?? 0;

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] bg-slate-950 p-8 text-white">
        <Link to={`/app/tests/questions/${skill.type}`} className="inline-flex items-center gap-2 text-sm font-bold text-blue-100"><ArrowLeft size={18} />Quay lại chọn part</Link>
        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-200">Học theo câu hỏi</p>
        <h1 className="mt-3 text-4xl font-extrabold">{skill.title} - Part {selectedPart}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Có {totalQuestions} câu hỏi. Chọn câu để luyện.</p>
      </section>

      {questionGroups?.length ? (
        <section className="space-y-5">
          {questionGroups.map(({ test, questions }) => (
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft" key={test.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{skill.title} - Part {selectedPart}</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{test.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{questions.length} câu hỏi</p>
                </div>
                <Link to={`/app/tests/${test.id}`} className="btn-primary h-11 px-5">Làm cả bài <ArrowRight size={17} /></Link>
              </div>

              <div className="mt-5 grid gap-3">
                {questions.map((question, index) => (
                  <Link
                    to={`/app/tests/${test.id}?questionId=${question.id}`}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50"
                    key={question.id}
                  >
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-sm font-extrabold text-brand-700">{index + 1}</span>
                      <div>
                        <p className="line-clamp-2 font-bold text-slate-800">{previewQuestion(question.content)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{question.type} - {question.points} điểm</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 shrink-0 text-slate-400" size={18} />
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

function SkillPracticeCard({ skill, tests }: {
  skill: (typeof skillCards)[number];
  tests: Test[];
}) {
  const practiceTests = tests.filter(isPracticeTest);
  const examTests = tests.filter(isExamTest);
  const firstPracticeTest = practiceTests[0];
  const firstExamTest = examTests[0];

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${skill.accent}`}>{skill.icon}</div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Kỹ năng</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{skill.title}</h2>
            <p className="mt-2 max-w-xl leading-7 text-slate-500">{skill.subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{examTests.length} bộ đề</span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <ModeButton to={`/app/tests/questions/${skill.type}`} icon={<FileText size={18} />} title="Học theo câu hỏi" disabled={!firstPracticeTest} />
        <ModeButton to={`/app/tests/sets/${skill.type}`} icon={<Timer size={18} />} title="Xem bộ đề" disabled={!firstExamTest} primary />
        <ModeButton to="/app/lessons" icon={<Lightbulb size={18} />} title="Mẹo học" />
      </div>

      {!practiceTests.length && !examTests.length && (
        <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          Chưa có bài luyện cho kỹ năng này. Tạo bài trong Admin - Nội dung - Bài luyện.
        </p>
      )}
    </div>
  );
}

function ModeButton({ to, icon, title, primary, disabled }: {
  to: string;
  icon: ReactNode;
  title: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <button className="flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 text-sm font-extrabold text-slate-400" type="button">
        {icon}{title}
      </button>
    );
  }

  return (
    <Link className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold ${primary ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-white text-brand-600 hover:bg-brand-50'}`} to={to}>
      {icon}{title}
    </Link>
  );
}

function InfoCard({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`rounded-[18px] border bg-white p-7 ${error ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-600'}`}>
      {children}
    </div>
  );
}

function normalizeSkill(skillName: string): SkillType | '' {
  const value = skillName.toUpperCase();
  if (value.includes('LISTENING')) return 'LISTENING';
  if (value.includes('SPEAKING')) return 'SPEAKING';
  if (value.includes('READING')) return 'READING';
  if (value.includes('WRITING')) return 'WRITING';
  if (value.includes('GRAMMAR') || value.includes('NGU PHAP')) return 'GRAMMAR';
  return '';
}

function skillLabel(skillName: string) {
  const skill = normalizeSkill(skillName);
  if (skill === 'LISTENING') return 'Nghe';
  if (skill === 'SPEAKING') return 'Nói';
  if (skill === 'READING') return 'Đọc hiểu';
  if (skill === 'WRITING') return 'Viết';
  if (skill === 'GRAMMAR') return 'Grammar';
  return 'Bộ đề';
}

function formatTestTitle(title: string, skillName: string) {
  const skill = skillLabel(skillName);
  const cleaned = (title || 'Bộ đề Aptis').trim();
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

function filterTestsByPart(tests: Test[], part: number) {
  const pattern = new RegExp(`(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i');
  return tests.filter((test) => pattern.test(`${test.title} ${test.description}`));
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

function getWritingClubTopics(groups: Array<{ test: Test; questions: Question[] }>) {
  return groups.flatMap(({ test, questions }) =>
    questions.flatMap((question) => {
      const template = parseQuestionTemplate(question.content);
      if (template?.template !== 'WRITING_CLUB_COLLECTION' || !Array.isArray(template.clubs)) return [];
      return template.clubs.map((club: { clubName?: string }, clubIndex: number) => ({
        testId: test.id,
        questionId: question.id,
        clubIndex,
        clubName: club.clubName || `Chu de ${clubIndex + 1}`
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
    'bg-amber-400 text-slate-950',
    'bg-emerald-700 text-white',
    'bg-amber-400 text-slate-950',
    'bg-red-500 text-white',
    'bg-emerald-700 text-white',
    'bg-red-500 text-white',
    'bg-emerald-700 text-white',
    'bg-cyan-500 text-slate-950',
    'bg-brand-600 text-white',
    'bg-brand-600 text-white',
    'bg-emerald-700 text-white',
    'bg-cyan-500 text-slate-950'
  ];
  return colors[index % colors.length];
}

function previewQuestion(content: string) {
  try {
    const data = JSON.parse(content);
    return data.prompt || data.title || data.topic || data.instructions || content;
  } catch {
    return content;
  }
}
