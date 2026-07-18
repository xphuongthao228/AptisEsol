import { AlertCircle, FileSearch, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  SPEAKING: 'Noi',
  READING: 'Doc hieu',
  WRITING: 'Viet',
  GRAMMAR: 'Grammar'
};

const filters: Array<SkillType | 'ALL'> = ['ALL', 'LISTENING', 'SPEAKING', 'READING', 'WRITING', 'GRAMMAR'];

export function Predictions() {
  const [items, setItems] = useState<Prediction[]>([]);
  const [activeSkill, setActiveSkill] = useState<SkillType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPredictions() {
      try {
        setLoading(true);
        setError('');
        setItems(await unwrap<Prediction[]>(api.get('/predictions?publishedOnly=true')));
      } catch {
        setError('Khong the tai du lieu du doan de.');
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
              Du doan de
            </span>
            <h1 className="mt-5 text-3xl font-extrabold md:text-4xl">Trong tam on thi Aptis</h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-300">
              Xem cac chu de, dang bai va goi y on tap moi nhat do admin cap nhat.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <p className="text-sm text-slate-300">Tong so muc dang hien</p>
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
            {filter === 'ALL' ? 'Tat ca' : skillLabels[filter]}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="card p-10 text-center font-bold text-slate-500">Dang tai du doan de...</div>
      ) : error ? (
        <div className="card flex items-center gap-3 border-red-200 p-6 text-red-600">
          <AlertCircle size={22} />
          <span className="font-bold">{error}</span>
        </div>
      ) : visibleItems.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {visibleItems.map((item) => (
            <article key={item.id} className="card p-6">
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
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                <p className="whitespace-pre-line">{item.content}</p>
              </div>
              {item.tags ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">#{tag}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <div className="card p-10 text-center">
          <Sparkles className="mx-auto text-brand-600" />
          <h2 className="mt-4 text-xl font-extrabold">Chua co du doan de</h2>
          <p className="mt-2 text-slate-500">Admin chua dang noi dung cho muc nay.</p>
        </div>
      )}
    </div>
  );
}
