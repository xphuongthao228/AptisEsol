import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { publicApi, unwrap } from '../../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (otpSent) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [otpSent]);

  async function requestOtp(event?: FormEvent) {
    event?.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      const result = await unwrap<{ emailSent: boolean; devOtp: string | null }>(
        publicApi.post('/auth/forgot-password', { email: cleanEmail })
      );
      setDevOtp(result.devOtp);
      if (result.devOtp) setOtp(result.devOtp);
      setOtpSent(true);
      toast.success(result.emailSent ? 'Đã gửi mã OTP về email của bạn.' : 'Mail chưa cấu hình, đã tạo mã OTP test.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không gửi được OTP');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp');
      return;
    }

    setLoading(true);
    try {
      await unwrap<void>(
        publicApi.post('/auth/reset-password', {
          email: email.trim(),
          otp: otp.trim(),
          newPassword
        })
      );
      toast.success('Đặt lại mật khẩu thành công');
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không đặt lại được mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập email tài khoản, nhận mã OTP trong Gmail rồi đặt lại mật khẩu mới."
    >
      {!otpSent ? (
        <form onSubmit={requestOtp} className="space-y-5" autoComplete="off">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-sky-100 text-slate-600">
                <Mail size={18} />
              </span>
              <input
                className="input h-14 rounded-2xl !pl-16 text-base"
                type="email"
                name="aptis-forgot-email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Nhập email đã đăng ký"
                required
              />
            </div>
          </label>
          <button className="btn-primary h-14 w-full rounded-2xl text-base" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi mã OTP'} {!loading && <ArrowRight size={19} />}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-5" autoComplete="off">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            Mã OTP đã được gửi đến <span className="font-extrabold">{email.trim()}</span>.
          </div>
          {devOtp && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
              Mail chưa cấu hình trên máy này. Dùng mã OTP test: <span className="text-lg font-extrabold tracking-[0.18em] text-navy">{devOtp}</span>
            </div>
          )}
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Mã OTP</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-sky-100 text-slate-600">
                <ShieldCheck size={18} />
              </span>
              <input
                className="input h-14 rounded-2xl !pl-16 text-base tracking-[0.25em]"
                name="aptis-reset-otp"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Mật khẩu mới</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-sky-100 text-slate-600">
                <KeyRound size={18} />
              </span>
              <input
                className="input h-14 rounded-2xl !pl-16 text-base"
                type="password"
                name="aptis-reset-new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                minLength={6}
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Nhập lại mật khẩu mới</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-sky-100 text-slate-600">
                <KeyRound size={18} />
              </span>
              <input
                className="input h-14 rounded-2xl !pl-16 text-base"
                type="password"
                name="aptis-reset-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                minLength={6}
                required
              />
            </div>
          </label>
          <button className="btn-primary h-14 w-full rounded-2xl text-base" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'} {!loading && <ArrowRight size={19} />}
          </button>
          <button
            className="h-11 w-full rounded-2xl border border-brand-200 font-extrabold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={() => requestOtp()}
          >
            {loading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
          </button>
          <button
            className="h-11 w-full rounded-2xl border border-brand-100 font-bold text-slate-700 hover:bg-sky-50"
            type="button"
            disabled={loading}
            onClick={() => {
              setDevOtp(null);
              setOtpSent(false);
            }}
          >
            Đổi email khác
          </button>
        </form>
      )}

      <p className="mt-7 text-center text-sm text-slate-600">
        <Link className="inline-flex items-center gap-2 font-extrabold text-brand-600 hover:text-brand-700" to="/login">
          <ArrowLeft size={16} /> Quay lại đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
