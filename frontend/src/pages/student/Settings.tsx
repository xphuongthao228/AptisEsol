import { FormEvent, ReactNode, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

export function Settings() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

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
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 px-6 py-7 text-white sm:px-8">
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

        <div className="grid gap-0 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
          <SummaryCard icon={<UserRound size={22} />} title="Hồ sơ" text="Tên hiển thị và email." />
          <SummaryCard icon={<ShieldCheck size={22} />} title="Bảo mật" text="Đổi mật khẩu đăng nhập." />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={<UserRound size={20} />} title="Hồ sơ học viên" subtitle="Thông tin hiển thị trên tài khoản của bạn." />

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">Họ tên</span>
              <input className="input h-13 rounded-2xl bg-white" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nhập họ tên" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">Email</span>
              <div className="flex h-13 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500">
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

        <form onSubmit={savePassword} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={<Lock size={20} />} title="Đổi mật khẩu" subtitle="Dùng mật khẩu mới có ít nhất 6 ký tự." />

          <div className="mt-6 space-y-4">
            <PasswordInput label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordInput label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
            <PasswordInput label="Nhập lại mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} />
          </div>

          <button className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-extrabold text-white hover:bg-slate-800" disabled={passwordSaving}>
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
        <h2 className="font-extrabold text-slate-950">{title}</h2>
        <p className="mt-1 truncate text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <div>
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
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
