import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { AuthShell } from './AuthShell';

type VerifyState = 'loading' | 'success' | 'error';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('Đang xác nhận email của bạn...');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setState('error');
      setMessage('Link xác nhận không hợp lệ.');
      return;
    }

    unwrap<void>(api.get('/auth/verify-email', { params: { token } }))
      .then(() => {
        setState('success');
        setMessage('Email đã được xác nhận. Bạn có thể đăng nhập ngay.');
      })
      .catch((error) => {
        setState('error');
        setMessage(error?.response?.data?.message ?? 'Không thể xác nhận email.');
      });
  }, [params]);

  const icon = state === 'loading'
    ? <Loader2 className="animate-spin text-brand-600" size={42} />
    : state === 'success'
      ? <CheckCircle2 className="text-emerald-600" size={42} />
      : <XCircle className="text-red-500" size={42} />;

  return (
    <AuthShell title="Xác nhận email" subtitle="Hoàn tất bước bảo mật trước khi đăng nhập Aptis ESOL.">
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white shadow-sm">{icon}</div>
        <p className="mt-4 text-sm font-semibold text-slate-700">{message}</p>
      </div>
      <Link className="btn-primary mt-5 flex w-full justify-center" to="/login">Về trang đăng nhập</Link>
    </AuthShell>
  );
}
