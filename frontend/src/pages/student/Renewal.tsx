import { CalendarDays, CheckCircle2, Copy, CreditCard, Loader2, QrCode, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { PaymentOrder, SubscriptionResponse } from '../../types';
import { getSubscriptionStatus, saveSubscriptionUntil } from '../../utils/subscription';

const packages = [
  { id: 'week-1', label: '1 tuần', days: 7, price: 20000, badge: 'Tiết kiệm' },
  { id: 'week-2', label: '2 tuần', days: 14, price: 30000, badge: 'Phổ biến' },
  { id: 'month-1', label: '1 tháng', days: 30, price: 55000, badge: 'Nên chọn' },
  { id: 'month-2', label: '2 tháng', days: 60, price: 95000, badge: 'Tốt nhất' }
];

export function Renewal() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0].id);
  const [payment, setPayment] = useState<PaymentOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paidHandled, setPaidHandled] = useState(false);
  const [serverSubscription, setServerSubscription] = useState<SubscriptionResponse | null>(null);

  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[0];
  const expireDate = useMemo(() => {
    const local = getSubscriptionStatus();
    const backendDate = serverSubscription?.active && serverSubscription.expiresAt ? new Date(serverSubscription.expiresAt) : null;
    const date = backendDate ?? (local.active && local.expireDate ? new Date(local.expireDate) : new Date());
    date.setDate(date.getDate() + selectedPackage.days);
    return date.toLocaleDateString('vi-VN');
  }, [selectedPackage.days, serverSubscription]);

  useEffect(() => {
    unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'))
      .then((subscription) => {
        setServerSubscription(subscription);
        if (subscription.active) saveSubscriptionUntil(subscription.expiresAt);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!payment || payment.status !== 'PENDING' || paidHandled) return;

    const timer = window.setInterval(async () => {
      try {
        const latest = await unwrap<PaymentOrder>(api.get(`/payments/status/${payment.paymentCode}`));
        setPayment(latest);
        if (latest.status === 'PAID') {
          const subscription = await unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'));
          setPaidHandled(true);
          setServerSubscription(subscription);
          saveSubscriptionUntil(subscription.expiresAt);
          toast.success('Thanh toán thành công. Tài khoản đã được gia hạn.');
          window.clearInterval(timer);
          navigate('/app/lessons');
        }
      } catch {
        // Poll im lặng trong lúc chờ ngân hàng gửi webhook.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [navigate, paidHandled, payment]);

  async function createPayment() {
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên người chuyển khoản.');
      return;
    }

    setCreating(true);
    try {
      const created = await unwrap<PaymentOrder>(api.post('/payments/renewal', {
        fullName: fullName.trim(),
        packageLabel: selectedPackage.label,
        days: selectedPackage.days,
        amount: selectedPackage.price
      }));
      setPayment(created);
      setPaidHandled(false);
      toast.success('Đã tạo mã thanh toán. Hãy chuyển đúng số tiền và đúng nội dung.');
    } catch {
      toast.error('Không tạo được mã thanh toán.');
    } finally {
      setCreating(false);
    }
  }

  function copyPaymentCode() {
    if (!payment) return;
    navigator.clipboard.writeText(payment.paymentCode);
    toast.success('Đã copy nội dung chuyển khoản.');
  }

  async function checkPaymentNow() {
    if (!payment) return;

    setCheckingPayment(true);
    try {
      const latest = await unwrap<PaymentOrder>(api.get(`/payments/status/${payment.paymentCode}`));
      setPayment(latest);

      if (latest.status === 'PAID') {
        const subscription = await unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'));
        setPaidHandled(true);
        setServerSubscription(subscription);
        saveSubscriptionUntil(subscription.expiresAt);
        toast.success('Thanh toán thành công. Tài khoản đã được gia hạn.');
        navigate('/app/lessons');
        return;
      }

      toast.error('Chưa thấy giao dịch. Hãy kiểm tra đúng số tiền và nội dung chuyển khoản.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không kiểm tra được thanh toán.');
    } finally {
      setCheckingPayment(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col justify-between gap-4 bg-brand-600 px-6 py-5 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-100">Aptis Pro Access</p>
            <h1 className="mt-1 text-2xl font-extrabold">Gia hạn tài khoản</h1>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold">
            Hết hạn mới: <span className="text-white">{expireDate}</span>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_330px]">
          <div className="space-y-5 p-6">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand-600">
                <UserCircle2 size={21} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tài khoản</p>
                <p className="truncate font-extrabold text-slate-950">{user?.email ?? 'Tài khoản học viên'}</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <CreditCard size={14} />
                Thông tin thanh toán
              </span>
              <input
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Họ và tên người chuyển khoản"
              />
            </label>

            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <CalendarDays size={14} />
                Chọn gói gia hạn
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((item) => {
                  const selected = selectedPackageId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedPackageId(item.id);
                        setPayment(null);
                        setPaidHandled(false);
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-brand-600 bg-brand-50 ring-4 ring-brand-100'
                          : 'border-slate-200 bg-white hover:border-brand-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-slate-950">{item.label}</p>
                          <p className="mt-1 text-2xl font-extrabold text-brand-600">{formatMoney(item.price)}</p>
                          <p className="text-xs font-semibold text-slate-500">VNĐ</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {item.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <div className="rounded-[22px] bg-white p-5 shadow-soft">
              {payment ? (
                <div className="space-y-4">
                  <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <img className="h-32 w-32 object-contain" src={payment.qrUrl} alt="QR thanh toán" />
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">Số tiền</p>
                    <p className="text-2xl font-extrabold text-brand-700">{formatMoney(payment.amount)} VNĐ</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{payment.bankId} - {payment.accountNo}</p>
                    <p className="text-xs font-bold text-slate-500">{payment.accountName}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">Nội dung chuyển khoản</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="break-all text-sm font-extrabold text-slate-950">{payment.paymentCode}</p>
                      <button type="button" onClick={copyPaymentCode} className="btn-secondary h-9 px-3">
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold ${
                    payment.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {payment.status === 'PAID' ? <CheckCircle2 size={18} /> : <Loader2 className="animate-spin" size={18} />}
                    {payment.status === 'PAID' ? 'Đã thanh toán' : 'Chưa nhận được giao dịch'}
                  </div>
                  <button
                    type="button"
                    onClick={checkPaymentNow}
                    disabled={checkingPayment || payment.status === 'PAID'}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-700 text-sm font-extrabold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkingPayment ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    {checkingPayment ? 'Đang kiểm tra...' : payment.status === 'PAID' ? 'Đã hoàn thành' : 'Tôi đã chuyển khoản'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-green-700">
                    <QrCode size={26} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Gói đã chọn</p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-950">{formatMoney(selectedPackage.price)}</p>
                    <p className="text-sm font-semibold text-slate-500">{selectedPackage.label} - hết hạn {expireDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={createPayment}
                    disabled={creating}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-700 font-extrabold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800 disabled:opacity-60"
                  >
                    {creating ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
                    {creating ? 'Đang tạo mã...' : 'Thanh toán & Gia hạn'}
                  </button>
                </div>
              )}
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 shrink-0" size={14} />
              Sau khi tài khoản nhận tiền, hệ thống sẽ tự xác nhận qua webhook và cộng thời gian học cho bạn.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}
