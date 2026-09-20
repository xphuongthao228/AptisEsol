import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Eye, FileCheck, History, RotateCcw, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { MockTestResult, Submission } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

type HistoryItem =
  | { kind: 'submission'; value: Submission }
  | { kind: 'mock'; value: MockTestResult };

type SavedReviewGroup = {
  title: string;
  rows: { question: string; userAnswer: string; correctAnswer: string; correct: boolean }[];
};

export function ExamHistory() {
  const [searchParams] = useSearchParams();
  const { data, loading, error } = useApi<{ submissions: Submission[]; mockResults: MockTestResult[] }>(async () => {
    const [submissions, mockResults] = await Promise.all([
      unwrap<Submission[]>(api.get('/submissions/my-results')),
      unwrap<MockTestResult[]>(api.get('/mock-tests/results/my'))
    ]);
    return { submissions, mockResults };
  }, []);
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(() => searchParams.get('result'));

  const historyItems = useMemo<HistoryItem[]>(() => [
    ...(data?.submissions ?? []).map((value) => ({ kind: 'submission' as const, value })),
    ...(data?.mockResults ?? []).map((value) => ({ kind: 'mock' as const, value }))
  ].sort((a, b) => new Date(b.value.createdAt).getTime() - new Date(a.value.createdAt).getTime()), [data]);
  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return historyItems.filter((item) => {
      if (!keyword) return true;
      const title = item.kind === 'submission' ? item.value.testTitle : item.value.title;
      const skill = item.kind === 'submission' ? item.value.skillName : item.value.skill;
      return `${title} ${skill}`.toLowerCase().includes(keyword);
    });
  }, [historyItems, query]);

  const selected = useMemo(() => {
    if (!filteredItems.length) return null;
    return filteredItems.find((item) => historyKey(item) === selectedKey) ?? filteredItems[0];
  }, [filteredItems, selectedKey]);

  if (loading) {
    return <InfoCard>Đang tải lịch sử làm bài...</InfoCard>;
  }

  if (error) {
    return <InfoCard error>{error}</InfoCard>;
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">Lịch sử</p>
          <h1 className="mt-4 text-4xl font-extrabold text-navy">Bài đã thi và điểm số</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
            Xem lại các bài bạn đã nộp, điểm đạt được và đáp án chi tiết theo từng câu.
          </p>
        </div>

        <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 text-slate-500 shadow-soft md:max-w-[420px]">
          <Search size={20} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên bài thi hoặc kỹ năng..."
          />
        </label>
      </section>

      {filteredItems.length ? (
        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const title = item.kind === 'submission' ? item.value.testTitle : item.value.title;
              const skill = item.kind === 'submission' ? item.value.skillName : item.value.skill;
              const score = item.kind === 'submission' ? item.value.totalScore : item.value.score;
              const maxScore = item.kind === 'submission' ? item.value.maxScore : item.value.maxScore;
              return (
              <button
                key={historyKey(item)}
                type="button"
                onClick={() => setSelectedKey(historyKey(item))}
                className={`w-full rounded-[8px] border bg-white p-4 text-left shadow-soft transition hover:border-brand-300 ${
                  selected && historyKey(selected) === historyKey(item) ? 'border-brand-500 ring-4 ring-brand-100' : 'border-brand-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-brand-700">{repairMojibake(skill || 'Aptis')}</p>
                    <h2 className="mt-1 line-clamp-2 text-base font-extrabold text-navy">{repairMojibake(title)}</h2>
                  </div>
                  <ScoreValue score={score} maxScore={maxScore} />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Clock3 size={16} />
                  {formatDateTime(item.value.createdAt)}
                </div>
              </button>
            );})}
          </div>

          {selected?.kind === 'submission' && <SubmissionDetail submission={selected.value} />}
          {selected?.kind === 'mock' && <MockResultDetail result={selected.value} />}
        </section>
      ) : (
        <section className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <History />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-navy">Chưa có bài đã nộp</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-600">
            Sau khi nộp bài thi hoặc bài luyện tập, kết quả sẽ xuất hiện tại đây.
          </p>
          <Link to="/app/tests/parts" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-white">
            Làm bài ngay
            <ArrowRight size={17} />
          </Link>
        </section>
      )}
    </div>
  );
}

function SubmissionDetail({ submission }: { submission: Submission }) {
  const answers = submission.answers ?? [];

  return (
    <div className="rounded-[8px] border border-brand-100 bg-white p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-4 border-b border-brand-100 pb-5 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-extrabold uppercase text-brand-700">{repairMojibake(submission.skillName || 'Aptis')}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-navy">{repairMojibake(submission.testTitle)}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500">
            <Clock3 size={16} />
            {formatDateTime(submission.createdAt)}
          </p>
        </div>
        <div className="rounded-[8px] bg-sky-50 p-4 text-right">
          <p className="text-sm font-bold text-slate-600">Điểm số</p>
          <p className="mt-1 text-3xl font-extrabold text-brand-700">
            {submission.totalScore}/{submission.maxScore || 0}
          </p>
          <p className="text-sm font-bold text-slate-500">{scorePercent(submission)}%</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {answers.length ? answers.map((answer) => (
          <article key={answer.id} className="rounded-[8px] border border-slate-200 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-extrabold text-slate-500">Câu {answer.questionNumber}</p>
                <h3 className="mt-1 text-base font-extrabold text-navy">{questionTitle(answer.questionContent, answer.topic)}</h3>
              </div>
              <span className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-extrabold ${
                answer.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {answer.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                {answer.score} điểm
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <AnswerBox label="Câu trả lời của bạn" value={answer.selectedAnswer || answer.textAnswer || 'Chưa trả lời'} />
              <AnswerBox label="Đáp án đúng" value={answer.correctAnswer || 'Câu tự luận, hệ thống lưu nội dung để giáo viên/AI chấm.'} />
            </div>
            {answer.explanation && (
              <p className="mt-3 rounded-[8px] bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {repairMojibake(answer.explanation)}
              </p>
            )}
          </article>
        )) : (
          <div className="rounded-[8px] border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
            Bài này chưa có chi tiết đáp án để hiển thị.
          </div>
        )}
      </div>

      <Link to={`/app/tests/${submission.testId}`} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50">
        <RotateCcw size={17} />
        Làm lại bài này
      </Link>
    </div>
  );
}

function MockResultDetail({ result }: { result: MockTestResult }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const details = parseResultJson(result.resultJson);
  const summaryText = typeof details.summary === 'string' ? details.summary : '';
  const objectiveSummary = isRecord(details.summary) ? details.summary : null;
  const skillRows = ['listening', 'reading', 'speaking', 'writing', 'grammar']
    .map((key) => ({ key, value: isRecord(details[key]) ? details[key] as Record<string, unknown> : null }))
    .filter((row) => row.value);
  const reviewGroups = parseReviewGroups(details.reviewGroups);

  if (reviewOpen) {
    return <SavedAnswerReview groups={reviewGroups} onBack={() => setReviewOpen(false)} />;
  }

  return (
    <div className="rounded-[8px] border border-brand-100 bg-white p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-4 border-b border-brand-100 pb-5 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-extrabold uppercase text-brand-700">Thi thử · {repairMojibake(result.skill)}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-navy">{repairMojibake(result.title)}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500"><Clock3 size={16} />{formatDateTime(result.createdAt)}</p>
        </div>
        <div className="rounded-[8px] bg-sky-50 p-4 text-right">
          <p className="text-sm font-bold text-slate-600">Điểm số</p>
          <p className="mt-1 text-3xl font-extrabold text-brand-700">{result.score}/{result.maxScore}</p>
          {result.cefrLevel && <p className="text-sm font-extrabold text-emerald-700">CEFR {result.cefrLevel}</p>}
        </div>
      </div>

      {summaryText && <p className="mt-5 rounded-[8px] bg-slate-50 p-4 text-sm leading-7 text-slate-700">{repairMojibake(summaryText)}</p>}
      {objectiveSummary && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ResultMetric label="Số câu đúng" value={`${numberValue(objectiveSummary.correct)}/${numberValue(objectiveSummary.total)}`} />
          <ResultMetric label="Điểm quy đổi" value={`${result.score}/${result.maxScore}`} />
        </div>
      )}
      {skillRows.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-[8px] border border-slate-200">
          {skillRows.map(({ key, value }) => {
            const nestedSummary = value && isRecord(value.summary) ? value.summary : value;
            const score = numberValue(value?.overallScore ?? nestedSummary?.score);
            return <div key={key} className="flex items-center justify-between border-b border-slate-200 px-4 py-3 last:border-b-0"><span className="font-extrabold capitalize text-navy">{key}</span><span className="font-extrabold text-brand-700">{score}/50</span></div>;
          })}
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => setReviewOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-white transition hover:bg-brand-700">
          <Eye size={17} />Xem đáp án
        </button>
        <Link to={mockTestRetryPath(result)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-200 px-4 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50">
          <RotateCcw size={17} />Làm lại đề này
        </Link>
      </div>
    </div>
  );
}

function SavedAnswerReview({ groups, onBack }: { groups: SavedReviewGroup[]; onBack: () => void }) {
  return (
    <div className="rounded-[8px] border border-brand-100 bg-white p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-3 border-b border-brand-100 pb-5 sm:flex-row sm:items-center">
        <div><p className="text-sm font-extrabold uppercase text-brand-700">Xem lại đáp án</p><h2 className="mt-1 text-2xl font-extrabold text-navy">Đối chiếu từng câu</h2></div>
        <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-extrabold text-slate-700"><ArrowLeft size={17} />Quay lại kết quả</button>
      </div>
      <div className="mt-5 space-y-5">
        {groups.length === 0 && (
          <div className="rounded-[8px] border border-dashed border-amber-300 bg-amber-50 p-6 text-center">
            <p className="font-extrabold text-amber-900">Bài làm cũ chưa lưu chi tiết đáp án</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">Các bài hoàn thành từ phiên bản mới sẽ hiển thị đầy đủ câu trả lời của bạn và đáp án đúng tại đây.</p>
          </div>
        )}
        {groups.map((group) => <section key={group.title}><h3 className="mb-3 text-base font-extrabold text-navy">{group.title}</h3><div className="space-y-2">{group.rows.map((row, index) => (
          <div key={`${group.title}-${index}`} className="grid gap-3 rounded-[8px] bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(150px,0.45fr)_minmax(150px,0.45fr)]">
            <p className="text-sm font-bold leading-6 text-navy">{index + 1}. {row.question}</p>
            <p className="text-sm text-slate-600">Bạn chọn: <strong className={row.correct ? 'text-emerald-700' : 'text-rose-700'}>{row.userAnswer}</strong></p>
            <p className="text-sm text-slate-600">Đáp án: <strong className="text-emerald-700">{row.correctAnswer}</strong></p>
          </div>
        ))}</div></section>)}
      </div>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[8px] bg-sky-50 p-4"><p className="text-xs font-extrabold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-navy">{value}</p></div>;
}

function AnswerBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-sky-50 p-3">
      <p className="text-xs font-extrabold uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-navy">{repairMojibake(value)}</p>
    </div>
  );
}

function ScoreValue({ score, maxScore }: { score: number; maxScore: number }) {
  return (
    <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-brand-600 px-3 text-sm font-extrabold text-white">
      <FileCheck size={16} />
      {score}/{maxScore || 0}
    </span>
  );
}

function historyKey(item: HistoryItem) {
  return `${item.kind}:${item.value.id}`;
}

function parseResultJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseReviewGroups(value: unknown): SavedReviewGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((group) => {
    if (!isRecord(group) || typeof group.title !== 'string' || !Array.isArray(group.rows)) return [];
    const rows = group.rows.flatMap((row) => {
      if (!isRecord(row) || typeof row.question !== 'string') return [];
      return [{
        question: row.question,
        userAnswer: typeof row.userAnswer === 'string' ? row.userAnswer : 'Chưa chọn',
        correctAnswer: typeof row.correctAnswer === 'string' ? row.correctAnswer : 'Không có đáp án',
        correct: row.correct === true
      }];
    });
    return rows.length ? [{ title: group.title, rows }] : [];
  });
}

function mockTestRetryPath(result: MockTestResult) {
  const skill = result.skill.toUpperCase();
  const screens: Record<string, string> = {
    FULL: 'fullStart',
    LISTENING: 'listeningStart',
    READING: 'readingStart',
    WRITING: 'writingInstructions',
    SPEAKING: 'start',
    GRAMMAR: 'grammarStart',
    GRAMMAR_VOCABULARY: 'grammarStart'
  };
  const params = new URLSearchParams({ mockId: result.mockTestId, skill, screen: screens[skill] ?? 'select' });
  if (skill === 'FULL') params.set('full', '1');
  return `/app/mock-tests?${params.toString()}`;
}

function InfoCard({ children, error = false }: { children: string; error?: boolean }) {
  return (
    <div className={`rounded-[8px] border bg-white p-7 shadow-soft ${error ? 'border-red-200 text-red-600' : 'border-brand-100 text-slate-600'}`}>
      {children}
    </div>
  );
}

function scorePercent(submission: Submission) {
  if (!submission.maxScore) return 0;
  return Math.round((submission.totalScore * 100) / submission.maxScore);
}

function formatDateTime(value: string) {
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

function questionTitle(content: string, topic?: string | null) {
  if (topic?.trim()) return repairMojibake(topic.trim());
  const parsed = parseQuestionSummary(content);
  return repairMojibake(parsed || 'Câu hỏi');
}

function parseQuestionSummary(content: string) {
  try {
    const data = JSON.parse(content);
    const candidates = [data.topic, data.title, data.instructions, data.prompt, data.question, data.content];
    const value = candidates.find((item) => typeof item === 'string' && item.trim());
    if (value) return value.trim();
  } catch {
    // Plain text questions fall through to the compact text preview below.
  }

  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/[{}[\]",:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}
