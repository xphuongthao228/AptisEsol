import { ArrowRight, CheckCircle2, Copy, Loader2, Mic, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Question, Test } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

type SpeakingPart4Topic = {
  id: string;
  testId: number;
  testTitle: string;
  title: string;
  questions: string[];
};

type Part4SampleResponse = {
  prompt: string;
  sampleAnswer: string;
};

const MAX_SELECTED_TOPICS = 5;
const MAX_TOPIC_TITLE_CHARS = 90;
const MAX_TOPIC_QUESTION_CHARS = 120;

export function CombineSpeaking() {
  const { data: tests, loading: testsLoading, error: testsError } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const speakingTests = useMemo(() => (tests ?? [])
    .filter((test) => normalizeSkill(test.skillName) === 'SPEAKING')
    .filter((test) => (test.questionCount ?? 0) > 0)
    .sort((left, right) => left.title.localeCompare(right.title, 'vi', { numeric: true, sensitivity: 'base' })), [tests]);
  const testIds = speakingTests.map((test) => test.id).join(',');
  const { data: topics, loading: topicsLoading, error: topicsError } = useApi<SpeakingPart4Topic[]>(
    async () => {
      if (!speakingTests.length) return [];
      const groups = await Promise.all(speakingTests.map(async (test) => {
        const questions = await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`));
        return extractSpeakingPart4Topics(test, questions);
      }));
      return groups.flat();
    },
    [testIds]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<Part4SampleResponse | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedTopics = useMemo(() => (topics ?? []).filter((topic) => selectedIds.includes(topic.id)), [selectedIds, topics]);
  const loading = testsLoading || topicsLoading;
  const error = testsError || topicsError;

  function toggleTopic(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_SELECTED_TOPICS) {
        toast.error(`Chọn tối đa ${MAX_SELECTED_TOPICS} đề để tiết kiệm token.`);
        return current;
      }
      return [...current, id];
    });
  }

  async function generateSample() {
    if (!selectedTopics.length) {
      toast.error('Chọn ít nhất một đề Speaking Part 4.');
      return;
    }

    setGenerating(true);
    setResult(null);
    try {
      const payload = selectedTopics.map((topic) => formatCompactTopicPrompt(topic));
      const response = await unwrap<Part4SampleResponse>(api.post('/ai/speaking/part4-sample', { topics: payload }));
      setResult(response);
      toast.success('Đã tạo bài nói mẫu.');
    } catch (error) {
      const prompt = buildLocalPrompt(selectedTopics);
      setResult({ prompt, sampleAnswer: '' });
      toast.error(error instanceof Error ? error.message : 'Chưa tạo được bài bằng AI. Bạn có thể copy prompt để dùng tạm.');
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã copy ${label}.`);
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-7">
      <section className="rounded-[24px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-extrabold text-blue-100">
          <Sparkles size={18} />
          Gộp đề Speaking
        </p>
        <h1 className="mt-5 text-4xl font-extrabold">Tạo bài nói Part 4 từ nhiều đề</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-300">
          Chọn các đề Speaking Part 4 muốn ôn, hệ thống sẽ gửi prompt cho AI để tạo một bài nói mẫu khoảng 150 từ.
        </p>
      </section>

      {loading && (
        <section className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft" role="status">
          <div className="flex items-center gap-3 font-extrabold text-brand-700"><Loader2 className="animate-spin" /> Đang tải đề Speaking Part 4...</div>
        </section>
      )}

      {error && <section className="rounded-[18px] border border-red-200 bg-white p-6 text-red-600">{error}</section>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            {(topics ?? []).map((topic) => {
              const active = selectedIds.includes(topic.id);
              return (
                <label key={topic.id} className={`block cursor-pointer rounded-[18px] border bg-white p-5 shadow-soft transition ${active ? 'border-brand-500 ring-2 ring-brand-100' : 'border-brand-100 hover:border-brand-300'}`}>
                  <div className="flex gap-4">
                    <input type="checkbox" checked={active} onChange={() => toggleTopic(topic.id)} className="mt-1 h-5 w-5 accent-brand-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{topic.testTitle}</p>
                      <h2 className="mt-1 text-xl font-extrabold text-navy">{topic.title}</h2>
                      {topic.questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {topic.questions.map((question) => <p key={question} className="text-sm font-semibold leading-6 text-slate-600">{question}</p>)}
                        </div>
                      )}
                    </div>
                    {active && <CheckCircle2 className="shrink-0 text-brand-600" />}
                  </div>
                </label>
              );
            })}

            {(topics ?? []).length === 0 && (
              <section className="rounded-[18px] border border-brand-100 bg-white p-7 text-slate-700">
                Chưa tìm thấy đề Speaking Part 4 trong dữ liệu đã import.
              </section>
            )}
          </section>

          <aside className="h-fit rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Mic /></div>
              <div>
                <p className="text-sm font-extrabold text-slate-500">Đã chọn</p>
                <p className="text-2xl font-black text-navy">{selectedTopics.length}/{MAX_SELECTED_TOPICS} đề</p>
              </div>
            </div>
            <button type="button" disabled={generating || selectedTopics.length === 0} onClick={generateSample} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {generating ? 'Đang tạo...' : 'Tạo bài nói'} <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      )}

      {result && (
        <section className="grid gap-5 lg:grid-cols-2">
          <ResultPanel title="Prompt gửi AI" text={result.prompt} onCopy={() => copyText(result.prompt, 'prompt')} />
          <ResultPanel title="Bài nói mẫu khoảng 150 từ" text={result.sampleAnswer || 'AI chưa trả về bài nói. Bạn có thể copy prompt bên trái để tạo lại.'} onCopy={() => copyText(result.sampleAnswer || result.prompt, result.sampleAnswer ? 'bài nói' : 'prompt')} />
        </section>
      )}
    </div>
  );
}

function ResultPanel({ title, text, onCopy }: { title: string; text: string; onCopy: () => void }) {
  return (
    <article className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-navy">{title}</h2>
        <button type="button" onClick={onCopy} className="grid h-10 w-10 place-items-center rounded-xl border border-brand-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700" title="Copy">
          <Copy size={18} />
        </button>
      </div>
      <p className="mt-4 whitespace-pre-line rounded-2xl bg-sky-50 p-5 text-sm font-semibold leading-7 text-slate-700">{text}</p>
    </article>
  );
}

function extractSpeakingPart4Topics(test: Test, questions: Question[]) {
  return questions.flatMap((question) => {
    const rows = parseRows(question.content);
    const candidates = rows.length ? rows : [{ topic: question.topic, prompt: question.content, questions: [] }];
    return candidates
      .filter((row) => getPart(row) === '4' || String(row.template ?? '').toUpperCase().includes('PART4'))
      .map((row, index) => {
        const title = repairMojibake(String(row.title ?? row.topic ?? row.prompt ?? question.topic ?? `Speaking Part 4 - ${test.title}`)).trim();
        const topicQuestions = stringArray(row.questions).map(repairMojibake).filter(Boolean);
        return {
          id: `${test.id}-${question.id}-${index}`,
          testId: test.id,
          testTitle: repairMojibake(test.title),
          title: title || `Speaking Part 4 - ${repairMojibake(test.title)}`,
          questions: topicQuestions
        };
      });
  });
}

function parseRows(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.filter(isObject);
    if (isObject(parsed)) {
      if (Array.isArray(parsed.parts)) return parsed.parts.filter(isObject);
      if (Array.isArray(parsed.questions)) return [parsed, ...parsed.questions.filter(isObject)];
      return [parsed];
    }
  } catch {
    return [];
  }
  return [];
}

