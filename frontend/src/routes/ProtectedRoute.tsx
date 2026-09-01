import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { RoleName, User } from '../types';
import { userHasRole } from '../utils/roles';

export function ProtectedRoute({ role }: { role?: RoleName }) {
  const { user, accessToken, refreshToken, setUser } = useAuthStore();
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
    if (!hydrated || user || !refreshToken || restoreFailed) return;

    let mounted = true;
    setRestoring(true);
    unwrap<User>(api.get('/auth/me'))
      .then((currentUser) => {
        if (mounted) setUser(currentUser);
      })
      .catch(() => {
        if (mounted) setRestoreFailed(true);
      })
      .finally(() => {
        if (mounted) setRestoring(false);
      });

    return () => {
      mounted = false;
    };
  }, [hydrated, refreshToken, restoreFailed, setUser, user]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-sky-50 p-6 text-sm font-semibold text-slate-600">
        Đang khôi phục phiên đăng nhập...
      </div>
    );
  }

  if (restoring) {
    return (
      <div className="min-h-screen bg-sky-50 p-6 text-sm font-semibold text-slate-600">
        Đang làm mới phiên đăng nhập...
      </div>
    );
  }

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (role && !userHasRole(user, role)) {
    return <Navigate to={userHasRole(user, 'ADMIN') ? '/admin' : '/app'} replace />;
  }

  return <Outlet />;
}
