import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { AuthResponse, User } from '../../types';
import { userHasRole } from '../../utils/roles';

export function OAuth2Callback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function restoreGoogleSession() {
      try {
        // OAuth sets HttpOnly cookies before redirecting here. Retry once so
        // browsers have time to make the cookie available to the first XHR.
        let auth: AuthResponse | null = null;
        for (let attempt = 0; attempt < 2 && !auth; attempt += 1) {
          try {
            auth = await unwrap<AuthResponse>(api.get('/auth/session', {
              params: { t: Date.now() },
              withCredentials: true
            }));
          } catch {
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 250));
            }
          }
        }

        if (auth) {
          setAuth(auth);
          navigate(userHasRole(auth.user, 'ADMIN') ? '/admin' : '/', { replace: true });
          return;
        }

        // The access cookie is enough to identify the user even if rotating
        // the token pair fails during the callback request.
        const user = await unwrap<User>(api.get('/auth/me', {
          params: { t: Date.now() },
          withCredentials: true
        }));
        useAuthStore.getState().setUser(user);
        navigate(userHasRole(user, 'ADMIN') ? '/admin' : '/', { replace: true });
      } catch (requestError) {
        if (!mounted) return;
        const message = requestError instanceof Error && requestError.message
          ? requestError.message
          : 'Không thể hoàn tất phiên đăng nhập Google. Vui lòng thử lại.';
        setError(message);
      }
    }

    void restoreGoogleSession();
    return () => {
      mounted = false;
    };
  }, [navigate, setAuth]);

  if (error) {
    return <div className="min-h-screen grid place-items-center p-6 text-center text-red-600">{error}</div>;
  }
  return <div className="min-h-screen grid place-items-center p-6 text-slate-600">Đang hoàn tất đăng nhập...</div>;
}
