import {
  Bell,
  BookOpen,
  CalendarPlus,
  DollarSign,
  FileSearch,
  FileText,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  Shield,
  Upload,
  Users,
  X,
  type LucideIcon
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SEO, getSeoByPath } from '../components/SEO';
import { useAuthStore } from '../store/authStore';

type LayoutLink = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const studentLinks: LayoutLink[] = [
  { to: '/app', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/app/lessons', label: 'Bài học', icon: GraduationCap },
  { to: '/app/tests', label: 'Luyện tập', icon: BookOpen },
  { to: '/app/exams', label: 'Đề thi', icon: FileText },
  { to: '/app/predictions', label: 'Dự đoán đề', icon: FileSearch },
  { to: '/app/renewal', label: 'Gia hạn', icon: CalendarPlus },
  { to: '/app/donate', label: 'Ủng hộ web', icon: HeartHandshake },
  { to: '/app/contact', label: 'Liên hệ', icon: Mail },
  { to: '/app/settings', label: 'Cài đặt', icon: Settings }
];

const adminLinks: LayoutLink[] = [
  { to: '/admin', label: 'Tổng quan', icon: Shield },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/content', label: 'Nội dung', icon: BookOpen },
  { to: '/admin/lessons', label: 'Bài học', icon: GraduationCap },
  { to: '/admin/predictions', label: 'Dự đoán đề', icon: FileSearch },
  { to: '/admin/revenue', label: 'Doanh thu', icon: DollarSign },
  { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
  { to: '/admin/media', label: 'Media', icon: Upload }
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.roles.includes('ADMIN');
  const links = isAdmin ? adminLinks : studentLinks;
  const isExamMode = !isAdmin && /^\/app\/(tests|exams)\/\d+/.test(location.pathname);
  const seo = getSeoByPath(location.pathname, Boolean(isAdmin));

  const signOut = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  if (isExamMode) {
    return (
      <>
        <SEO {...seo} />
        <Outlet />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f7fc]">
        <SEO {...seo} />
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col overflow-hidden bg-[#1e293b] text-white xl:flex">
          <div className="px-6 py-6">
            <h1 className="text-2xl font-extrabold tracking-tight">English Prep</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Chế độ ôn thi</p>
          </div>
          <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {studentLinks.map(({ to, label, icon: Icon }, index) => (
              <NavLink
                key={`${label}-${index}`}
                to={to}
                end={label === 'Tổng quan'}
                className={({ isActive }) => `flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-white/80 hover:bg-[#334155] hover:text-white'}`}
              >
                <Icon className="shrink-0" size={22} />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="shrink-0 border-t border-slate-700/60 p-4">
            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-center text-xs font-bold text-white">Aptis Pro Access</p>
              <Link to="/app/renewal" className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white hover:bg-brand-700">Nâng cấp Pro</Link>
            </div>
            <Link to="/app/contact" className="flex h-10 items-center gap-3 rounded-lg px-4 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><HelpCircle size={20} />Trợ giúp</Link>
            <button onClick={signOut} className="flex h-10 w-full items-center gap-3 rounded-lg px-4 text-sm text-red-300 hover:bg-white/10 hover:text-red-200">
              <LogOut size={20} />Đăng xuất
            </button>
          </div>
        </aside>

        <header className="fixed right-0 top-0 z-30 h-16 border-b border-slate-200 bg-white xl:left-[260px]">
          <div className="flex h-16 items-center justify-between px-4 xl:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 xl:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Mở menu"><Menu size={22} /></button>
              <div className="text-xl font-extrabold text-brand-600">LingoMaster</div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <p className="hidden truncate text-sm italic text-slate-500 sm:block">Aptis Keys - Học thông minh</p>
            </div>
            <div className="hidden w-full max-w-[340px] items-center gap-2 rounded-full border border-slate-200 bg-[#f7f7fc] px-4 py-2 text-slate-400 md:flex">
              <Search size={18} />
              <span className="text-sm">Tìm kiếm bài học...</span>
            </div>
            <div className="flex items-center gap-4">
              <Bell size={21} className="text-slate-600" />
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">{user?.fullName?.[0] ?? 'L'}</div>
                <span className="hidden text-sm font-semibold text-slate-800 sm:inline">{user?.fullName ?? 'Học viên'}</span>
              </div>
            </div>
          </div>
        </header>
        <MobileDrawer links={links} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onSignOut={signOut} isAdmin={Boolean(isAdmin)} />
        <main className="min-h-screen pb-24 pt-16 xl:ml-[260px]">
          <div className="mx-auto max-w-[1200px] px-3 py-5 sm:px-4 sm:py-8 xl:px-8">
            <Outlet />
          </div>
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white p-2 lg:hidden">
          {studentLinks.slice(0, 3).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={label === 'Tổng quan'} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <SEO {...seo} />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slatePanel px-4 py-5 text-white lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 font-bold">A</div>
          <div>
            <p className="text-sm text-white/70">Aptis ESOL</p>
            <h1 className="text-lg font-semibold">Practice Hub</h1>
          </div>
        </div>
        <nav className="space-y-2 overflow-hidden">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={label === 'Tổng quan'} className={({ isActive }) => `flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? 'bg-white/14 text-white' : 'text-white/72 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="shrink-0" size={20} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={signOut} className="absolute bottom-5 left-4 right-4 flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/72 hover:bg-white/10">
          <LogOut size={20} /> Đăng xuất
        </button>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:ml-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Mở menu"><Menu size={20} /></button>
            <div>
              <p className="text-xs font-medium uppercase text-brand-600">Xin chào</p>
              <h2 className="text-lg font-semibold text-slate-900">{user?.fullName ?? 'Learner'}</h2>
            </div>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{isAdmin ? 'ADMIN' : 'STUDENT'}</span>
        </div>
      </header>
      <MobileDrawer links={links} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onSignOut={signOut} isAdmin={Boolean(isAdmin)} />

      <main className="pb-24 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white p-2 lg:hidden">
        {links.slice(0, 3).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={label === 'Tổng quan'} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function MobileDrawer({ links, open, onClose, onSignOut, isAdmin }: {
  links: LayoutLink[];
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className={`fixed inset-0 z-50 xl:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-slate-950/45 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-[#1e293b] p-4 text-white shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-white/55">{isAdmin ? 'Admin' : 'English Prep'}</p>
            <h2 className="text-lg font-extrabold">LingoMaster</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-lg text-white/80 hover:bg-white/10" onClick={onClose} aria-label="Đóng menu">
            <X size={21} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app' || to === '/admin'}
              onClick={onClose}
              className={({ isActive }) => `flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? 'bg-brand-600 text-white' : 'text-white/78 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="shrink-0" size={21} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={onSignOut} className="mt-4 flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-200 hover:bg-white/10">
          <LogOut size={20} /> Đăng xuất
        </button>
      </aside>
    </div>
  );
}
