import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import type { SubscriptionResponse } from '../types';
import { saveSubscriptionUntil } from '../utils/subscription';

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'))
      .then((subscription) => {
        if (!mounted) return;
        setAllowed(subscription.active);
        if (subscription.active) saveSubscriptionUntil(subscription.expiresAt);
      })
      .catch(() => {
        if (mounted) setAllowed(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-[18px] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-soft">
        Đang kiểm tra thời hạn học miễn phí...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/app/renewal" replace state={{ reason: 'expired' }} />;
  }

  return <>{children}</>;
}
