import { ArrowRight, CheckCircle2, Copy, Loader2, QrCode, Sparkles, Star, UserCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { PaymentOrder, SubscriptionResponse } from '../../types';
import { getSubscriptionStatus, saveSubscriptionUntil } from '../../utils/subscription';

const premiumFeatures = [
  'Học cùng giáo viên',
  'Cập nhật đề thường xuyên',
  'Chấm theo AI',
  'AI không giới hạn',
  'Chấm Writing theo AI',
  'Luyện tập theo part đầy đủ',
  'Bộ mẫu tài liệu video',
  'Kho luyện đề phong phú'
];

const packages = [
  {
    id: 'free',
    label: 'Free',
    days: 0,
    price: 0,
    badge: 'Dùng thử',
    description: 'Trải nghiệm miễn phí trước khi nâng cấp.',
    note: '2 đề miễn phí mỗi kỹ năng',
    features: ['Miễn phí 2 đề đầu mỗi kỹ năng', 'Không mở luyện tập theo part', 'Xem kết quả sau khi nộp']
  },
  {
    id: 'week-1',
    label: '1 Tuần',
    days: 7,
    price: 40000,
    badge: 'Khởi động',
    description: 'Trải nghiệm nhanh trước kỳ thi.',
    note: '40.000đ cho 7 ngày',
    priceSuffix: '/tuần',
    features: premiumFeatures
  },
  {
    id: 'week-2',
    label: '2 Tuần',
    days: 14,
    price: 75000,
    badge: 'Linh hoạt',
    description: 'Phù hợp khi cần ôn gấp.',
    note: '75.000đ cho 14 ngày',
    priceSuffix: '/2 tuần',
    saving: '-7%',
    features: premiumFeatures
  },
  {
    id: 'month-1',
    label: '1 Tháng',
    days: 30,
    price: 140000,
    badge: 'Phổ biến',
    description: 'Lộ trình đủ dài để tăng band.',
    note: '140.000đ cho 30 ngày',
    priceSuffix: '/tháng',
    saving: '-20%',
    featured: true,
    features: [...premiumFeatures, 'Nếu không đạt aim học lại free']
  },
  {
    id: 'month-2',
    label: '2 Tháng',
    days: 60,
    price: 250000,
    badge: 'Tốt nhất',
    description: 'Gói tối ưu cho mục tiêu B1-B2.',
    note: '250.000đ cho 60 ngày',
    priceSuffix: '/2 tháng',
    saving: '-34%',
    features: [...premiumFeatures, 'Nếu không đạt aim học lại free']
  }
];

export function Renewal() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [selectedPackageId, setSelectedPackageId] = useState(packages[3].id);
  const [payment, setPayment] = useState<PaymentOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paidHandled, setPaidHandled] = useState(false);
  const [serverSubscription, setServerSubscription] = useState<SubscriptionResponse | null>(null);

  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[3];
  const isFreeSelected = selectedPackage.price === 0;
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
        // Poll quietly while the bank webhook is pending.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [navigate, paidHandled, payment]);

  async function createPayment() {
    if (isFreeSelected) {
      navigate('/app/tests/parts');
      return;
    }

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
    <div className="mx-auto max-w-[1500px] space-y-8">
      <section className="relative overflow-hidden rounded-[24px] border border-brand-100 bg-white px-4 py-7 shadow-soft sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,#eef6ff,transparent)]" />
        <div className="relative text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700 shadow-soft">
            <Sparkles size={15} />
            Aptis Pro Access
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-navy sm:text-4xl">
            Đầu tư cho tương lai với Aptis Lingo
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-700 sm:text-base">
            Chọn gói học phù hợp với lịch ôn thi của bạn. Gói trả phí mở dự đoán đề và đề trọng điểm.
          </p>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((item) => (
            <PlanCard
              key={item.id}
              item={item}
              selected={selectedPackageId === item.id}
              onSelect={() => {
                setSelectedPackageId(item.id);
                setPayment(null);
                setPaidHandled(false);
              }}
            />
          ))}
        </div>

        <div className="relative mt-6 rounded-2xl border border-brand-100 bg-sky-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-soft">
                <UserCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-600">
                  {isFreeSelected ? 'Gói miễn phí' : 'Thông tin thanh toán'}
                </p>
                <p className="mt-1 text-sm font-bold text-navy">
                  {isFreeSelected
                    ? 'Free chỉ mở giới hạn. Nâng cấp để có dự đoán đề và nội dung trọng điểm.'
                    : `${user?.email ?? 'Tài khoản học viên'} - hết hạn mới: ${expireDate}`}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[520px]">
              {!isFreeSelected && (
                <input
                  className="input h-12 rounded-xl"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Họ và tên người chuyển khoản"
                />
              )}
              <button
                type="button"
                onClick={createPayment}
                disabled={creating}
                className={`${isFreeSelected ? 'btn-secondary' : 'btn-primary'} h-12 rounded-xl px-5`}
              >
                {creating ? <Loader2 className="animate-spin" size={18} /> : isFreeSelected ? <ArrowRight size={18} /> : <QrCode size={18} />}
                {creating ? 'Đang tạo mã...' : isFreeSelected ? 'Vào 2 đề miễn phí' : 'Thanh toán'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {payment && (
        <section className="grid gap-6 rounded-[28px] border border-brand-100 bg-white p-5 shadow-soft lg:grid-cols-[300px_1fr_auto] lg:items-center">
          <div className="mx-auto grid h-56 w-56 place-items-center rounded-3xl border border-brand-100 bg-white shadow-soft">
            <img className="h-44 w-44 object-contain" src={payment.qrUrl} alt="QR thanh toán" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-600">Số tiền</p>
              <p className="mt-1 text-3xl font-extrabold text-brand-700">{formatMoney(payment.amount)} VNĐ</p>
              <p className="mt-2 text-sm font-bold text-slate-600">{payment.bankId} - {payment.accountNo}</p>
              <p className="text-sm font-bold text-slate-600">{payment.accountName}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-600">Nội dung chuyển khoản</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="break-all text-base font-extrabold text-navy">{payment.paymentCode}</p>
                <button type="button" onClick={copyPaymentCode} className="btn-secondary h-10 px-3">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold ${
              payment.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {payment.status === 'PAID' ? <CheckCircle2 size={18} /> : <Loader2 className="animate-spin" size={18} />}
              {payment.status === 'PAID' ? 'Đã thanh toán' : 'Đang chờ giao dịch'}
            </div>
            <button
              type="button"
              onClick={checkPaymentNow}
              disabled={checkingPayment || payment.status === 'PAID'}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-5 text-sm font-extrabold text-white shadow-lift transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingPayment ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {checkingPayment ? 'Đang kiểm tra...' : payment.status === 'PAID' ? 'Đã hoàn thành' : 'Tôi đã chuyển khoản'}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[24px] bg-[linear-gradient(135deg,#0057d9,#0b7cff)] p-6 text-center text-white shadow-lift sm:p-8">
        <h2 className="text-3xl font-extrabold">Sẵn sàng chinh phục Aptis</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-brand-100">
          Bắt đầu ngay hôm nay với kho đề luyện tập, đề trọng điểm và lộ trình học rõ ràng.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/app/tests/parts" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50">
            Luyện tập ngay <ArrowRight size={17} />
          </Link>
          <Link to="/app/tests" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-6 text-sm font-extrabold text-white transition hover:bg-white/10">
            Vào luyện tập
          </Link>
        </div>
      </section>
    </div>
  );
}

function PlanCard({ item, selected, onSelect }: {
  item: (typeof packages)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const featured = Boolean(item.featured) && selected;
  const highlighted = featured && selected;
  const isFree = item.price === 0;
  const featureSlots = Math.max(item.features.length, premiumFeatures.length);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative min-w-0 flex min-h-[520px] flex-col rounded-[18px] border bg-white p-4 text-center transition hover:-translate-y-1 hover:shadow-lift lg:p-3 xl:p-4 ${
        highlighted
          ? 'border-red-600 shadow-lift'
          : selected
            ? 'border-brand-500 shadow-lift ring-4 ring-brand-100'
            : 'border-slate-200 shadow-soft'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-red-600 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-lift 2xl:text-[11px]">
          <Star size={12} className="fill-current" />
          Được lựa chọn nhiều nhất
        </span>
      )}

      <div className="flex min-h-[150px] flex-col items-center">
        <div className="flex min-h-[42px] items-center justify-center gap-2">
          <h3 className="text-base font-extrabold text-navy xl:text-lg">{item.label}</h3>
          {item.saving && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
              highlighted ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {item.saving}
            </span>
          )}
        </div>

        <div className="mt-4 flex min-h-[52px] items-end justify-center">
          {isFree ? (
            <p className="text-[25px] font-black leading-none text-navy xl:text-[30px]">Miễn phí</p>
          ) : (
            <p className={`inline-flex items-baseline justify-center whitespace-nowrap text-[22px] font-black leading-none xl:text-[26px] 2xl:text-[31px] ${
              highlighted ? 'text-red-600' : 'text-navy'
            }`}>
              {formatMoney(item.price)}đ
              <span className="ml-1 text-[10px] font-bold text-slate-600 xl:text-xs">{item.priceSuffix}</span>
            </p>
          )}
        </div>

        <p className={`mt-4 inline-flex min-h-[38px] items-center justify-center rounded-full bg-slate-50 px-3 text-[11px] font-extrabold leading-5 xl:px-4 xl:text-xs ${
          highlighted ? 'text-red-600' : 'text-navy'
        }`}>
          {item.note}
        </p>
      </div>

      <div className="mt-5">
        <span className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition ${
          selected
            ? highlighted
              ? 'bg-red-600 text-white'
              : 'bg-brand-600 text-white'
            : 'border border-slate-200 bg-white text-navy group-hover:border-brand-300 group-hover:bg-brand-50'
        }`}>
          {selected ? 'Đang chọn' : isFree ? 'Dùng miễn phí' : featured ? 'Bắt đầu ngay' : 'Chọn gói'}
          <ArrowRight size={16} />
        </span>
      </div>

      <div className={`mt-5 border-t pt-4 ${highlighted ? 'border-red-100' : 'border-slate-200'}`}>
        <div className="space-y-2.5 text-left">
          {Array.from({ length: featureSlots }).map((_, index) => {
            const feature = item.features[index];

            return (
              <div className={`flex min-h-[25px] items-start gap-2 ${feature ? '' : 'invisible'}`} key={feature ?? `empty-${index}`}>
                <CheckCircle2 className={`mt-0.5 shrink-0 ${highlighted ? 'text-red-600' : 'text-emerald-600'}`} size={17} />
                <span className="text-[11px] font-semibold leading-5 text-slate-800 xl:text-xs 2xl:text-[13px]">{feature ?? 'Ưu đãi'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}
