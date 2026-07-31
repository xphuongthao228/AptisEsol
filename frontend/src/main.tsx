import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { RouterProvider } from 'react-router-dom';
import { api, unwrap } from './api/client';
import { router } from './routes/router';
import './styles.css';
import type { HeartbeatResponse } from './types';
import { useAuthStore } from './store/authStore';

const VISITOR_ID_KEY = 'aptis-esol-visitor-id';

function OnlineHeartbeat() {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    const ping = async () => {
      if (document.visibilityState === 'hidden') return;
      const visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
      const response = await unwrap<HeartbeatResponse>(api.post('/auth/heartbeat', { visitorId }));
      window.localStorage.setItem(VISITOR_ID_KEY, response.visitorId);
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
  }, [accessToken]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OnlineHeartbeat />
    <RouterProvider router={router} />
    <Toaster position="top-right" />
  </React.StrictMode>
);
