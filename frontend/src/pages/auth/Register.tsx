import { FormEvent, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { AuthShell } from './AuthShell';

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  async function submitRegister(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await register(fullName, email, password);
      setStep('otp');
      toast.success('Đã gửi mã OTP về Gmail/email của bạn.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không thể gửi mã OTP');
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await unwrap<void>(api.post('/auth/verify-registration-otp', { email, otp }));
      toast.success('Đăng ký thành công. Bạn có thể đăng nhập.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Mã OTP không đúng');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      await unwrap<void>(api.post('/auth/resend-verification', { email }));
      toast.success('Đã gửi lại mã OTP.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={step === 'form' ? 'Tạo tài khoản' : 'Xác nhận OTP'}
      subtitle={step === 'form'
        ? 'Nhập thông tin đăng ký. Hệ thống sẽ gửi mã OTP về Gmail/email của bạn.'
        : `Mã OTP đã được gửi tới ${email}. Nhập đủ 6 số để kích hoạt tài khoản.`}
    >
      {step === 'form' ? (
        <form onSubmit={submitRegister} className="space-y-5">
          <AuthInput icon={<UserRound size={19} />} label="Họ tên" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" />
          <AuthInput icon={<Mail size={19} />} label="Gmail hoặc email" value={email} onChange={setEmail} placeholder="you@gmail.com" />
          <AuthInput icon={<LockKeyhole size={19} />} label="Mật khẩu" value={password} onChange={setPassword} placeholder="Tối thiểu 6 ký tự" type="password" />
          <button className="btn-primary h-14 w-full rounded-2xl text-base" disabled={loading}>
            {loading ? 'Đang gửi OTP...' : 'Gửi mã OTP'} {!loading && <ArrowRight size={19} />}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="space-y-5">
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm font-semibold leading-6 text-brand-800">
            Kiểm tra Gmail, Spam hoặc Quảng cáo nếu chưa thấy mã OTP.
          </div>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><KeyRound size={17} /> Mã OTP</span>
            <input
              className="input h-16 rounded-2xl text-center text-3xl font-extrabold tracking-[0.35em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
            />
          </label>
          <button className="btn-primary h-14 w-full rounded-2xl text-base" disabled={loading || otp.length !== 6}>
            {loading ? 'Đang xác nhận...' : 'Xác nhận OTP'}
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="btn-secondary h-12 rounded-2xl" disabled={loading} onClick={resendOtp} type="button">Gửi lại mã</button>
            <button className="btn-secondary h-12 rounded-2xl" onClick={() => setStep('form')} type="button">Đổi thông tin</button>
          </div>
        </form>
      )}
      <p className="mt-7 text-center text-sm text-slate-500">
        Đã có tài khoản? <Link className="font-extrabold text-brand-600 hover:text-brand-700" to="/login">Đăng nhập</Link>
      </p>
    </AuthShell>
  );
}

function AuthInput({ icon, label, value, onChange, placeholder, type = 'text' }: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-slate-100 text-slate-500">{icon}</span>
        <input className="input h-14 rounded-2xl !pl-16 text-base" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}
