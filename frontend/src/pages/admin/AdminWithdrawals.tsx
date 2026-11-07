import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { withdrawalLabels, withdrawalMoney, type Withdrawal, type WithdrawalPage } from '../../components/ReferralWithdrawals';

export function AdminWithdrawals() {
  const [status, setStatus] = useState<Withdrawal['status']>('PENDING');
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useApi<WithdrawalPage>(() => unwrap(api.get(`/payments/referral/withdrawals?status=${status}&page=${page}&size=10`)), [status, page]);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [decision, setDecision] = useState<'PAID' | 'REJECTED'>('PAID');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  function open(item: Withdrawal, next: 'PAID' | 'REJECTED') { setSelected(item); setDecision(next); setReference(''); setNote(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setSaving(true);
    try {
      await unwrap(api.put(`/payments/referral/withdrawals/${selected.id}`, { status: decision, transferReference: reference.trim(), note: note.trim() }));
      toast.success('Đã cập nhật yêu cầu rút.'); setSelected(null); reload();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Chưa cập nhật được. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-6">
    <section className="rounded-3xl border border-brand-100 bg-white p-6"><h1 className="text-2xl font-extrabold text-navy">Yêu cầu rút hoa hồng</h1><p className="mt-3 text-sm leading-7 text-slate-500">Kiểm tra tài khoản nhận tiền và chuyển khoản thủ công. Sau khi chuyển thành công, xác nhận kèm mã giao dịch để lưu đối chiếu.</p></section>
    <section className="rounded-3xl border border-brand-100 bg-white p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(['PENDING', 'PAID', 'REJECTED'] as const).map(value => <button key={value} type="button" onClick={() => { setStatus(value); setPage(0); setSelected(null); }} className={status === value ? 'btn-primary' : 'btn-secondary'}>{withdrawalLabels[value]}</button>)}</div><button type="button" onClick={reload} className="btn-secondary">Cập nhật</button></div>
      {loading ? <p className="text-sm text-slate-500">Đang tải yêu cầu…</p> : error ? <p className="text-sm text-red-600">Chưa tải được danh sách. Vui lòng thử lại.</p> : !data?.items.length ? <p className="py-5 text-sm text-slate-500">Không có yêu cầu trong mục này.</p> : <div className="divide-y divide-slate-100">{data.items.map(item => <article key={item.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-extrabold text-navy">#{item.id} · {item.fullName}</h2><p className="mt-1 text-xs text-slate-500">{item.email}</p><p className="mt-3 text-sm text-navy">{item.bankName} · <span className="select-all font-bold">{item.accountNumber}</span> · {item.accountHolder}</p></div><strong className="text-xl text-brand-600">{withdrawalMoney(item.amount)}</strong></div>{item.status === 'PENDING' && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => open(item, 'PAID')} className="btn-primary">Xác nhận đã chuyển khoản</button><button onClick={() => open(item, 'REJECTED')} className="btn-secondary">Từ chối</button></div>}{item.transferReference && <p className="mt-3 text-xs text-slate-500">Mã giao dịch: {item.transferReference}</p>}{item.adminNote && <p className="mt-2 text-xs text-slate-500">Ghi chú: {item.adminNote}</p>}</article>)}</div>}
      {!!data && data.totalPages > 1 && <div className="mt-5 flex justify-end gap-3"><button className="btn-secondary disabled:opacity-50" disabled={!page || loading} onClick={() => setPage(p => p - 1)}>Trước</button><span className="self-center text-sm">{page + 1}/{data.totalPages}</span><button className="btn-secondary disabled:opacity-50" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage(p => p + 1)}>Sau</button></div>}
    </section>
    {selected && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="review-withdrawal-title"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 id="review-withdrawal-title" className="text-xl font-extrabold text-navy">{decision === 'PAID' ? 'Xác nhận đã chuyển khoản' : 'Từ chối yêu cầu'} #{selected.id}</h2><p className="mt-3 text-sm text-slate-600">{withdrawalMoney(selected.amount)} · {selected.bankName} · {selected.accountNumber} · {selected.accountHolder}</p>{decision === 'PAID' && <><label className="mt-5 block text-sm font-bold text-navy">Mã giao dịch chuyển khoản<input required maxLength={160} className="input mt-2" value={reference} onChange={e => setReference(e.target.value)} disabled={saving} /></label><label className="mt-4 flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" required disabled={saving} className="mt-1" />Tôi đã chuyển thành công đúng số tiền vào tài khoản trên.</label></>}<label className="mt-4 block text-sm font-bold text-navy">{decision === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú (nếu có)'}<textarea required={decision === 'REJECTED'} maxLength={500} className="input mt-2 min-h-24" value={note} onChange={e => setNote(e.target.value)} disabled={saving} /></label><div className="mt-5 flex gap-3"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Xác nhận'}</button><button type="button" disabled={saving} onClick={() => setSelected(null)} className="btn-secondary">Đóng</button></div></form></div>}
  </div>;
}
