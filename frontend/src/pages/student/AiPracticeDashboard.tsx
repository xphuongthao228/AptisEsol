import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Lightbulb,
  Mic,
  PenLine,
  Play,
  Sparkles,
  SpellCheck
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Question, SkillType, Test } from '../../types';
type SkillKey = 'SPEAKING' | 'WRITING' | 'GRAMMAR';

const skills: Array<{ key: SkillKey; label: string; caption: string; icon: typeof Mic; tone: string }> = [
  { key: 'SPEAKING', label: 'Kỹ năng Speaking', caption: 'Nói tự tin hơn', icon: Mic, tone: 'text-rose-600 bg-rose-50' },
  { key: 'WRITING', label: 'Kỹ năng Writing', caption: 'Viết đủ ý, đúng form', icon: PenLine, tone: 'text-amber-600 bg-amber-50' },
  { key: 'GRAMMAR', label: 'Gộp đề', caption: 'Kết hợp các phần luyện', icon: SpellCheck, tone: 'text-violet-600 bg-violet-50' }
];

const parts = [
  { number: 1, title: 'Part 1', caption: 'Dạng cơ bản', tone: 'border-red-200 bg-red-50/70' },
  { number: 2, title: 'Part 2', caption: 'Dạng mở rộng', tone: 'border-brand-500 bg-brand-50' },
  { number: 3, title: 'Part 3', caption: 'Dạng nâng cao', tone: 'border-slate-200 bg-white' },
  { number: 4, title: 'Part 4', caption: 'Dạng tổng hợp', tone: 'border-slate-200 bg-white' }
];

const writingPartCaptions: Record<number, string> = {
  1: 'Form filling / trả lời ngắn',
  2: 'Trả lời tin nhắn',
  3: 'Bình luận mạng xã hội',
  4: 'Viết email'
};
const LINGO_LEVEL_KEY = 'aptis-lingo-level';

