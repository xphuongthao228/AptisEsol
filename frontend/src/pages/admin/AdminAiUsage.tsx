import { BarChart3, Bot, ChevronLeft, ChevronRight, Filter, Loader2, RefreshCw, Search, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { AiScoringUsage, AiScoringUsageType } from '../../types';

type UsageFilter = 'ALL' | AiScoringUsageType;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 0];
const usageLabels: Record<AiScoringUsageType, string> = {
  WRITING: 'Writing',
  SPEAKING: 'Speaking luyện riêng',
  SPEAKING_FULL_TEST: 'Speaking Full Test'
};

export function AdminAiUsage() {
  const [keyword, setKeyword] = useState('');
  const [usageType, setUsageType] = useState<UsageFilter>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (usageType !== 'ALL') params.set('usageType', usageType);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const query = params.toString();
    return `/users/ai-scoring-usage${query ? `?${query}` : ''}`;
  }, [fromDate, keyword, toDate, usageType]);

  const { data, error, loading, reload } = useApi<AiScoringUsage[]>(() => unwrap(api.get(requestUrl)), [requestUrl]);
  const rows = data ?? [];
  const totalUsage = rows.reduce((sum, item) => sum + item.usageCount, 0);
  const uniqueStudents = new Set(rows.map((item) => item.email)).size;
  const topType = getTopType(rows);

  const effectivePageSize = pageSize === 0 ? Math.max(1, rows.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * effectivePageSize;
  const paginatedRows = rows.slice(pageStart, pageStart + effectivePageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [requestUrl, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function clearFilters() {
    setKeyword('');
    setUsageType('ALL');
    setFromDate('');
    setToDate('');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Lượt chấm AI</h1>
          <p className="mt-1 text-sm text-slate-600">Theo dõi học viên đã dùng AI chấm bài theo ngày và từng loại kỹ năng.</p>
        </div>
        <button type="button" onClick={reload} className="btn-secondary h-11 px-4">
          <RefreshCw size={17} />
          Tải lại
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Summary icon={<Sparkles size={19} />} label="Tổng lượt đã dùng" value={String(totalUsage)} tone="bg-brand-50 text-brand-700" />
        <Summary icon={<Users size={19} />} label="Học viên có dùng AI" value={String(uniqueStudents)} tone="bg-emerald-50 text-emerald-700" />
        <Summary icon={<BarChart3 size={19} />} label="Loại dùng nhiều nhất" value={topType} tone="bg-amber-50 text-amber-700" />
      </section>

      <section className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_170px_170px_auto]">
          <label className="flex h-11 items-center gap-3 rounded-xl border border-brand-100 bg-white px-3">
            <Search size={18} className="text-slate-500" />
            <input
              className="w-full border-0 bg-transparent text-sm outline-none"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên hoặc email học viên..."
            />
          </label>
          <select className="input" value={usageType} onChange={(event) => setUsageType(event.target.value as UsageFilter)}>
            <option value="ALL">Tất cả loại chấm</option>
            <option value="WRITING">Writing</option>
            <option value="SPEAKING">Speaking luyện riêng</option>
            <option value="SPEAKING_FULL_TEST">Speaking Full Test</option>
          </select>
          <input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Từ ngày" />
          <input className="input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Đến ngày" />
          <button type="button" onClick={clearFilters} className="btn-secondary h-11 px-4">
            <Filter size={17} />
            Xóa lọc
          </button>
        </div>
      </section>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-slate-600">
              <Loader2 className="animate-spin" size={18} />
              Đang tải lượt chấm AI...
            </div>
          ) : error && !data ? (
            <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-700">
              {error}
            </div>
          ) : (
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-sky-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-4">Học viên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Loại chấm</th>
                  <th className="p-4">Ngày</th>
                  <th className="p-4">Số lượt</th>
                  <th className="p-4">Cập nhật cuối</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item) => (
                  <tr className="border-t border-brand-100" key={item.id}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
                          {(item.fullName || item.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-navy">{item.fullName || 'Chưa nhập tên'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{item.email}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                        <Bot size={14} />
                        {usageLabels[item.usageType]}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{formatDate(item.usageDate)}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{item.usageCount} lượt</span>
                    </td>
                    <td className="p-4 text-slate-600">{formatDateTime(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && !rows.length && !error && <div className="p-6 text-center text-sm text-slate-600">Chưa có lượt chấm AI phù hợp bộ lọc.</div>}
        {!!rows.length && (
          <PaginationBar
            currentPage={safePage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            totalItems={rows.length}
            totalPages={totalPages}
            startItem={pageStart + 1}
            endItem={Math.min(pageStart + effectivePageSize, rows.length)}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
        {error && data && <div className="border-t border-amber-100 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-700">{error} Dữ liệu cũ vẫn được giữ lại.</div>}
      </div>
    </div>
  );
}

function Summary({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-soft">
      <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function PaginationBar({
  currentPage,
  pageSize,
  pageSizeOptions,
  totalItems,
  totalPages,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange
}: {
  currentPage: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-brand-100 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-semibold">
        Hiển thị {startItem}-{endItem} / {totalItems}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-lg border border-brand-100 bg-white px-2 text-sm font-semibold outline-none"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option === 0 ? 'Tất cả' : `${option} / trang`}</option>
          ))}
        </select>
        <button type="button" className="btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} title="Trang trước">
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[92px] text-center font-bold text-slate-700">Trang {currentPage}/{totalPages}</span>
        <button type="button" className="btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} title="Trang sau">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function getTopType(rows: AiScoringUsage[]) {
  if (!rows.length) return 'Chưa có';
  const totals = rows.reduce<Record<AiScoringUsageType, number>>((map, item) => {
    map[item.usageType] = (map[item.usageType] ?? 0) + item.usageCount;
    return map;
  }, {} as Record<AiScoringUsageType, number>);
  const [type] = Object.entries(totals).sort((left, right) => right[1] - left[1])[0] as [AiScoringUsageType, number];
  return usageLabels[type];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
