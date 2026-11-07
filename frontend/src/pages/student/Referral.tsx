import { CheckCircle2, ChevronDown, Copy, Gift, Loader2, RefreshCw, UserPlus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useState } from 'react';
import { ReferralWithdrawals } from '../../components/ReferralWithdrawals';
import { CommissionRoadmap } from '../../components/CommissionRoadmap';

type ReferralData = {
  code?: string;
  discountPercent?: unknown;
  commissionPercent?: unknown;
  totalCommission?: unknown;
  commissionOrders?: unknown;
  referredBuyers?: unknown;
  availableCommission?: unknown;
  pendingWithdrawal?: unknown;
  minimumWithdrawal?: unknown;
  recentCommissions?: Array<{ id: number; orderId: number; packageLabel: string; baseAmount: unknown; amount: unknown; createdAt?: string }>;
};

function numberOrNull(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function money(value: unknown) {
  const amount = numberOrNull(value);
  return amount === null ? '—' : `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

export function Referral() {
  const { data, loading, error, reload } = useApi<ReferralData>(() => unwrap(api.get('/payments/referral/me')), []);
  const total = numberOrNull(data?.totalCommission);
  const orders = numberOrNull(data?.commissionOrders);
  const discountPercent = 5;
  const commissionPercent = 5;
  const entries = Array.isArray(data?.recentCommissions) ? data.recentCommissions : [];
  const hasStatistics = total !== null && orders !== null;
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const available = numberOrNull(data?.availableCommission);
  const pending = numberOrNull(data?.pendingWithdrawal);
  const minimum = 60000;
  const canWithdraw = available !== null && available >= minimum && pending === 0;

  async function copyCode() {
    if (!data?.code) return;
    try { await navigator.clipboard.writeText(data.code); toast.success('Đã sao chép mã giới thiệu.'); }
    catch { toast.error('Không sao chép được. Bạn có thể chọn mã và sao chép thủ công.'); }
  }

  return <div className="mx-auto max-w-[1120px] space-y-6 pb-6">
    <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><UserPlus size={25} /></span><div><p className="text-xs font-extrabold uppercase tracking-widest text-brand-600">Cùng học Aptis Lingo</p><h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Mã giới thiệu</h1></div></div>
        <button type="button" onClick={reload} disabled={loading} className="btn-secondary h-10 px-4 text-sm disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Cập nhật</button>
      </div>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">Chia sẻ mã của bạn để người mua được giảm {discountPercent}%. Bạn nhận hoa hồng {commissionPercent}% giá trị đơn sau giảm giá khi thanh toán thành công.</p>
    </section>

    {error ? <section role="alert" className="rounded-2xl border border-red-100 bg-white p-6 text-center"><p className="text-sm text-slate-600">Chưa tải được mã giới thiệu và hoa hồng. Vui lòng thử lại.</p><button type="button" onClick={reload} className="btn-primary mt-4">Thử lại</button></section>
    : loading && !data ? <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl bg-white text-sm text-slate-500"><Loader2 size={20} className="animate-spin" />Đang tải mã giới thiệu…</div>
    : <>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-7">
          <h2 className="text-lg font-extrabold text-navy">Mã giới thiệu của bạn</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Gửi mã này cho bạn bè để nhập vào ô mã giới thiệu khi thanh toán.</p>
          {data?.code ? <><code className="mt-5 block select-all break-all rounded-2xl border border-dashed border-brand-200 bg-brand-50 px-4 py-5 text-base font-extrabold text-brand-700 sm:text-lg">{data.code}</code><button type="button" onClick={copyCode} className="btn-primary mt-4 h-11 px-5"><Copy size={17} />Sao chép mã</button></> : <p className="mt-5 text-sm text-slate-500">Chưa có mã để hiển thị. <button type="button" onClick={reload} className="font-bold text-brand-600 underline">Tải lại</button></p>}
        </section>
        <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-7">
          <div className="flex items-center gap-2 text-brand-600"><Wallet size={21} /><h2 className="font-extrabold text-navy">Hoa hồng tích lũy</h2></div>
          <p className="mt-6 text-3xl font-black text-brand-600" aria-live="polite">{money(data?.totalCommission)}</p>
          <p className="mt-3 text-sm text-slate-500">{orders === null ? 'Chưa tải được số đơn thanh toán.' : `${orders} đơn thanh toán thành công`}</p>
          {!hasStatistics && <p className="mt-4 text-xs leading-6 text-slate-500">Thống kê hoa hồng chưa khả dụng. Bạn vẫn có thể sao chép và chia sẻ mã giới thiệu.</p>}
          <button type="button" disabled={!canWithdraw || loading} onClick={() => setWithdrawalOpen(true)} className="btn-primary mt-5 h-11 px-5 disabled:cursor-not-allowed disabled:opacity-50">Yêu cầu rút</button>
          <p className="mt-2 text-xs leading-6 text-slate-500">{pending !== null && pending > 0 ? 'Bạn có yêu cầu đang chờ admin xử lý.' : available === null ? 'Chưa tải được số dư có thể rút.' : available < minimum ? `Cần đủ ${money(minimum)} hoa hồng khả dụng để yêu cầu rút.` : 'Admin kiểm tra yêu cầu và chuyển khoản vào tài khoản của bạn.'}</p>
        </section>
      </div>

      <CommissionRoadmap referredBuyers={numberOrNull(data?.referredBuyers)} />

      <ReferralWithdrawals open={withdrawalOpen} onClose={() => setWithdrawalOpen(false)} available={available} pending={pending} minimum={minimum} onUpdated={reload} />

      <section className="rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-7">
        <h2 className="text-lg font-extrabold text-navy">Cách nhận hoa hồng</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">{[
          { icon: Copy, title: '1. Chia sẻ mã', description: 'Sao chép mã giới thiệu và gửi cho bạn bè.' },
          { icon: Gift, title: `2. Người mua giảm ${discountPercent}%`, description: 'Người mua nhập mã và áp dụng khi tạo đơn thanh toán.' },
          { icon: CheckCircle2, title: `3. Nhận hoa hồng ${commissionPercent}%`, description: 'Hoa hồng được ghi nhận sau khi đơn thanh toán thành công.' }
        ].map(({ icon: Icon, title, description }) => <article key={title}><Icon size={22} className="text-brand-600" /><h3 className="mt-3 text-sm font-extrabold text-navy">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}</div>
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-7 text-amber-950"><span className="font-extrabold">Lưu ý: </span>Có thể dùng mã cho nhiều lần mua hoặc gia hạn. Mỗi đơn chỉ áp dụng một mã ưu đãi hoặc giới thiệu. Không được sử dụng mã của chính mình.</p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white p-5 shadow-soft sm:p-7">
        <h2 className="text-lg font-extrabold text-navy">Hoa hồng gần đây</h2><p className="mt-1 text-xs text-slate-500">10 đơn gần nhất được ghi nhận hoa hồng</p>
        {entries.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b border-brand-100 text-xs text-slate-500"><th className="py-3 pr-4">Đơn thanh toán</th><th className="py-3 pr-4">Gói học</th><th className="py-3 pr-4 text-right">Giá trị sau giảm</th><th className="py-3 text-right">Hoa hồng</th></tr></thead><tbody>{entries.map(item => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4 font-bold text-navy">#{item.orderId}</td><td className="py-4 pr-4 text-slate-600">{item.packageLabel}</td><td className="py-4 pr-4 text-right text-slate-600">{money(item.baseAmount)}</td><td className="py-4 text-right font-extrabold text-emerald-600">{numberOrNull(item.amount) === null ? '—' : `+${money(item.amount)}`}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-7 text-center text-sm text-slate-500">{hasStatistics ? 'Chưa có hoa hồng được ghi nhận. Chia sẻ mã của bạn để bắt đầu.' : 'Chưa tải được lịch sử hoa hồng.'}</p>}
      </section>
      <details className="group rounded-3xl border border-brand-100 bg-white shadow-soft" aria-labelledby="referral-rules-title">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 sm:p-7 [&::-webkit-details-marker]:hidden">
          <h2 id="referral-rules-title" className="text-lg font-extrabold text-navy">Thể lệ chương trình</h2>
          <ChevronDown size={22} aria-hidden="true" className="shrink-0 text-brand-600 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-700 marker:font-bold marker:text-brand-600">
          <li><strong>Tham gia:</strong> Sử dụng mã giới thiệu được cấp trong tài khoản của bạn và chia sẻ cho người có nhu cầu mua gói học.</li>
          <li><strong>Áp dụng mã:</strong> Người mua cần nhập mã khi tạo đơn thanh toán để nhận ưu đãi giảm {discountPercent}%. Mỗi đơn chỉ áp dụng một mã ưu đãi hoặc giới thiệu. Có thể dùng mã cho các lần mua hoặc gia hạn tiếp theo.</li>
          <li><strong>Ghi nhận hoa hồng:</strong> Hoa hồng được ghi nhận khi đơn có mã giới thiệu của bạn thanh toán thành công, tính trên giá trị đơn sau giảm giá. Đơn chưa thanh toán không được tính hoa hồng.</li>
          <li><strong>Số người giới thiệu:</strong> Chỉ tính người đã thanh toán thành công qua mã của bạn. Một người mua nhiều lần vẫn chỉ được tính là một người; lịch sử hoa hồng hiển thị riêng từng đơn.</li>
          <li><strong>Yêu cầu rút:</strong> Số dư hoa hồng khả dụng cần đạt tối thiểu {money(minimum)}. Mỗi lần chỉ được có một yêu cầu đang chờ xử lý. Bạn cần cung cấp chính xác thông tin ngân hàng để quản trị viên kiểm tra và chuyển khoản.</li>
          <li><strong>Sử dụng trung thực:</strong> Không sử dụng mã của chính mình, giả mạo giao dịch hoặc cung cấp thông tin sai lệch để nhận hoa hồng. Không chia sẻ mật khẩu, mã OTP hoặc thông tin đăng nhập khi giới thiệu.</li>
        </ol>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="referral-disclaimer-title">
          <h3 id="referral-disclaimer-title" className="text-base font-extrabold text-amber-950">Miễn trừ trách nhiệm</h3>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-7 text-amber-950">
            <li>Chương trình không cam kết mức thu nhập hoặc số người mua. Hoa hồng thực tế phụ thuộc vào các giao dịch hợp lệ được hệ thống ghi nhận.</li>
            <li>Việc chia sẻ mã không đồng nghĩa với việc bạn được đại diện cho chương trình để cam kết kết quả học tập, điểm thi hoặc quyền lợi ngoài nội dung được công bố.</li>
            <li>Thông tin thống kê có thể cập nhật chậm khi thanh toán hoặc hệ thống đang được đối soát. Nếu có sai lệch, vui lòng liên hệ quản trị viên và cung cấp mã đơn để được kiểm tra.</li>
            <li>Bạn chịu trách nhiệm kiểm tra mã giới thiệu và thông tin nhận tiền đã cung cấp. Khi phát hiện nhập sai hoặc nghi ngờ tài khoản bị sử dụng trái phép, hãy báo quản trị viên sớm để được hỗ trợ.</li>
            <li>Nội dung này không loại trừ trách nhiệm của đơn vị vận hành đối với lỗi thuộc phạm vi trách nhiệm của mình hoặc hạn chế các quyền hợp pháp của người tham gia.</li>
          </ul>
        </div>
        </div>
      </details>
      <div className="text-center"><Link to="/app/renewal" className="text-sm font-bold text-brand-600 hover:underline">Xem các gói học →</Link></div>
    </>}
  </div>;
}
