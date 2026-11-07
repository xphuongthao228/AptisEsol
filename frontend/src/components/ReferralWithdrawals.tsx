import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../api/client';
import { useApi } from '../hooks/useApi';

export type Withdrawal = { id: number; fullName?: string; email?: string; amount: number; bankName: string; accountNumber: string; accountHolder: string; status: 'PENDING' | 'PAID' | 'REJECTED'; createdAt: string; transferReference?: string; adminNote?: string };
export type WithdrawalPage = { items: Withdrawal[]; page: number; totalPages: number; totalElements: number };
export const withdrawalLabels = { PENDING: 'Chờ xử lý', PAID: 'Đã chuyển khoản', REJECTED: 'Đã từ chối' };
export const withdrawalMoney = (value: number | null) => value === null ? '—' : `${value.toLocaleString('vi-VN')}đ`;

export function ReferralWithdrawals({ open, onClose, available, pending, minimum, onUpdated }: {
  open: boolean; onClose: () => void; available: number | null; pending: number | null; minimum: number; onUpdated: () => void;
}) {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useApi<WithdrawalPage>(() => unwrap(api.get(`/payments/referral/withdrawals/me?page=${page}&size=10`)), [page]);
  const [amount, setAmount] = useState(String(minimum));
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [saving, setSaving] = useState(false);
  const requestKey = useRef('');
  const formRef = useRef<HTMLElement | null>(null);
  useEffect(() => { if (open) { requestKey.current = crypto.randomUUID(); setAmount(String(minimum)); } }, [open, minimum]);
  useEffect(() => { if (open) formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [open]);
  useEffect(() => { reload(); }, [available, pending, reload]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < minimum || available === null || value > available) { toast.error(`Nhập số tiền từ ${withdrawalMoney(minimum)} đến số dư khả dụng.`); return; }
    setSaving(true);
    try {
      await unwrap(api.post('/payments/referral/withdrawals', { amount: value, bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim(), requestKey: requestKey.current }));
      toast.success('Đã gửi yêu cầu rút. Admin sẽ kiểm tra và chuyển khoản.');
      onClose(); setAccountNumber(''); setPage(0); reload(); onUpdated();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Chưa gửi được yêu cầu. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  }
  return <>
    <section className="grid gap-4 sm:grid-cols-3">
      {[['Số dư có thể rút', available], ['Rút tối thiểu', minimum], ['Đang chờ xử lý', pending]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-extrabold text-brand-600">{withdrawalMoney(value as number | null)}</p></div>)}
    </section>
    {open && <section ref={formRef} style={{ scrollMarginTop: 120 }} className="rounded-3xl border border-brand-200 bg-white p-5 shadow-soft sm:p-7" aria-labelledby="withdrawal-form-title">
      <h2 id="withdrawal-form-title" className="text-lg font-extrabold text-navy">Yêu cầu rút hoa hồng</h2>
      <p className="mt-2 text-sm text-slate-500">Kiểm tra thông tin nhận tiền trước khi gửi. Số tiền yêu cầu sẽ được giữ lại trong lúc chờ xử lý.</p>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-navy">Số tiền muốn rút (đ)<input name="amount" className="input mt-2" required type="number" min={minimum} max={available ?? 0} step="1" value={amount} onChange={e => setAmount(e.target.value)} disabled={saving} /></label>
        <label className="text-sm font-bold text-navy">Ngân hàng<input name="bankName" className="input mt-2" required maxLength={100} placeholder="Ví dụ: Vietcombank" value={bankName} onChange={e => setBankName(e.target.value)} disabled={saving} /></label>
        <label className="text-sm font-bold text-navy">Số tài khoản<input name="accountNumber" className="input mt-2" required inputMode="numeric" pattern="[0-9]{6,30}" maxLength={30} placeholder="Nhập số tài khoản nhận tiền" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\s/g, ''))} disabled={saving} /></label>
        <label className="text-sm font-bold text-navy">Tên chủ tài khoản<input name="accountHolder" className="input mt-2" required maxLength={120} placeholder="Họ tên theo tài khoản ngân hàng" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} disabled={saving} /></label>
        <div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Đang gửi…' : 'Gửi yêu cầu rút'}</button><button type="button" disabled={saving} onClick={onClose} className="btn-secondary">Đóng</button></div>
      </form>
    </section>}
    <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-7">
      <h2 className="text-lg font-extrabold text-navy">Lịch sử yêu cầu rút</h2>
      {loading ? <p className="mt-4 text-sm text-slate-500">Đang tải yêu cầu…</p> : error ? <p className="mt-4 text-sm text-slate-500">Chưa tải được lịch sử. <button onClick={reload} className="text-brand-600 underline">Thử lại</button></p> : !data?.items.length ? <p className="mt-4 text-sm text-slate-500">Bạn chưa có yêu cầu rút nào.</p> : <div className="mt-4 divide-y divide-slate-100">{data.items.map(item => <article key={item.id} className="py-4"><div className="flex flex-wrap justify-between gap-3"><strong className="text-navy">#{item.id} · {withdrawalMoney(item.amount)}</strong><span className={`text-xs font-bold ${item.status === 'PAID' ? 'text-emerald-600' : item.status === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>{withdrawalLabels[item.status]}</span></div><p className="mt-2 text-sm text-slate-500">{item.bankName} · {item.accountNumber} · {item.accountHolder}</p>{item.adminNote && <p className="mt-2 text-xs text-slate-500">Ghi chú: {item.adminNote}</p>}{item.transferReference && <p className="mt-1 text-xs text-slate-500">Mã chuyển khoản: {item.transferReference}</p>}</article>)}</div>}
      {!!data && data.totalPages > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm"><button disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} className="btn-secondary disabled:opacity-50">Trước</button><span>{page + 1}/{data.totalPages}</span><button disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage(p => p + 1)} className="btn-secondary disabled:opacity-50">Sau</button></div>}
    </section>
  </>;
}
