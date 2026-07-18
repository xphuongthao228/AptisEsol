import { BookOpenCheck, CheckCircle2, Headphones, Mic, PenLine, SpellCheck, Timer } from 'lucide-react';
import type { ReactNode } from 'react';

const skillItems = [
  { label: 'Listening', icon: <Headphones size={18} /> },
  { label: 'Speaking', icon: <Mic size={18} /> },
  { label: 'Writing', icon: <PenLine size={18} /> },
  { label: 'Grammar', icon: <SpellCheck size={18} /> }
];

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <main className="min-h-screen bg-[#f6f8ff] text-slate-950 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-[#172235] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-600" />
        <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-900/30">
            <BookOpenCheck size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Aptis ESOL</p>
            <h1 className="text-2xl font-extrabold">Learning System</h1>
          </div>
        </div>

        <div className="relative max-w-[760px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-blue-100">
            <Timer size={17} /> Luyện thi thông minh
          </div>
          <h2 className="max-w-[720px] text-[42px] font-extrabold leading-[1.12] tracking-normal xl:text-5xl">
            Luyện thi Aptis rõ lộ trình, theo dõi tiến độ từng ngày.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
            Học 4 kỹ năng, luyện theo câu hỏi hoặc bộ đề, xem kết quả và tiến độ trong cùng một hệ thống.
          </p>

          <div className="mt-8 grid max-w-[720px] grid-cols-4 gap-4">
            {skillItems.map((item) => (
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-sm" key={item.label}>
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/12 text-blue-100">{item.icon}</div>
                <p className="text-sm font-bold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            ['5', 'Kỹ năng'],
            ['OTP', 'Xác nhận Gmail'],
            ['24/7', 'Tự học']
          ].map(([value, label]) => (
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4" key={label}>
              <p className="text-2xl font-extrabold">{value}</p>
              <p className="mt-1 text-xs font-semibold text-white/55">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[480px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
              <BookOpenCheck />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Aptis ESOL</p>
              <h1 className="text-xl font-extrabold text-slate-950">Learning System</h1>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-9">
            <div className="mb-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                <CheckCircle2 size={15} /> Bảo mật bằng OTP
              </div>
              <h1 className="text-3xl font-extrabold text-slate-950">{title}</h1>
              <p className="mt-3 leading-7 text-slate-500">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
