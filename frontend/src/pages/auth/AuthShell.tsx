import {
  CheckCircle2,
  Headphones,
  Mic,
  PenLine,
  SpellCheck,
  Timer
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/SEO';

const skillItems = [
  { label: 'Listening', icon: <Headphones size={18} /> },
  { label: 'Speaking', icon: <Mic size={18} /> },
  { label: 'Writing', icon: <PenLine size={18} /> },
  { label: 'Grammar', icon: <SpellCheck size={18} /> }
];

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f6faff,#eef6ff_48%,#ffffff)] text-navy">
      <SEO title={title} description={subtitle} robots="noindex, nofollow" />
      <main className="lg:grid lg:min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(135deg,#06204a,#0057d9)] px-10 py-8 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-100" />
          <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-white/14 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

          <Link to="/" className="relative flex items-center gap-4 transition hover:opacity-90">
            <img src="/brand/lingomaster-logo.svg" alt="LingoMaster" className="h-14 w-14 rounded-2xl shadow-lift shadow-brand-900/30" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Aptis ESOL</p>
              <h1 className="text-2xl font-extrabold">Learning System</h1>
            </div>
          </Link>

          <div className="relative mt-12 max-w-[680px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-extrabold text-brand-100">
              <Timer size={17} /> Luyện thi thông minh
            </div>
            <h2 className="max-w-[680px] text-[34px] font-extrabold leading-[1.12] tracking-normal xl:text-[42px]">
              Luyện thi Aptis rõ lộ trình, theo dõi tiến độ từng ngày.
            </h2>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-100">
              Học 4 kỹ năng, luyện theo part, xem kết quả và tiến độ trong cùng một hệ thống.
            </p>

            <div className="mt-7 grid max-w-[620px] grid-cols-4 gap-3">
              {skillItems.map((item) => (
                <div className="rounded-2xl border border-white/16 bg-white/12 p-4 shadow-soft backdrop-blur" key={item.label}>
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/12 text-blue-100">{item.icon}</div>
                  <p className="text-sm font-bold">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-10 grid grid-cols-3 gap-3">
            {[
              ['5', 'Kỹ năng'],
              ['OTP', 'Xác nhận Gmail'],
              ['24/7', 'Tự học']
            ].map(([value, label]) => (
              <div className="rounded-2xl border border-white/16 bg-white/12 p-4 shadow-soft backdrop-blur" key={label}>
                <p className="text-2xl font-extrabold">{value}</p>
                <p className="mt-1 text-xs font-semibold text-white/55">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8">
          <div className="w-full max-w-[480px]">
            <Link to="/" className="mb-8 flex items-center gap-3 transition hover:opacity-90 lg:hidden">
              <img src="/brand/lingomaster-logo.svg" alt="LingoMaster" className="h-12 w-12 rounded-2xl shadow-lift shadow-brand-200" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Aptis ESOL</p>
                <h1 className="text-xl font-extrabold text-navy">Learning System</h1>
              </div>
            </Link>

            <div className="rounded-[28px] border border-brand-100 bg-white p-7 shadow-lift sm:p-9">
              <div className="mb-7">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                  <CheckCircle2 size={15} /> Bảo mật bằng OTP
                </div>
                <h1 className="text-3xl font-extrabold text-navy">{title}</h1>
                <p className="mt-3 leading-7 text-slate-600">{subtitle}</p>
              </div>
              {children}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
