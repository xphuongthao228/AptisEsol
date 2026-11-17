import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import toast, { Toaster } from 'react-hot-toast';
import { RouterProvider } from 'react-router-dom';
import { api, unwrap } from './api/client';
import { router } from './routes/router';
import { registerServiceWorker } from './pwa';
import './styles.css';
import './mobile.css';
import './student-night.css';
import type { HeartbeatResponse } from './types';
import { useAuthStore } from './store/authStore';
import { applyThemePreference } from './utils/theme';

const VISITOR_ID_KEY = 'aptis-esol-visitor-id';

applyThemePreference();
registerServiceWorker();

function OnlineHeartbeat() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const onSessionReplaced = () => {
      void router.navigate('/login', { replace: true });
      toast.error('Tài khoản đã đăng nhập trên thiết bị khác. Thiết bị này đã được đăng xuất.', {
        id: 'session-replaced',
        duration: 6000
      });
    };
    window.addEventListener('aptis:session-replaced', onSessionReplaced);
    return () => window.removeEventListener('aptis:session-replaced', onSessionReplaced);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let checking = false;
    const checkSession = async () => {
      if (document.visibilityState === 'hidden' || checking) return;
      checking = true;
      try {
        await api.get('/auth/me');
      } catch {
        // The API interceptor handles replaced sessions. Network errors can retry.
      } finally {
        checking = false;
      }
    };
    void checkSession();
    const timer = window.setInterval(checkSession, 5000);
    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', checkSession);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', checkSession);
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const ping = async () => {
      if (document.visibilityState === 'hidden') return;
      const visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
      const response = await unwrap<HeartbeatResponse>(api.post('/auth/heartbeat', { visitorId }));
      window.localStorage.setItem(VISITOR_ID_KEY, response.visitorId);
      if (response.user && useAuthStore.getState().accessToken === accessToken) setUser(response.user);
    };

    ping().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      ping().catch(() => undefined);
    }, 30_000);
    window.addEventListener('focus', ping);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', ping);
    };
  }, [accessToken, setUser]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OnlineHeartbeat />
    <Suspense fallback={<div role="status" className="p-8 text-center">Đang tải trang...</div>}><RouterProvider router={router} /></Suspense>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          width: 'min(420px, calc(100vw - 32px))',
          maxWidth: 'calc(100vw - 32px)',
          overflowWrap: 'anywhere'
        }
      }}
    />
  </React.StrictMode>
);