function getPart(row: Record<string, unknown>) {
  const value = String(row.part ?? row.partNumber ?? row.section ?? row.partLabel ?? '').trim();
  const match = value.match(/\d+/);
  return match?.[0] ?? '';
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n|\|/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeSkill(skillName: string) {
  const value = removeVietnameseMarks(skillName).toUpperCase();
  return value.includes('SPEAKING') || value.includes('NOI') ? 'SPEAKING' : '';
}

function removeVietnameseMarks(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function compactText(value: string, maxLength: number) {
  const cleaned = repairMojibake(value).replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength).trim()}...` : cleaned;
}

function formatCompactTopicPrompt(topic: SpeakingPart4Topic) {
  const title = compactText(topic.title, MAX_TOPIC_TITLE_CHARS);
  const questions = topic.questions
    .slice(0, 2)
    .map((question) => compactText(question, MAX_TOPIC_QUESTION_CHARS))
    .filter(Boolean);
  return [title, ...questions.map((question) => `Q: ${question}`)].filter(Boolean).join(' | ');
}

function buildLocalPrompt(topics: SpeakingPart4Topic[]) {
  return `Write one Aptis Speaking Part 4 answer, about 150 words, B1-B2 spoken English.\nTopics:\n${topics.slice(0, MAX_SELECTED_TOPICS).map((topic) => `- ${formatCompactTopicPrompt(topic)}`).join('\n')}\nRules: one coherent answer, clear opinion, reasons, one personal example, no headings.`;
}
