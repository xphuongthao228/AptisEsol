import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { RoleName } from '../types';

export function ProtectedRoute({ role }: { role?: RoleName }) {
  const { user, accessToken } = useAuthStore();
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (role && !user.roles.includes(role)) return <Navigate to={user.roles.includes('ADMIN') ? '/admin' : '/app'} replace />;
  return <Outlet />;
}
