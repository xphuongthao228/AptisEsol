import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, DollarSign, Loader2, PackageCheck, Search, TrendingUp, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { PaymentOrder } from '../../types';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function AdminRevenue() {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, loading } = useApi<PaymentOrder[]>(() => unwrap(api.get('/payments/revenue')), []);
  const transactions = data ?? [];

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return transactions;
    return transactions.filter((item) =>
      item.userEmail.toLowerCase().includes(keyword) ||
      item.fullName.toLowerCase().includes(keyword) ||
      item.packageLabel.toLowerCase().includes(keyword) ||
      item.paymentCode.toLowerCase().includes(keyword)
    );
  }, [query, transactions]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedTransactions = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const totalRevenue = transactions.reduce((sum, item) => sum + item.amount, 0);
  const thisMonthRevenue = transactions
    .filter((item) => {
      const date = new Date(item.paidAt ?? item.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + item.amount, 0);
  const uniqueCustomers = new Set(transactions.map((item) => item.userEmail)).size;
  const bestPackage = getBestPackage(transactions);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-slate-950 p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-200">Revenue Center</p>
        <h1 className="mt-3 text-3xl font-extrabold">Quản lý doanh thu</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Theo dõi doanh thu gia hạn từ SePay webhook, khách hàng đã thanh toán và các gói được mua nhiều nhất.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<DollarSign />} label="Tổng doanh thu" value={formatCurrency(totalRevenue)} tone="bg-green-50 text-green-700" />
        <StatCard icon={<TrendingUp />} label="Doanh thu tháng này" value={formatCurrency(thisMonthRevenue)} tone="bg-blue-50 text-brand-700" />
        <StatCard icon={<CreditCard />} label="Giao dịch" value={String(transactions.length)} tone="bg-violet-50 text-violet-700" />
        <StatCard icon={<Users />} label="Khách đã mua" value={String(uniqueCustomers)} tone="bg-amber-50 text-amber-700" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="rounded-[22px] border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">Lịch sử giao dịch</h2>
              <p className="mt-1 text-sm text-slate-500">Danh sách các giao dịch gia hạn đã được SePay xác nhận.</p>
            </div>
            <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 sm:max-w-[300px]">
              <Search size={18} />
              <input
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm email, tên, mã GD..."
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                Đang tải doanh thu...
              </div>
            ) : (
              <>
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Khách hàng</th>
                      <th className="px-5 py-4">Gói</th>
                      <th className="px-5 py-4">Số tiền</th>
                      <th className="px-5 py-4">Mã GD</th>
                      <th className="px-5 py-4">Ngày thanh toán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTransactions.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-slate-950">{item.fullName || 'Chưa nhập tên'}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.userEmail}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{item.packageLabel}</span>
                          <p className="mt-2 text-xs text-slate-500">{item.days} ngày</p>
                        </td>
                        <td className="px-5 py-4 font-extrabold text-green-700">{formatCurrency(item.amount)}</td>
                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">{item.paymentCode}</td>
                        <td className="px-5 py-4 text-slate-600">{new Date(item.paidAt ?? item.createdAt).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!!filtered.length && (
                  <PaginationBar
                    currentPage={safePage}
                    pageSize={pageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    totalItems={filtered.length}
                    totalPages={totalPages}
                    startItem={pageStart + 1}
                    endItem={Math.min(pageStart + pageSize, filtered.length)}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                )}
                {!filtered.length && (
                  <div className="p-8 text-center text-sm font-semibold text-slate-500">
                    Chưa có giao dịch doanh thu nào.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-soft">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <PackageCheck />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-950">Gói bán tốt</h2>
            <p className="mt-2 text-3xl font-extrabold text-brand-700">{bestPackage.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{bestPackage.count} giao dịch</p>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-soft">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-700">
              <CalendarDays />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-950">Webhook SePay</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Khi SePay gửi webhook vào backend, đơn thanh toán sẽ chuyển sang PAID và tự hiện trong bảng doanh thu này.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: JSX.Element; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${tone}`}>{icon}</div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
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
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-semibold">
        Hiển thị {startItem}-{endItem} / {totalItems}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold outline-none"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option} / trang</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[92px] text-center font-bold text-slate-700">
          Trang {currentPage}/{totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function getBestPackage(transactions: PaymentOrder[]) {
  if (!transactions.length) return { label: 'Chưa có', count: 0 };
  const counter = transactions.reduce<Record<string, number>>((map, item) => {
    map[item.packageLabel] = (map[item.packageLabel] ?? 0) + 1;
    return map;
  }, {});
  const [label, count] = Object.entries(counter).sort((a, b) => b[1] - a[1])[0];
  return { label, count };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ';
}
