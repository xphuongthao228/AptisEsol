import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { RoleName } from '../types';

export function ProtectedRoute({ role }: { role?: RoleName }) {
  const { user, accessToken } = useAuthStore();
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    // Với persisted store, đợi hydrate xong trước khi kết luận là chưa đăng nhập.
    // Điều này tránh trường hợp route mới render sớm hơn sessionStorage và bị đá về /login.
    setHydrated(useAuthStore.persist.hasHydrated());
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-sm font-semibold text-slate-500">
        Đang khôi phục phiên đăng nhập...
      </div>
    );
  }

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (role && !user.roles.includes(role)) {
    return <Navigate to={user.roles.includes('ADMIN') ? '/admin' : '/app'} replace />;
  }

  return <Outlet />;
}