export function AiPracticeDashboard() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>('WRITING');
  const [selectedPart, setSelectedPart] = useState(2);
  const [targetLevel, setTargetLevel] = useState<'B1' | 'B2' | 'C1'>('B2');
  const selectedSkillLabel = skills.find((skill) => skill.key === selectedSkill)?.label ?? 'Writing';
  const [practiceTests, setPracticeTests] = useState<Array<{ test: Test; questions: Question[] }>>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{ testId: number; questionId: number; prompt: string; imageUrls: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPractice, setGeneratedPractice] = useState<{ title: string; answer: string; testId?: number | null } | null>(null);
  const [questionHistory, setQuestionHistory] = useState<Array<{ id: number; question: string; reply: string; createdAt: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const savedLevel = window.localStorage.getItem(LINGO_LEVEL_KEY);
    if (savedLevel === 'B1' || savedLevel === 'B2' || savedLevel === 'C1') {
      setTargetLevel(savedLevel);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LINGO_LEVEL_KEY, targetLevel);
  }, [targetLevel]);

  useEffect(() => {
    unwrap<Array<{ id: number; question: string; reply: string; createdAt: string }>>(api.get('/ai/lingo/history'))
      .then(setQuestionHistory)
      .catch(() => setQuestionHistory([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPracticeLoading(true);
    unwrap<Test[]>(api.get('/tests'))
      .then(async (tests) => {
        const matching = tests
          .filter((test) => test.mode !== 'EXAM')
          .filter((test) => normalizeSkill(test.skillName) === selectedSkill)
          .filter((test) => test.questionCount > 0);
        const groups = await Promise.all(matching.map(async (test) => ({
          test,
          questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
        })));
        if (!cancelled) setPracticeTests(groups);
      })
      .catch(() => {
        if (!cancelled) setPracticeTests([]);
      })
      .finally(() => {
        if (!cancelled) setPracticeLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedSkill]);

  useEffect(() => {
    setSelectedSource(null);
    setGeneratedPractice(null);
  }, [selectedSkill, selectedPart]);

  const selectedPartTests = useMemo(
    () => practiceTests.filter(({ test, questions }) =>
      testMatchesPart(test, selectedPart)
      || questions.some((question) => isQuestionInPart(question, selectedSkill, selectedPart))
      || (selectedSkill === 'WRITING' && questions.some((question) => hasWritingClubPart(question, selectedPart)))
    ),
    [practiceTests, selectedPart, selectedSkill]
  );
  const sourceItems = useMemo(
    () => selectedPartTests.flatMap(({ test, questions }) => buildSourceItems(test, questions, selectedSkill, selectedPart)),
    [selectedPartTests, selectedPart, selectedSkill]
  );

  return (
    <div className="ai-practice-page mx-auto max-w-[1480px] space-y-5 pb-10">
      <section className="ai-practice-hero relative overflow-hidden rounded-[18px] border border-red-100 bg-white p-5 shadow-soft sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-amber-100/60 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-600">
              <Sparkles size={15} /> Aptis Lingo AI
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-navy sm:text-3xl">
              Tạo đề luyện tập Aptis bằng <span className="text-brand-600">AI</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chọn kỹ năng và part bạn muốn luyện. AI sẽ gợi ý bài tập vừa sức, bám sát mục tiêu B1, B2 hoặc C1.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand-600 shadow-sm"><Bot size={20} /></span>
            <div>
              <p className="text-xs font-bold text-slate-500">Xin chào</p>
              <p className="max-w-[180px] truncate text-sm font-black text-navy">{user?.fullName ?? 'bạn học'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {skills.map(({ key, label, caption, icon: Icon, tone }) => {
          const active = selectedSkill === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => key === 'GRAMMAR' ? navigate('/app/combine-speaking') : setSelectedSkill(key)}
              className={`group flex min-h-[92px] items-center gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-brand-500 bg-white shadow-lift ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft'}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={21} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-navy">{label}</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">{caption}</span>
              </span>
              {active && <Check size={17} className="shrink-0 text-brand-600" />}
            </button>
          );
        })}
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-600">Chọn part để bắt đầu</p>
            <h2 className="mt-1 text-xl font-black text-navy">{selectedSkillLabel}</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-xs font-extrabold text-slate-500">Mục tiêu</span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(['B1', 'B2', 'C1'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTargetLevel(level)}
                  className={`h-8 min-w-12 rounded-md px-3 text-xs font-black transition ${targetLevel === level ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-brand-700'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {parts.map((part) => {
            const active = selectedPart === part.number;
            return (
              <button
                key={part.number}
                type="button"
                onClick={() => setSelectedPart(part.number)}
                className={`relative flex min-h-[112px] flex-col justify-between rounded-xl border p-4 text-left transition ${active ? 'border-brand-600 bg-brand-600 text-white shadow-lift' : `${part.tone} text-navy hover:border-brand-300`}`}
              >
                <span className="flex items-center justify-between">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${active ? 'bg-white/15' : 'bg-white text-brand-700'}`}>0{part.number}</span>
                  {active && <Check size={17} />}
                </span>
                <span>
                  <span className="block text-sm font-black">{part.title}</span>
                  <span className={`mt-1 block text-xs font-medium ${active ? 'text-white/75' : 'text-slate-500'}`}>
                    {selectedSkill === 'WRITING' ? writingPartCaptions[part.number] : part.caption}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-600">Đề đã import</p>
            <h2 className="mt-1 text-xl font-black text-navy">{selectedSkillLabel} Part {selectedPart}</h2>
          </div>
          <span className="text-sm font-bold text-slate-500">
            {practiceLoading ? 'Đang tải...' : `${sourceItems.length} đề`}
          </span>
        </div>
        {sourceItems.length ? (
          <div className="mt-5 max-h-[520px] overflow-y-auto pr-2">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sourceItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSource({ testId: item.testId, questionId: item.questionId, prompt: item.sourcePrompt, imageUrls: item.imageUrls })}
                className={`group w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 ${selectedSource?.prompt === item.sourcePrompt ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-brand-100 bg-sky-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-brand-600"><FileText size={19} /></span>
                  <ArrowRight size={18} className="mt-1 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" />
                </div>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{item.topic}</p>
                <div className="mt-2 text-base font-normal leading-6 text-navy" style={{ fontWeight: 400 }}>
                  {formatPromptLines(item.prompt).map((line, lineIndex) => (
                    <span key={`${item.id}-${lineIndex}`} className="block">
                      {line}
                    </span>
                  ))}
                </div>
                <span className="mt-4 block text-sm font-extrabold text-brand-700">Bắt đầu luyện</span>
              </button>
            ))}
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Chưa có đề import cho kỹ năng và Part này.
          </p>
        )}
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
          <button
            type="button"
            disabled={!selectedSource || generating}
            onClick={async () => {
              if (!selectedSource) return;
              setGenerating(true);
              try {
                const response = await unwrap<{ testId?: number | null; title: string; generatedAnswer?: string }>(api.post('/ai/practice/generate', {
                  sourceTestId: selectedSource.testId,
                  sourceQuestionId: selectedSource.questionId,
                  sourcePrompt: selectedSource.prompt,
                  imageUrls: selectedSource.imageUrls.map(toAbsoluteImageUrl),
                  part: selectedPart,
                  level: targetLevel
                }));
                setGeneratedPractice({
                  title: response.title,
                  answer: response.generatedAnswer ?? '',
                  testId: response.testId
                });
              } catch (error) {
                window.alert(error instanceof Error ? error.message : 'Không thể tạo đề bằng AI.');
              } finally {
                setGenerating(false);
              }
            }}
            className="btn-primary h-12 flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={17} /> {generating ? 'Đang tạo đề...' : 'Tạo đề bằng AI'}
          </button>
          <Link to="/app/tests/parts" className="btn-secondary h-12 sm:px-5"><Play size={17} /> Luyện đề có sẵn</Link>
        </div>
      </section>

      <section className="rounded-[18px] border border-violet-200 bg-violet-50/40 p-5 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Clock3 size={20} /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-violet-700">Lingo AI</p>
              <h2 className="mt-1 text-xl font-black text-navy">Các câu hỏi đã hỏi</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">{questionHistory.length} lượt hỏi đã lưu</p>
            </div>
          </div>
          <button type="button" onClick={() => setHistoryOpen((value) => !value)} className="btn-secondary h-10 px-4 text-sm">
            {historyOpen ? 'Thu gọn' : 'Xem lại câu hỏi'}
          </button>
        </div>
        {historyOpen && (
          <div className="mt-5 space-y-3">
            {questionHistory.length ? questionHistory.map((item) => (
              <article key={item.id} className="rounded-xl border border-violet-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700 text-xs font-black">H</span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm font-extrabold leading-6 text-navy">{item.question}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.reply}</p>
                    <time className="mt-3 block text-xs font-semibold text-slate-400">
                      {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}
                    </time>
                  </div>
                </div>
              </article>
            )) : (
              <p className="rounded-xl bg-white p-4 text-sm font-semibold text-slate-500">Bạn chưa hỏi Lingo câu nào.</p>
            )}
          </div>
        )}
      </section>

      {generatedPractice && (
        <section className="rounded-[18px] border border-emerald-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-600">Câu trả lời từ AI</p>
              <h2 className="mt-1 text-xl font-black text-navy">{generatedPractice.title}</h2>
            </div>
            {generatedPractice.testId ? (
              <Link
                to={`/app/tests/${generatedPractice.testId}`}
                state={{ returnTo: '/app/ai-practice' }}
                className="btn-secondary h-10 px-4 text-sm"
              >
                Mở bài luyện <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-emerald-950">
              {generatedPractice.answer || 'AI chưa trả về nội dung. Bạn hãy thử lại.'}
            </p>
          </div>
        </section>
      )}

      <aside className="rounded-[18px] border border-red-100 bg-[linear-gradient(145deg,#fff7e8,#fff)] p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2 text-sm font-black text-navy"><Lightbulb size={18} className="text-amber-500" /> Gợi ý cho bạn</div>
          <p className="mt-4 text-sm font-bold leading-6 text-slate-700">Bạn đang luyện {selectedSkillLabel.toLowerCase()} Part {selectedPart}. Hãy dành 15 phút để hoàn thành một lượt tập trung.</p>
          <div className="mt-5 space-y-3">
            {['Đọc kỹ yêu cầu trước khi trả lời', 'Ghi lại từ vựng mới sau mỗi bài', 'Xem nhận xét AI sau khi nộp bài'].map((tip) => (
              <div key={tip} className="flex items-start gap-2 text-xs font-semibold text-slate-600"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />{tip}</div>
            ))}
          </div>
          <Link to="/app/lessons" className="mt-6 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-700">Xem mẹo học <ChevronRight size={16} /></Link>
      </aside>
    </div>
  );
}

function normalizeSkill(value: string): SkillType | '' {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
  if (normalized.includes('LISTENING') || normalized.includes('NGHE')) return 'LISTENING';
  if (normalized.includes('SPEAKING') || normalized.includes('NOI')) return 'SPEAKING';
  if (normalized.includes('READING') || normalized.includes('DOC')) return 'READING';
  if (normalized.includes('WRITING') || normalized.includes('VIET')) return 'WRITING';
  if (normalized.includes('GRAMMAR') || normalized.includes('NGU PHAP')) return 'GRAMMAR';
  return '';
}

function isQuestionInPart(question: Question, skill: SkillType, part: number) {
  const raw = `${question.topic ?? ''} ${question.content ?? ''} ${question.explanation ?? ''}`.toLowerCase();
  const template = parseTemplate(question.content);
  const templatePart = String(template?.part ?? '').replace(/\D+/g, '');
  if (templatePart && Number(templatePart) === part) return true;
  if (skill === 'READING') {
    const name = String(template?.template ?? '').toUpperCase();
    if (part === 1 && name === 'READING_GAP_FILL') return true;
    if ((part === 2 || part === 3) && name === 'READING_SENTENCE_ORDER') return part === 3 ? raw.includes('part 3') : !raw.includes('part 3');
    if (part === 4 && name === 'READING_FORUM_MATCH') return true;
    if (part === 5 && name === 'READING_HEADING_MATCH') return true;
  }
  return new RegExp(`\\b(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i').test(raw);
}

function testMatchesPart(test: Test, part: number) {
  const value = `${test.title ?? ''} ${test.description ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return new RegExp(`\\b(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i').test(value);
}

function getQuestionPrompt(question: Question) {
  const topic = question.topic?.trim();
  if (topic) return topic;
  try {
    const data = JSON.parse(question.content);
    if (typeof data === 'object' && data) {
      const value = data.prompt ?? data.question ?? data.title ?? data.topic ?? data.content;
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  } catch {
    // Imported plain-text questions are displayed as-is.
  }
  return question.content?.trim() || 'Đề luyện đã import';
}

function formatPromptLines(prompt: string) {
  return prompt
    .replace(/\s*(?=\d+\.\s)/g, '\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildSourceItems(test: Test, questions: Question[], skill: SkillKey, part: number) {
  return questions.flatMap((question) => {
    const template = parseTemplate(question.content);
    if (skill === 'WRITING' && template?.template === 'WRITING_CLUB_COLLECTION' && Array.isArray(template.clubs)) {
      return template.clubs.flatMap((club: any, clubIndex: number) => {
        const topic = String(club.clubName ?? `Chủ đề ${clubIndex + 1}`).trim();
        const partData = Array.isArray(club.parts) ? club.parts[part - 1] : null;
        const prompts = Array.isArray(partData?.prompts) ? partData.prompts : [];
        if ((part === 3 || part === 4) && prompts.length > 1) {
          return [{
            id: `${test.id}-${question.id}-${clubIndex}-${part}`,
            testId: test.id,
            questionId: question.id,
            topic,
            prompt: prompts.map((prompt: string, index: number) => `${index + 1}. ${prompt}`).join('\n'),
            imageUrls: [],
            sourcePrompt: [
              `Topic: ${topic}`,
              `Writing Part ${part}`,
              partData?.instructions ? `Instructions: ${partData.instructions}` : '',
              partData?.mainText ? `Main text: ${partData.mainText}` : '',
              'Questions:',
              ...prompts.map((prompt: string, index: number) => `${index + 1}. ${prompt}`)
            ].filter(Boolean).join('\n')
          }];
        }

        return prompts.map((prompt: string, promptIndex: number) => ({
          id: `${test.id}-${question.id}-${clubIndex}-${part}-${promptIndex}`,
          testId: test.id,
          questionId: question.id,
          topic,
          prompt,
          imageUrls: [],
          sourcePrompt: [
            `Topic: ${topic}`,
            `Writing Part ${part}`,
            partData?.instructions ? `Instructions: ${partData.instructions}` : '',
            partData?.mainText ? `Main text: ${partData.mainText}` : '',
            `Question: ${prompt}`
          ].filter(Boolean).join('\n')
        }));
      });
    }

    if (!isQuestionInPart(question, skill, part)) return [];
    const topic = question.topic?.trim() || test.title;
    const prompt = skill === 'SPEAKING'
      ? (getSpeakingPrompt(template) || getQuestionPrompt(question))
      : getQuestionPrompt(question);
    const imageUrls = skill === 'SPEAKING' ? extractSpeakingImages(template, part) : [];
    return [{
      id: `${test.id}-${question.id}`,
      testId: test.id,
      questionId: question.id,
      topic,
      prompt,
      imageUrls,
      sourcePrompt: [`Topic: ${topic}`, `Part ${part}`, `Question: ${prompt}`].join('\n')
    }];
  });
}

function extractSpeakingImages(template: any, part: number): string[] {
  if (!template || (part !== 2 && part !== 3)) return [];
  const values: string[] = [];
  const imageKey = /^(image|imageurl|image_url|urlpic|urlpicurl|picture|pictureurl|photo)/i;
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      const text = value.trim();
      if (text && (/^https?:\/\//i.test(text) || /^\/images\//i.test(text) || /speaking\/part[23]\//i.test(text))) {
        const normalized = normalizeSpeakingImageUrl(text, part);
        if (normalized && !values.includes(normalized)) values.push(normalized);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => {
        if (imageKey.test(key)) visit(child);
        else if (typeof child === 'object') visit(child);
      });
    }
  };
  visit(template);
  return values.slice(0, part === 3 ? 2 : 1);
}

function getSpeakingPrompt(template: any) {
  if (!template) return '';
  const questionRows: unknown[] = Array.isArray(template.questions) ? template.questions : [template];
  const questionTexts: string[] = questionRows.flatMap((row: unknown) => extractQuestionTexts(row));
  if (questionTexts.length) {
    return questionTexts.map((text, index) => `${index + 1}. ${text}`).join('\n');
  }
  return extractQuestionTexts(template).join('\n');
}

function extractQuestionTexts(value: unknown): string[] {
  const texts: string[] = [];
  const add = (item: unknown) => {
    if (typeof item === 'string') {
      const cleaned = item.trim();
      if (cleaned && cleaned !== '[object Object]' && !texts.includes(cleaned)) texts.push(cleaned);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(add);
      return;
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      [
        row.question,
        row.prompt,
        row.text,
        row.content,
        row.question1,
        row.question2,
        row.question3,
        row.question4
      ].forEach(add);
    }
  };
  add(value);
  return texts;
}

function normalizeSpeakingImageUrl(value: string, part: number) {
  if (/^https?:\/\//i.test(value) || value.startsWith('/images/')) return value;
  const match = value.match(/(?:^|\/)(speaking\/part[23]\/[^?#]+)/i);
  return match ? `/images/${match[1]}` : (part === 2 || part === 3 ? value : '');
}

function toAbsoluteImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${window.location.origin}${value.startsWith('/') ? value : `/${value}`}`;
}

function hasWritingClubPart(question: Question, part: number) {
  const template = parseTemplate(question.content);
  if (template?.template !== 'WRITING_CLUB_COLLECTION' || !Array.isArray(template.clubs)) return false;
  return template.clubs.some((club: any) => {
    const partData = Array.isArray(club.parts) ? club.parts[part - 1] : null;
    return Array.isArray(partData?.prompts) && partData.prompts.some((prompt: unknown) => String(prompt).trim());
  });
}

function parseTemplate(content: string) {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed as { template?: string; part?: string | number; clubs?: unknown[] } : null;
  } catch {
    return null;
  }
}
