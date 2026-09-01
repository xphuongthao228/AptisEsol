import {
  Bell,
  BookOpen,
  CalendarPlus,
  Clock3,
  Crown,
  DollarSign,
  FileCheck,
  FileSearch,
  FileText,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  Settings,
  Shield,
  Sun,
  Trophy,
  Upload,
  Users,
  UserRound,
  UserPlus,
  X,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { LingoWidget } from '../components/LingoWidget';
import { NotificationDialog } from '../components/NotificationDialog';
import { SEO, getSeoByPath } from '../components/SEO';
import { communityInviteDismissedKey } from '../pages/student/Dashboard';
import { useAuthStore } from '../store/authStore';
import type { AppNotification, SubscriptionResponse, User } from '../types';
import { ThemePreference, useThemePreference } from '../utils/theme';
import { userHasRole } from '../utils/roles';

type LayoutLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const studentLinks: LayoutLink[] = [
  { to: '/app/mock-tests', label: 'Thi thử', icon: FileCheck },
  { to: '/app/tests/parts', label: 'Luyện tập theo part', icon: BookOpen },
  { to: '/app/lessons', label: 'Bài học', icon: GraduationCap },
  { to: '/app/lessons/LISTENING', label: 'Mẹo thi', icon: Lightbulb },
  { to: '/app/predictions', label: 'Đề Key Dự Đoán', icon: FileSearch },
  { to: '/leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
  { to: '/app/renewal', label: 'Bảng giá', icon: CalendarPlus }
];

const studentMoreLinks: LayoutLink[] = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/app/history', label: 'Lịch sử', icon: Clock3 },
  { to: '/app/donate', label: 'Ủng hộ web', icon: HeartHandshake },
  { to: '/app/contact', label: 'Liên hệ', icon: Mail },
  { to: '/app/settings', label: 'Cài đặt', icon: Settings }
];

const adminLinks: LayoutLink[] = [
  { to: '/admin', label: 'Tổng quan', icon: Shield, end: true },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/content', label: 'Nội dung', icon: BookOpen },
  { to: '/admin/lessons', label: 'Bài học', icon: GraduationCap },
  { to: '/admin/mock-tests', label: 'Thi thử', icon: FileCheck },
  { to: '/admin/leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
  { to: '/admin/predictions', label: 'Dự đoán đề', icon: FileSearch },
  { to: '/admin/revenue', label: 'Doanh thu', icon: DollarSign },
  { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
  { to: '/admin/media', label: 'Media', icon: Upload }
];

const themeOptions: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: 'light', label: 'Màn hình sáng', icon: Sun },
  { value: 'dark', label: 'Màn hình tối', icon: Moon },
  { value: 'auto', label: 'Auto', icon: Monitor }
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const { preference, resolvedTheme, setPreference } = useThemePreference();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = Boolean(user);
  const isAdmin = userHasRole(user, 'ADMIN');
  const mainLinks = isAdmin ? adminLinks : studentLinks;
  const mobileLinks = isAdmin ? adminLinks : [...studentLinks, ...studentMoreLinks];
  const mockScreen = new URLSearchParams(location.search).get('screen');
  const isMockTestMode = !isAdmin
    && location.pathname.startsWith('/app/mock-tests')
    && Boolean(mockScreen)
    && mockScreen !== 'select';
  const isExamMode = !isAdmin && /^\/app\/(tests|exams)\/\d+/.test(location.pathname);
  const seo = getSeoByPath(location.pathname, Boolean(isAdmin));

  useEffect(() => {
    if (!isAuthenticated || isAdmin) {
      setSubscription(null);
      return;
    }

    let mounted = true;
    unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'))
      .then((data) => {
        if (mounted) setSubscription(data);
      })
      .catch(() => {
        if (mounted) setSubscription(null);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isAdmin, user?.accessExpiresAt, user?.proExpiresAt]);

  useEffect(() => {
    setAccountMenuOpen(false);
    setMoreMenuOpen(false);
    setThemeMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      const movedEnough = Math.abs(currentScrollY - lastScrollY) > 8;

      if (!movedEnough) return;

      setNavHidden(currentScrollY > lastScrollY && currentScrollY > 90);
      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen || moreMenuOpen || accountMenuOpen || themeMenuOpen) {
      setNavHidden(false);
    }
  }, [accountMenuOpen, mobileMenuOpen, moreMenuOpen, themeMenuOpen]);

  const signOut = async () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    sessionStorage.removeItem(communityInviteDismissedKey);
    await logout();
    navigate('/');
  };

  if (isMockTestMode || isExamMode) {
    return (
      <>
        <SEO {...seo} />
        <Outlet />
        {!isMockTestMode && <LingoWidget />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 text-navy">
      <SEO {...seo} />

      <header className={`fixed inset-x-0 top-0 z-40 border-b border-brand-100 bg-white/92 shadow-[0_8px_28px_rgba(165,15,21,0.09)] backdrop-blur-xl transition-transform duration-300 ease-out ${navHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
          <Link to={isAdmin ? '/admin' : '/'} className="flex min-w-0 shrink-0 items-center gap-2.5 text-brand-700">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand-100 bg-white shadow-soft">
              <img src="/brand/lingomaster-logo.svg" alt="Aptis Lingo" className="h-7 w-7 rounded-lg" />
            </span>
            <span className="hidden max-w-[130px] truncate text-base font-extrabold tracking-tight xl:inline 2xl:max-w-[170px] 2xl:text-lg">Aptis Lingo</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 pr-1 lg:flex xl:gap-1.5 xl:pr-2 2xl:gap-2.5 2xl:pr-4">
            {mainLinks.map((link) => (
              <TopNavLink key={link.to} link={link} />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {!isAdmin && (
              <div className="hidden items-center xl:flex">
                <div className="relative" ref={moreMenuRef}>
                  <button
                    type="button"
                    className={`grid h-9 w-9 place-items-center rounded-full text-navy transition hover:bg-brand-50 hover:text-brand-700 ${moreMenuOpen ? 'bg-brand-50 text-brand-700' : ''}`}
                    aria-label="Mở menu thêm"
                    aria-expanded={moreMenuOpen}
                    onClick={() => {
                      setMoreMenuOpen((open) => !open);
                      setThemeMenuOpen(false);
                      setAccountMenuOpen(false);
                    }}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {moreMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-brand-100 bg-white p-2 shadow-lift">
                    {studentMoreLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          end={link.end}
                          onClick={() => setMoreMenuOpen(false)}
                          className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-sky-100 hover:text-brand-700'}`}
                        >
                          <Icon size={17} />
                          {link.label}
                        </NavLink>
                      );
                    })}
                  </div>
                  )}
                </div>
              </div>
            )}
            <div className="relative hidden md:block">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full text-navy transition hover:bg-brand-50 hover:text-brand-700"
                aria-label="Chọn giao diện sáng, tối hoặc auto"
                aria-expanded={themeMenuOpen}
                onClick={() => setThemeMenuOpen((open) => !open)}
              >
                {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              {themeMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-brand-100 bg-white p-2 shadow-lift">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = preference === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPreference(option.value);
                          setThemeMenuOpen(false);
                        }}
                        className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-bold transition ${
                          active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-sky-100 hover:text-brand-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={17} />
                          {option.label}
                        </span>
                        {active && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {!isAdmin && (
              <>
              {subscription?.active && <SubscriptionBadge subscription={subscription} />}
              <Link to="/app/renewal" className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#fde047] px-3.5 text-[11px] font-extrabold text-[#3b2400] shadow-[0_10px_24px_rgba(245,158,11,0.24)] transition hover:-translate-y-0.5 hover:shadow-lift 2xl:inline-flex">
                <Crown size={15} />
                Nâng cấp
              </Link>
              </>
            )}
            {isAuthenticated ? (
              <>
                <NotificationBell user={user} hasPaidSubscription={Boolean(subscription?.proActive)} />
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen((open) => !open);
                      setThemeMenuOpen(false);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#9b6f63] text-sm font-extrabold text-white shadow-soft ring-2 ring-white transition hover:scale-105 hover:ring-brand-100"
                    title="Tài khoản"
                    aria-label="Mở menu tài khoản"
                    aria-expanded={accountMenuOpen}
                  >
                    {user?.fullName?.[0]?.toUpperCase() ?? 'B'}
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-brand-100 bg-white p-2 text-left shadow-lift">
                      <div className="border-b border-brand-100 px-3 py-3">
                        <p className="truncate text-sm font-extrabold text-navy">{user?.fullName ?? 'Học viên'}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{user?.email}</p>
                      </div>
                      <Link
                        to={isAdmin ? '/admin' : '/app/settings'}
                        className="mt-2 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        <UserRound size={17} />
                        Profile
                      </Link>
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut size={17} />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold text-navy transition hover:bg-brand-50 hover:text-brand-700">
                  <LogIn size={15} /> Đăng nhập
                </Link>
                <Link to="/register" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs font-extrabold text-white shadow-soft transition hover:bg-brand-700">
                  <UserPlus size={15} /> Đăng ký
                </Link>
              </div>
            )}
            <button
              className="grid h-10 w-10 place-items-center rounded-lg text-brand-700 transition hover:bg-brand-50 lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-brand-100 bg-white px-4 py-3 shadow-soft lg:hidden">
            <nav className="mx-auto grid max-w-[720px] gap-1">
              {mobileLinks.map((link) => (
                <MobileNavLink key={link.to} link={link} onClick={() => setMobileMenuOpen(false)} />
              ))}
              <div className="mt-2 border-t border-brand-100 pt-3">
                <p className="px-3 text-xs font-extrabold uppercase text-slate-500">Giao diện</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = preference === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPreference(option.value)}
                        className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-extrabold transition ${
                          active
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-brand-100 bg-white text-slate-700 hover:bg-sky-100 hover:text-brand-700'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="truncate">{option.value === 'light' ? 'Sáng' : option.value === 'dark' ? 'Tối' : 'Auto'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {subscription?.active && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-700">
                  Còn {subscription.daysLeft} ngày sử dụng
                </div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-brand-100 pt-3 sm:hidden">
                {isAuthenticated ? (
                  <>
                    <Link to={isAdmin ? '/admin' : '/app/settings'} onClick={() => setMobileMenuOpen(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 text-sm font-extrabold text-brand-700">
                      <UserRound size={17} /> Profile
                    </Link>
                    <button onClick={signOut} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 text-sm font-extrabold text-red-600">
                      <LogOut size={17} /> Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 text-sm font-extrabold text-navy">
                      <LogIn size={17} /> Đăng nhập
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-extrabold text-white">
                      <UserPlus size={17} /> Đăng ký
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="min-h-screen pb-20 pt-16">
        <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
      {!isAdmin && <LingoWidget />}
    </div>
  );
}

const notificationLevelStyles = {
  INFO: 'bg-blue-50 text-blue-700',
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  WARNING: 'bg-amber-50 text-amber-700',
  DANGER: 'bg-rose-50 text-rose-700'
};

function SubscriptionBadge({ subscription }: { subscription: SubscriptionResponse }) {
  const date = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const expiresLabel = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    : null;

  return (
    <Link
      to="/app/renewal"
      className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-extrabold text-emerald-700 shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 lg:inline-flex"
      title={expiresLabel ? `Hạn dùng đến ${expiresLabel}` : undefined}
    >
      <Clock3 size={15} />
      Còn {subscription.daysLeft} ngày
    </Link>
  );
}

function NotificationBell({ user, hasPaidSubscription }: { user: User | null; hasPaidSubscription: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<number[]>(() => loadReadNotificationIds(user));
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const isAdmin = userHasRole(user, 'ADMIN');

  useEffect(() => {
    setReadIds(loadReadNotificationIds(user));
  }, [user?.email]);

  useEffect(() => {
    let mounted = true;

    unwrap<AppNotification[]>(api.get('/notifications/public'))
      .then((items) => {
        if (!mounted) return;
        setNotifications(items.filter((item) => {
          if (item.audience === 'ALL') return true;
          if (isAdmin) return item.audience === 'ADMIN';
          if (item.audience === 'STUDENT') return true;
          return item.audience === 'PAID_STUDENT' && hasPaidSubscription;
        }));
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      });

    return () => {
      mounted = false;
    };
  }, [hasPaidSubscription, isAdmin]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !readIds.includes(item.id)).length,
    [notifications, readIds]
  );

  function markAllRead() {
    const nextIds = Array.from(new Set([...readIds, ...notifications.map((item) => item.id)]));
    setReadIds(nextIds);
    saveReadNotificationIds(user, nextIds);
  }

  function openNotification(notification: AppNotification) {
    const nextIds = Array.from(new Set([...readIds, notification.id]));
    setReadIds(nextIds);
    saveReadNotificationIds(user, nextIds);
    setSelectedNotification(notification);
  }

  return (
    <>
    <div className="relative" ref={notificationRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center rounded-full text-navy transition hover:bg-brand-50 hover:text-brand-700"
        aria-label="Thông báo"
        aria-expanded={open}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-2 top-[4.5rem] z-50 w-[min(320px,calc(100vw-1rem))] rounded-2xl border border-brand-100 bg-white text-left shadow-lift sm:absolute sm:right-0 sm:top-full sm:mt-3">
          <div className="flex items-center justify-between border-b border-brand-100 px-3.5 py-3">
            <div>
              <h2 className="text-sm font-extrabold text-navy">Thông báo</h2>
              <p className="text-xs font-semibold text-slate-500">{unreadCount} thông báo chưa đọc</p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-brand-700 transition hover:bg-brand-50"
              >
                Đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto p-2">
            {notifications.length ? notifications.map((notification) => {
              const unread = !readIds.includes(notification.id);
              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  className={`w-full rounded-xl p-3 text-left transition ${unread ? 'bg-brand-50' : 'hover:bg-sky-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${unread ? 'bg-red-600' : 'bg-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        {notification.pinned && (
                          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">Ghim</span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${notificationLevelStyles[notification.level]}`}>
                          {notificationLevelLabel(notification.level)}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-extrabold text-navy">{notification.title}</h3>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-5 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">{formatNotificationDate(notification.createdAt)}</p>
                    </div>
                  </div>
                </button>
              );
            }) : (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-3 text-slate-300" size={32} />
                <p className="text-sm font-bold text-slate-600">Chưa có thông báo mới</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    <NotificationDialog notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
    </>
  );
}

function readNotificationStorageKey(user: User | null) {
  return `aptis-read-notifications:${user?.email ?? 'guest'}`;
}

function loadReadNotificationIds(user: User | null) {
  try {
    const value = window.localStorage.getItem(readNotificationStorageKey(user));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isFinite(id)) : [];
  } catch {
    return [];
  }
}

function saveReadNotificationIds(user: User | null, ids: number[]) {
  window.localStorage.setItem(readNotificationStorageKey(user), JSON.stringify(ids));
}

function notificationLevelLabel(level: AppNotification['level']) {
  const labels = {
    INFO: 'Thông tin',
    SUCCESS: 'Thành công',
    WARNING: 'Cảnh báo',
    DANGER: 'Khẩn cấp'
  };
  return labels[level];
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

function TopNavLink({ link }: { link: LayoutLink }) {
  const location = useLocation();
  const isMockTest = link.to === '/app/mock-tests';
  const isPracticeActive = location.pathname.startsWith('/app/tests');
  const isLeaderboardActive = link.to === '/leaderboard' && (
    location.pathname === '/leaderboard' || location.pathname === '/app/leaderboard'
  );

  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) => {
        const base = 'inline-flex h-10 items-center justify-center whitespace-nowrap text-[13px] font-extrabold transition 2xl:text-sm';
        const active = isActive || isLeaderboardActive || (link.to === '/app/tests/parts' && isPracticeActive);
        if (isMockTest) {
          return `${base} h-11 rounded-2xl border-2 border-brand-600 bg-brand-600 px-3.5 text-[14px] font-black text-white shadow-[0_10px_24px_rgba(215,25,32,0.24)] hover:-translate-y-0.5 hover:border-brand-700 hover:bg-brand-700 hover:shadow-lift 2xl:px-5 2xl:text-[15px] ${active ? 'ring-4 ring-brand-100' : ''}`;
        }
        return `${base} rounded-xl px-2.5 2xl:px-3 ${active ? 'bg-brand-50 text-brand-700 shadow-soft' : 'text-navy hover:bg-brand-50 hover:text-brand-700'}`;
      }}
    >
      {link.label}
    </NavLink>
  );
}

function MobileNavLink({ link, onClick }: { link: LayoutLink; onClick: () => void }) {
  const Icon = link.icon;

  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClick}
      className={({ isActive }) => `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-extrabold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-navy hover:bg-sky-100 hover:text-brand-700'}`}
    >
      <Icon size={18} />
      <span>{link.label}</span>
    </NavLink>
  );
}
