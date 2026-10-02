import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';
import { userHasRole } from '../../utils/roles';

export function OAuth2Callback() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    unwrap<User>(api.get('/auth/me'))
      .then((user) => {
        setUser(user);
        navigate(userHasRole(user, 'ADMIN') ? '/admin' : '/', { replace: true });
      })
      .catch(() => setError('Không thể hoàn tất phiên đăng nhập Google. Vui lòng thử lại.'));
  }, [navigate, setUser]);

  if (error) {
    return <div className="min-h-screen grid place-items-center p-6 text-center text-red-600">{error}</div>;
  }
  return <div className="min-h-screen grid place-items-center p-6 text-slate-600">Đang hoàn tất đăng nhập...</div>;
}
