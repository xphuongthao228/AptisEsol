import { ArrowRight, Bell, BookOpen, FileAudio, GraduationCap, Plus, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Skill, Test, User } from '../../types';

export function AdminDashboard() {
  const { data: users, loading: usersLoading } = useApi<User[]>(() => unwrap(api.get('/users')), []);
  const { data: tests, loading: testsLoading } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const { data: skills, loading: skillsLoading } = useApi<Skill[]>(() => unwrap(api.get('/skills')), []);

  const publishedTests = (tests ?? []).filter((test) => test.status === 'PUBLISHED').length;
  const loading = usersLoading || testsLoading || skillsLoading;

  const cards = [
    { label: 'Nguoi dung', value: users?.length ?? 0, icon: Users, tone: 'bg-blue-50 text-brand-700' },
    { label: 'Bai luyen', value: tests?.length ?? 0, icon: BookOpen, tone: 'bg-green-50 text-green-700' },
    { label: 'Ky nang', value: skills?.length ?? 0, icon: GraduationCap, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Dang hien', value: publishedTests, icon: Bell, tone: 'bg-amber-50 text-amber-700' }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] bg-slate-950 p-8 text-white">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-blue-200">Admin Control Center</p>
            <h1 className="mt-3 text-3xl font-extrabold">Bang dieu khien quan tri</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Quan ly hoc vien, bai hoc, noi dung luyen thi, media va thong bao trong cung mot man hinh.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/content" className="btn-primary"><Plus size={18} />Tao bai luyen</Link>
            <Link to="/admin/lessons" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">
              <GraduationCap size={18} />Quan ly bai hoc
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div className="card p-5" key={label}>
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon /></div>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-extrabold">{loading ? '...' : value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Bai luyen gan day</h2>
            <Link to="/admin/content" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600">
              Quan ly <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {(tests ?? []).slice(0, 6).map((test) => (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4" key={test.id}>
                <div>
                  <p className="text-xs font-bold uppercase text-brand-600">{test.skillName} | {test.status}</p>
                  <h3 className="mt-1 font-bold">{test.title}</h3>
                  <p className="text-sm text-slate-500">{test.durationMinutes} phut</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">#{test.id}</span>
              </div>
            ))}
            {!tests?.length && (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                Chua co bai luyen nao.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Tac vu nhanh</h2>
            <div className="mt-4 space-y-3">
              <QuickLink to="/admin/lessons" icon={<GraduationCap size={20} />} title="Quan ly bai hoc" text="Tao bai hoc, tai lieu va noi dung hoc tap." />
              <QuickLink to="/admin/content" icon={<BookOpen size={20} />} title="Quan ly cau hoi" text="Them bai luyen, cau hoi va dap an." />
              <QuickLink to="/admin/media" icon={<FileAudio size={20} />} title="Upload media" text="Quan ly anh, audio va file noi dung." />
              <QuickLink to="/admin/notifications" icon={<Bell size={20} />} title="Thong bao" text="Gui thong bao den hoc vien." />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Nguoi dung moi</h2>
            <div className="mt-4 space-y-3">
              {(users ?? []).slice(0, 5).map((user) => (
                <div className="flex items-center gap-3" key={user.id}>
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
                    {user.fullName?.[0] ?? user.email[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              ))}
              {!users?.length && <p className="text-sm font-semibold text-slate-500">Chua co nguoi dung.</p>}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function QuickLink({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700 shadow-soft">{icon}</div>
      <div>
        <p className="font-extrabold text-slate-900">{title}</p>
        <p className="text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </Link>
  );
}
