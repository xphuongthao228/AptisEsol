import { ArrowRight, CheckCircle2, Clock3, FileCheck, History, RotateCcw, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Submission } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

export function ExamHistory() {
  const { data, loading, error } = useApi<Submission[]>(() => unwrap(api.get('/submissions/my-results')), []);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const submissions = data ?? [];
  const filteredSubmissions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      if (!keyword) return true;
      return `${submission.testTitle} ${submission.skillName}`.toLowerCase().includes(keyword);
    });
  }, [query, submissions]);

  const selected = useMemo(() => {
    if (!filteredSubmissions.length) return null;
    return filteredSubmissions.find((submission) => submission.id === selectedId) ?? filteredSubmissions[0];
  }, [filteredSubmissions, selectedId]);

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

      {filteredSubmissions.length ? (
        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-3">
            {filteredSubmissions.map((submission) => (
              <button
                key={submission.id}
                type="button"
                onClick={() => setSelectedId(submission.id)}
                className={`w-full rounded-[8px] border bg-white p-4 text-left shadow-soft transition hover:border-brand-300 ${
                  selected?.id === submission.id ? 'border-brand-500 ring-4 ring-brand-100' : 'border-brand-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-brand-700">{repairMojibake(submission.skillName || 'Aptis')}</p>
                    <h2 className="mt-1 line-clamp-2 text-base font-extrabold text-navy">{repairMojibake(submission.testTitle)}</h2>
                  </div>
                  <ScoreBadge submission={submission} />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Clock3 size={16} />
                  {formatDateTime(submission.createdAt)}
                </div>
              </button>
            ))}
          </div>

          {selected && <SubmissionDetail submission={selected} />}
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

function AnswerBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-sky-50 p-3">
      <p className="text-xs font-extrabold uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-navy">{repairMojibake(value)}</p>
    </div>
  );
}

function ScoreBadge({ submission }: { submission: Submission }) {
  return (
    <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-brand-600 px-3 text-sm font-extrabold text-white">
      <FileCheck size={16} />
      {submission.totalScore}/{submission.maxScore || 0}
    </span>
  );
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
