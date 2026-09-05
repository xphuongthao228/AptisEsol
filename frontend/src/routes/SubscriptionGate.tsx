import { Crown } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import type { SubscriptionResponse } from '../types';
import { getSubscriptionStatus, saveSubscriptionUntil } from '../utils/subscription';

type SubscriptionGateProps = {
  children: ReactNode;
  requirePro?: boolean;
  testAccess?: boolean;
  proTitle?: string;
  proDescription?: string;
};

const DEFAULT_PRO_TITLE = 'Tính năng dành cho Pro';
const DEFAULT_PRO_DESCRIPTION = 'Tính năng này dành cho thành viên Pro. Nâng cấp tài khoản để mở khóa và tiếp tục luyện tập.';

export function SubscriptionGate({
  children,
  requirePro = false,
  testAccess = false,
  proTitle = DEFAULT_PRO_TITLE,
  proDescription = DEFAULT_PRO_DESCRIPTION
}: SubscriptionGateProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      unwrap<SubscriptionResponse>(api.get('/payments/subscription/me')),
      Promise.resolve([])
    ])
      .then(([subscription]) => {
        if (!mounted) return;
        setCheckFailed(false);
        setAllowed(resolveAccess(subscription, requirePro, testAccess));
        if (subscription.active) saveSubscriptionUntil(subscription.expiresAt);
      })
      .catch(() => {
        if (!mounted) return;
        setCheckFailed(true);
        setAllowed(!requirePro && !testAccess && getSubscriptionStatus().active);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [requirePro, testAccess]);

  if (loading) {
    return (
      <div className="rounded-[18px] border border-brand-100 bg-white p-6 text-sm font-semibold text-slate-600 shadow-soft">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (requirePro) {
    return <ProAccessNotice title={proTitle} description={proDescription} />;
  }

  if (checkFailed) {
    return (
      <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800 shadow-soft">
        Không kiểm tra được quyền truy cập. Vui lòng tải lại trang hoặc thử lại sau.
      </div>
    );
  }

  return <Navigate to="/app/renewal" replace state={{ reason: requirePro ? 'pro-required' : 'expired' }} />;
}

function ProAccessNotice({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[18px] border border-red-200 bg-white px-6 py-12 text-center shadow-soft sm:px-10">
      <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-red-200 bg-red-50 text-red-600">
        <Crown size={34} strokeWidth={2.3} />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-navy">{title}</h1>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">{description}</p>
      <Link
        to="/app/renewal"
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-8 text-sm font-extrabold text-white shadow-soft transition hover:bg-red-700"
      >
        <Crown size={18} />
        Nâng cấp Pro
      </Link>
    </section>
  );
}

function resolveAccess(subscription: SubscriptionResponse, requirePro: boolean, testAccess: boolean) {
  if (subscription.proActive) return true;
  return !requirePro && !testAccess;
}

