import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import type { SubscriptionResponse } from '../types';
import { getSubscriptionStatus, saveSubscriptionUntil } from '../utils/subscription';

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'))
      .then((subscription) => {
        if (!mounted) return;
        setCheckFailed(false);
        setAllowed(subscription.active);
        if (subscription.active) saveSubscriptionUntil(subscription.expiresAt);
      })
      .catch(() => {
        if (!mounted) return;
        setCheckFailed(true);
        setAllowed(getSubscriptionStatus().active);
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

  if (allowed) {
    return <>{children}</>;
  }

  if (checkFailed) {
    return (
      <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800 shadow-soft">
        Không kiểm tra được thời hạn học. Vui lòng tải lại trang hoặc thử lại sau.
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/app/renewal" replace state={{ reason: 'expired' }} />;
  }

  return null;
}
