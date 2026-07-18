import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { useAuthStore } from '../../store/authStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Đăng nhập thành công');
      const nextUser = useAuthStore.getState().user ?? user;
      navigate(nextUser?.roles.includes('ADMIN') ? '/admin' : '/app');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Đăng nhập" subtitle="Tiếp tục luyện thi với tài khoản học viên hoặc quản trị viên của bạn.">
      <form onSubmit={submit} className="space-y-5" autoComplete="off">
        <input className="hidden" type="text" name="fake-user-name" autoComplete="username" tabIndex={-1} />
        <input className="hidden" type="password" name="fake-password" autoComplete="current-password" tabIndex={-1} />
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <Mail size={18} />
            </span>
            <input
              className="input h-14 rounded-2xl !pl-16 text-base"
              name="aptis-login-email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Mật khẩu</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <LockKeyhole size={18} />
            </span>
            <input
              className="input h-14 rounded-2xl !pl-16 text-base"
              type="password"
              name="aptis-login-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />
          </div>
        </label>
        <div className="-mt-2 text-right">
          <Link className="text-sm font-extrabold text-brand-600 hover:text-brand-700" to="/forgot-password">
            Quen mat khau?
          </Link>
        </div>
        <button className="btn-primary h-14 w-full rounded-2xl text-base" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng nhập'} {!loading && <ArrowRight size={19} />}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        Chưa có tài khoản? <Link className="font-extrabold text-brand-600 hover:text-brand-700" to="/register">Đăng ký</Link>
      </p>
    </AuthShell>
  );
}
