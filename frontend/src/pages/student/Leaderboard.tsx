import { Award, CalendarDays, ExternalLink, Gift, Medal, RotateCcw, Save, Search, Trophy, Users, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { LeaderboardRow, LeaderboardSettings } from '../../types';
import { userHasRole } from '../../utils/roles';
import { repairMojibake } from '../../utils/textRepair';

const facebookCommunityUrl = 'https://www.facebook.com/groups/1017783430680359';
const zaloCommunityUrl = 'https://zalo.me/g/n1f3m9mamomr1vnhs6lw';

export function Leaderboard() {
  const { data, loading, error } = useApi<LeaderboardRow[]>(() => unwrap(api.get('/submissions/leaderboard')), []);
  const [query, setQuery] = useState('');
  const [examDate, setExamDate] = useState('');
  const [savingExamDate, setSavingExamDate] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAdmin = userHasRole(user, 'ADMIN');

  useEffect(() => {
    unwrap<LeaderboardSettings>(api.get('/submissions/leaderboard/settings'))
      .then((settings) => setExamDate(toDateInputValue(settings.examAt, settings.examDate)))
      .catch(() => undefined);
  }, []);

  const rows = data ?? [];
  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => `${row.fullName} ${row.email}`.toLowerCase().includes(keyword));
  }, [query, rows]);
  const topThree = rows.slice(0, 3);

  async function saveExamDate() {
    setSavingExamDate(true);
    try {
      const saved = await unwrap<LeaderboardSettings>(api.put('/submissions/leaderboard/settings', {
        examAt: null,
        examDate: examDate || null
      }));
      setExamDate(toDateInputValue(saved.examAt, saved.examDate));
      toast.success('Đã cập nhật ngày thi');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Không lưu được ngày thi');
    } finally {
      setSavingExamDate(false);
    }
  }

  if (loading) return <InfoCard>Đang tải bảng xếp hạng...</InfoCard>;
  if (error) return <InfoCard error>{error}</InfoCard>;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">
            Bảng xếp hạng
          </p>
          <h1 className="mt-4 text-4xl font-extrabold text-navy">Điểm luyện tập của học viên</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
            Mỗi câu trả lời đúng được tính 1 điểm. Học viên được xếp hạng theo tổng số câu đúng đã nộp.
          </p>
        </div>

        <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 text-slate-500 shadow-soft md:max-w-[420px]">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm học viên..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400"
          />
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-[8px] border border-brand-100 bg-white p-5 shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 shadow-soft">
            <CalendarDays size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-navy">Ngày bắt đầu thi</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
              {examDate ? formatDateOnly(examDate) : 'Admin chưa đặt ngày bắt đầu thi.'}
            </p>
            {isAdmin && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="date"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  className="h-10 rounded-lg border border-brand-100 bg-white px-3 text-sm font-bold text-navy outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={saveExamDate}
                  disabled={savingExamDate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-extrabold text-white transition hover:bg-brand-700 disabled:opacity-70"
                >
                  <Save size={16} />
                  {savingExamDate ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-[8px] border border-amber-200 bg-amber-50 p-5 shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-amber-600 shadow-soft">
            <Gift size={22} />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-navy">Phần thưởng Top 3</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
              3 học viên đứng đầu sẽ được nhận khóa học 1 tuần hoặc quy đổi khi đạt tối thiểu 150 điểm.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-[8px] border border-emerald-200 bg-emerald-50 p-5 shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-emerald-600 shadow-soft">
            <Users size={22} />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-navy">Tham gia group học chung</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
              Vào group chung để học cùng mọi người, hỏi bài và cập nhật mẹo ôn thi mới.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={facebookCommunityUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1877f2] px-3 text-xs font-extrabold text-white hover:bg-[#0f65d8]">
                Facebook <ExternalLink size={14} />
              </a>
              <a href={zaloCommunityUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0068ff] px-3 text-xs font-extrabold text-white hover:bg-[#0054cc]">
                Zalo <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-[8px] border border-brand-100 bg-sky-50 p-5 shadow-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-soft">
            <RotateCcw size={22} />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-navy">Reset bảng xếp hạng</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
              Bảng xếp hạng sẽ được reset sau mỗi 10 ngày để mọi học viên có cơ hội leo top.
            </p>
          </div>
        </div>
      </section>

      {topThree.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {topThree.map((row) => (
            <TopStudent key={row.userId} row={row} />
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-[8px] border border-brand-100 bg-white shadow-soft">
        <div className="grid grid-cols-[72px_minmax(180px,1fr)_110px_110px_170px] gap-4 border-b border-brand-100 bg-sky-50 px-5 py-4 text-sm font-extrabold text-slate-600 max-lg:hidden">
          <span>Hạng</span>
          <span>Học viên</span>
          <span className="text-right">Điểm</span>
          <span className="text-right">Bài nộp</span>
          <span className="text-right">Lần nộp gần nhất</span>
        </div>

        <div className="divide-y divide-brand-100">
          {filteredRows.length ? filteredRows.map((row) => (
            <article
              key={row.userId}
              className="grid gap-4 px-5 py-4 lg:grid-cols-[72px_minmax(180px,1fr)_110px_110px_170px] lg:items-center"
            >
              <div className="flex items-center gap-3">
                <RankBadge rank={row.rank} />
                <span className="font-extrabold text-navy lg:hidden">Hạng {row.rank}</span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold text-navy">{repairMojibake(row.fullName)}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-500">{row.email}</p>
              </div>
              <Metric label="Điểm" value={row.score} strong />
              <Metric label="Bài nộp" value={row.submissions} />
              <div className="text-sm font-bold text-slate-500 lg:text-right">{formatDate(row.latestSubmissionAt)}</div>
            </article>
          )) : (
            <div className="px-5 py-10 text-center">
              <Trophy className="mx-auto mb-3 text-slate-300" size={38} />
              <p className="text-sm font-bold text-slate-600">
                {rows.length ? 'Không tìm thấy học viên phù hợp.' : 'Chưa có dữ liệu làm bài để xếp hạng.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TopStudent({ row }: { row: LeaderboardRow }) {
  const styles = row.rank === 1
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : row.rank === 2
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-orange-200 bg-orange-50 text-orange-700';

  return (
    <article className={`rounded-[8px] border p-5 shadow-soft ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/80 shadow-soft">
          {row.rank === 1 ? <Trophy size={24} /> : row.rank === 2 ? <Medal size={24} /> : <Award size={24} />}
        </span>
        <span className="text-3xl font-black">#{row.rank}</span>
      </div>
      <h2 className="mt-5 truncate text-xl font-extrabold text-navy">{repairMojibake(row.fullName)}</h2>
      <p className="mt-1 truncate text-sm font-semibold text-slate-500">{row.email}</p>
      <p className="mt-4 text-3xl font-black text-brand-700">{row.score} điểm</p>
    </article>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const className = rank === 1
    ? 'bg-amber-400 text-navy'
    : rank === 2
      ? 'bg-slate-200 text-slate-700'
      : rank === 3
        ? 'bg-orange-200 text-orange-800'
        : 'bg-brand-50 text-brand-700';

  return (
    <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${className}`}>
      {rank <= 3 ? rank : <UserRound size={17} />}
    </span>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
      <span className="text-sm font-bold text-slate-500 lg:hidden">{label}</span>
      <span className={`${strong ? 'text-xl text-brand-700' : 'text-base text-navy'} font-extrabold`}>{value}</span>
    </div>
  );
}

function InfoCard({ children, error = false }: { children: string; error?: boolean }) {
  return (
    <div className={`rounded-[8px] border bg-white p-7 shadow-soft ${error ? 'border-red-200 text-red-600' : 'border-brand-100 text-slate-600'}`}>
      {children}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return 'Chưa nộp bài';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function toDateInputValue(examAt?: string | null, examDate?: string | null) {
  const value = examDate || examAt || '';
  if (!value) return '';
  return value.slice(0, 10);
}

function formatDateOnly(value: string | null) {
  if (!value) return 'Admin chưa đặt ngày bắt đầu thi.';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}
