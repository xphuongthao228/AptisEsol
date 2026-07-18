import { ArrowRight, BookOpen, Clock, FileCheck, Headphones, Mic, PenLine, Search, SpellCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { SkillType, Test } from '../../types';

type ExamCategory = 'ALL' | SkillType;

const categoryFilters: Array<{ value: ExamCategory; label: string }> = [
  { value: 'ALL', label: 'Tất cả bộ đề' },
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

export function Exams() {
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExamCategory>('ALL');

  const tests = data ?? [];
  const filteredTests = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tests.filter(isExamTest).filter((test) => {
      const testCategory = normalizeCategory(test);
      const matchesCategory = category === 'ALL' || testCategory === category;
      const matchesQuery =
        !keyword ||
        test.title.toLowerCase().includes(keyword) ||
        test.description?.toLowerCase().includes(keyword) ||
        getCategoryLabel(testCategory).toLowerCase().includes(keyword);

      return matchesCategory && matchesQuery;
    });
  }, [category, query, tests]);

  if (loading) return <div className="rounded-[18px] border border-slate-200 bg-white p-7">Đang tải danh sách bộ đề...</div>;
  if (error) return <div className="rounded-[18px] border border-red-200 bg-white p-7 text-red-600">{error}</div>;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">Đề thi</p>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-950">Danh sách bộ đề Aptis</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-500">
            Chọn bộ đề theo kỹ năng hoặc Grammar để vào giao diện làm bài.
          </p>
        </div>

        <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 shadow-soft md:max-w-[420px]">
          <Search size={20} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên bộ đề, kỹ năng hoặc Grammar..."
          />
        </label>
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
                : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700'
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

            return (
              <Link
                key={test.id}
                to={`/app/exams/${test.id}`}
                className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                    {meta.label}
                  </span>
                </div>

                <h2 className="mt-6 line-clamp-2 text-xl font-extrabold text-slate-950">{test.title}</h2>
                <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
                  {test.description || 'Bộ đề luyện thi Aptis được tạo từ trang quản trị.'}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <Clock size={17} />
                      Thời gian
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-slate-950">{test.durationMinutes || 0} phút</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <FileCheck size={17} />
                      Câu hỏi
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-slate-950">{test.questionCount ?? 0}</p>
                  </div>
                </div>

                <div className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white">
                  Xem bộ đề
                  <ArrowRight className="transition group-hover:translate-x-1" size={18} />
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
          <h2 className="mt-5 text-2xl font-extrabold text-slate-950">Chưa có bộ đề phù hợp</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-500">
            Nếu muốn hiện ở mục Grammar, hãy đặt tên hoặc mô tả bộ đề có chữ “Grammar” hoặc “Ngữ pháp”.
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

function isExamTest(test: Test) {
  if (test.mode) return test.mode === 'EXAM';
  const value = `${test.title ?? ''} ${test.description ?? ''}`.toLowerCase();
  if (value.includes('practice') || value.includes('luyen tap') || value.includes('luyện tập')) return false;
  return value.includes('bộ đề') || value.includes('bo de') || value.includes('đề thi') || value.includes('de thi') || value.includes('exam') || value.includes('mock');
}
