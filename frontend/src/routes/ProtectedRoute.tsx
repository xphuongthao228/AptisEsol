import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { RoleName, User } from '../types';
import { userHasRole } from '../utils/roles';

const SESSION_VERIFY_TIMEOUT_MS = 8000;

export function ProtectedRoute({ role }: { role?: RoleName }) {
  const { user, accessToken, refreshToken, setUser, clearAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const [restoring, setRestoring] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);

  useEffect(() => {
    // Với persisted store, đợi hydrate xong trước khi kết luận là chưa đăng nhập.
    // Điều này tránh trường hợp route mới render sớm hơn sessionStorage và bị đá về /login.
    setHydrated(useAuthStore.persist.hasHydrated());
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated || restoreFailed) return;
    if (user || (!accessToken && !refreshToken)) return;

    let mounted = true;
    setRestoring(true);
    Promise.race([
      unwrap<User>(api.get('/auth/me')),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('session-verify-timeout')), SESSION_VERIFY_TIMEOUT_MS);
      })
    ])
      .then((currentUser) => {
        if (mounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (mounted) {
          clearAuth();
          setRestoreFailed(true);
        }
      })
      .finally(() => {
        if (mounted) setRestoring(false);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, clearAuth, hydrated, refreshToken, restoreFailed, setUser, user]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-sky-50 p-6 text-sm font-semibold text-slate-600">
        Đang khôi phục phiên đăng nhập...
      </div>
    );
  }

  if (restoring || (!user && Boolean(accessToken || refreshToken) && !restoreFailed)) {
    return (
      <div className="min-h-screen bg-sky-50 p-6 text-sm font-semibold text-slate-600">
        Đang làm mới phiên đăng nhập...
      </div>
    );
  }

  // OAuth stores the JWT in an HttpOnly cookie, so the browser can have a
  // valid authenticated user even when no token is available in localStorage.
  if (!user) return <Navigate to="/login" replace />;
  if (role && !userHasRole(user, role)) {
    return <Navigate to={userHasRole(user, 'ADMIN') ? '/admin' : '/app'} replace />;
  }

  return <Outlet />;
}
