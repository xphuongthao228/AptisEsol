import { FormEvent, ReactNode, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Lock, Mail, Monitor, Moon, Save, ShieldCheck, Sun, UserRound, type LucideIcon } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';
import { ThemePreference, useThemePreference } from '../../utils/theme';

const themeOptions: Array<{ value: ThemePreference; label: string; description: string; icon: LucideIcon }> = [
  { value: 'light', label: 'Sáng', description: 'Giao diện nền sáng, dễ nhìn ban ngày.', icon: Sun },
  { value: 'dark', label: 'Tối', description: 'Giao diện nền tối, dịu mắt khi học buổi tối.', icon: Moon },
  { value: 'auto', label: 'Auto', description: 'Tự đổi theo chế độ của thiết bị.', icon: Monitor }
];

export function Settings() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const { preference, resolvedTheme, setPreference } = useThemePreference();

  useEffect(() => {
    setFullName(user?.fullName ?? '');
  }, [user?.fullName]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await unwrap<User>(api.put('/auth/me', { fullName: fullName.trim() }));
      setUser(updated);
      toast.success('Đã cập nhật hồ sơ');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không lưu được hồ sơ');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordSaving(true);
    try {
      await unwrap<void>(api.post('/auth/change-password', { currentPassword, newPassword }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Đã đổi mật khẩu');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Không đổi được mật khẩu');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-brand-100 bg-white shadow-soft">
        <div className="bg-[linear-gradient(135deg,#06204a,#0057d9)] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-200">Tài khoản học viên</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Cài đặt cá nhân</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Quản lý hồ sơ và bảo mật tài khoản của bạn.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/10 p-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-xl font-extrabold">
                {user?.fullName?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{user?.fullName ?? 'Học viên'}</p>
                <p className="truncate text-sm text-slate-300">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
          <SummaryCard icon={<UserRound size={22} />} title="Hồ sơ" text="Tên hiển thị và email." />
          <SummaryCard icon={<ShieldCheck size={22} />} title="Bảo mật" text="Đổi mật khẩu đăng nhập." />
          <SummaryCard
            icon={resolvedTheme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}
            title="Giao diện"
            text={preference === 'auto' ? 'Auto theo thiết bị.' : preference === 'dark' ? 'Đang dùng nền tối.' : 'Đang dùng nền sáng.'}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[24px] border border-brand-100 bg-white p-6 shadow-soft lg:col-span-2">
          <SectionTitle icon={<Monitor size={20} />} title="Giao diện" subtitle="Chọn màu sáng, tối hoặc tự động theo thiết bị của bạn." />

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = preference === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreference(option.value)}
                  className={`flex min-h-[108px] items-start gap-4 rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-soft'
                      : 'border-brand-100 bg-white text-slate-700 hover:border-brand-300 hover:bg-sky-50'
                  }`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand-600 text-white' : 'bg-sky-50 text-brand-600'}`}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-base font-extrabold">{option.label}</span>
                      {active && <Check size={18} className="shrink-0" />}
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <form onSubmit={saveProfile} className="rounded-[24px] border border-brand-100 bg-white p-6 shadow-soft">
          <SectionTitle icon={<UserRound size={20} />} title="Hồ sơ học viên" subtitle="Thông tin hiển thị trên tài khoản của bạn." />

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">Họ tên</span>
              <input className="input h-13 rounded-2xl bg-white" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nhập họ tên" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">Email</span>
              <div className="flex h-13 items-center gap-3 rounded-2xl border border-brand-100 bg-sky-50 px-4 text-slate-600">
                <Mail size={18} />
                <span className="truncate">{user?.email}</span>
              </div>
            </label>
          </div>

          <button className="btn-primary mt-6 h-12 w-full rounded-2xl" disabled={profileSaving}>
            <Save size={18} />
            {profileSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </form>

        <form onSubmit={savePassword} className="rounded-[24px] border border-brand-100 bg-white p-6 shadow-soft">
          <SectionTitle icon={<Lock size={20} />} title="Đổi mật khẩu" subtitle="Dùng mật khẩu mới có ít nhất 6 ký tự." />

          <div className="mt-6 space-y-4">
            <PasswordInput label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordInput label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
            <PasswordInput label="Nhập lại mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} />
          </div>

          <button className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#06204a,#0057d9)] text-sm font-extrabold text-white hover:bg-slate-800" disabled={passwordSaving}>
            <ShieldCheck size={18} />
            {passwordSaving ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 p-5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <div className="min-w-0">
        <h2 className="font-extrabold text-navy">{title}</h2>
        <p className="mt-1 truncate text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <div>
        <h2 className="text-xl font-extrabold text-navy">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-slate-700">{label}</span>
      <input className="input h-12 rounded-2xl bg-white" type="password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} />
    </label>
  );
}
