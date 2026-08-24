import { FileSearch, Link2, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import type { SkillType } from '../../types';

type Prediction = {
  id: number;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  tags: string;
  priority: number;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  updatedAt: string;
};

const skillLabels: Record<SkillType, string> = {
  LISTENING: 'Nghe',
  SPEAKING: 'Nói',
  READING: 'Đọc hiểu',
  WRITING: 'Viết',
  GRAMMAR: 'Grammar'
};

type PredictionSectionSkill = Extract<SkillType, 'LISTENING' | 'SPEAKING' | 'READING' | 'WRITING'>;

const predictionSections: PredictionSectionSkill[] = ['LISTENING', 'SPEAKING', 'READING', 'WRITING'];

const sectionLabels: Record<PredictionSectionSkill, string> = {
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  READING: 'Reading',
  WRITING: 'Writing'
};

const filters: Array<SkillType | 'ALL'> = ['ALL', 'LISTENING', 'SPEAKING', 'READING', 'WRITING', 'GRAMMAR'];
const QUESTION_LINKS_START = '[[QUESTION_LINKS]]';
const QUESTION_LINKS_END = '[[/QUESTION_LINKS]]';

type PredictionQuestionLink = {
  testId: number;
  questionId: number;
  label: string;
  section?: PredictionSectionSkill;
  part?: PredictionPart;
};

type PredictionPart = 1 | 2 | 3 | 4;

const predictionParts: PredictionPart[] = [1, 2, 3, 4];

export function Predictions() {
  const [items, setItems] = useState<Prediction[]>([]);
  const [activeSkill, setActiveSkill] = useState<SkillType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPredictions() {
      try {
        setLoading(true);
        setItems(await unwrap<Prediction[]>(api.get('/predictions?publishedOnly=true')));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadPredictions();
  }, []);

  const visibleItems = useMemo(() => {
    if (activeSkill === 'ALL') return items;
    return items.filter((item) => item.skill === activeSkill);
  }, [activeSkill, items]);

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="grid gap-6 bg-slate-950 p-7 text-white lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-extrabold text-brand-100">
              <FileSearch size={18} />
              Dự đoán đề
            </span>
            <h1 className="mt-5 text-3xl font-extrabold md:text-4xl">Trong tam on thi Aptis</h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-300">
              Xem các chủ đề, dạng bài và gợi ý ôn tập mới nhất do admin cập nhật.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <p className="text-sm text-slate-300">Tổng số mục đang hiện</p>
            <p className="mt-2 text-4xl font-extrabold">{items.length}</p>
          </div>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-extrabold transition ${
              activeSkill === filter ? 'bg-brand-600 text-white shadow-soft' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700'
            }`}
            onClick={() => setActiveSkill(filter)}
          >
            {filter === 'ALL' ? 'Tất cả' : skillLabels[filter]}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="card p-10 text-center font-bold text-slate-500">Đang tải dự đoán đề...</div>
      ) : visibleItems.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {visibleItems.map((item) => <PredictionCard key={item.id} item={item} />)}
        </section>
      ) : (
        <div className="card p-10 text-center">
          <Sparkles className="mx-auto text-brand-600" />
          <h2 className="mt-4 text-xl font-extrabold">Chưa có dự đoán đề</h2>
          <p className="mt-2 text-slate-500">Admin chưa đăng nội dung cho mục này.</p>
        </div>
      )}
    </div>
  );
}

function PredictionCard({ item }: { item: Prediction }) {
  const parsed = parsePredictionContent(item.content);
  const groupedLinks = groupLinksBySectionAndPart(parsed.links);
  const ungroupedLinks = parsed.links.filter((link) => !link.section);

  return (
    <article className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Target size={22} />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
          {skillLabels[item.skill]}
        </span>
      </div>
      <h2 className="mt-5 text-2xl font-extrabold text-slate-950">{item.title}</h2>
      {item.summary ? <p className="mt-2 text-slate-500">{item.summary}</p> : null}
      {parsed.text ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <p className="whitespace-pre-line">{parsed.text}</p>
        </div>
      ) : null}
      {parsed.links.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-brand-800">
            <Link2 size={17} />
            Câu hỏi được dự đoán
          </div>
          <div className="space-y-4">
            {predictionSections.map((section) => groupedLinks[section].length > 0 ? (
              <div key={section}>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{sectionLabels[section]}</p>
                <div className="space-y-3">
                  {predictionParts.map((part) => {
                    const partLinks = groupedLinks[section].filter((link) => link.part === part);
                    return partLinks.length > 0 ? (
                      <div key={`${section}-${part}`} className="rounded-xl border border-white bg-white/70 p-3">
                        <p className="mb-2 text-xs font-extrabold text-brand-700">Part {part}</p>
                        <div className="space-y-2">
                          {partLinks.map((link) => <QuestionLink key={`${section}-${part}-${link.testId}-${link.questionId}`} link={link} />)}
                        </div>
                      </div>
                    ) : null;
                  })}
                  {groupedLinks[section].filter((link) => !link.part).length > 0 ? (
                    <div className="space-y-2">
                      {groupedLinks[section].filter((link) => !link.part).map((link) => <QuestionLink key={`${section}-general-${link.testId}-${link.questionId}`} link={link} />)}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null)}
            {ungroupedLinks.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Câu hỏi chung</p>
                <div className="space-y-2">
                  {ungroupedLinks.map((link) => <QuestionLink key={`general-${link.testId}-${link.questionId}`} link={link} />)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {item.tags ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
            <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">#{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function QuestionLink({ link }: { link: PredictionQuestionLink }) {
  return (
    <Link
      to={`/app/tests/${link.testId}?questionId=${link.questionId}`}
      className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:text-brand-700"
    >
      <span>{link.label || `Câu hỏi ${link.questionId}`}</span>
      <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-600">Mở câu</span>
    </Link>
  );
}

function groupLinksBySectionAndPart(links: PredictionQuestionLink[]) {
  return predictionSections.reduce((acc, section) => {
    acc[section] = links.filter((link) => link.section === section);
    return acc;
  }, {} as Record<PredictionSectionSkill, PredictionQuestionLink[]>);
}

function parsePredictionContent(content: string): { text: string; links: PredictionQuestionLink[] } {
  const pattern = new RegExp(`${escapeRegExp(QUESTION_LINKS_START)}([\\s\\S]*?)${escapeRegExp(QUESTION_LINKS_END)}`, 'm');
  const match = content.match(pattern);
  if (!match) return { text: content, links: [] };

  let links: PredictionQuestionLink[] = [];
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed)) {
      links = parsed
        .filter((item) => Number(item?.testId) && Number(item?.questionId))
        .map((item) => ({
          testId: Number(item.testId),
          questionId: Number(item.questionId),
          label: String(item.label ?? '').trim(),
          ...(predictionSections.includes(item.section) ? { section: item.section as PredictionSectionSkill } : {}),
          ...(isPredictionPart(item.part) ? { part: Number(item.part) as PredictionPart } : {})
        }));
    }
  } catch {
    links = [];
  }

  return {
    text: content.replace(pattern, '').trim(),
    links
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPredictionPart(value: unknown) {
  return predictionParts.includes(Number(value) as PredictionPart);
}
