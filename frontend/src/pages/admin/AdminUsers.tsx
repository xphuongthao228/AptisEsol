import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, Lock, Pencil, Search, Trash2, Unlock, UserCheck, UserX, Wifi } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { RoleName, User } from '../../types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'LOCKED';
type RoleFilter = 'ALL' | RoleName;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function AdminUsers() {
  const { data, loading, setData } = useApi<User[]>(() => unwrap(api.get('/users')), []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [onlineVisitorCount, setOnlineVisitorCount] = useState(0);

  const users = data ?? [];
  const activeUsers = users.filter((user) => user.enabled);
  const expiredUsers = users.filter((user) => user.enabled && !hasActiveAccess(user));
  const lockedUsers = users.filter((user) => !user.enabled);

  const filtered = useMemo(() => users.filter((user) => {
    const matchQuery = [user.fullName, user.email].join(' ').toLowerCase().includes(query.toLowerCase());
    const matchStatus = status === 'ALL' || (status === 'ACTIVE' ? user.enabled : !user.enabled);
    const matchRole = role === 'ALL' || user.roles.includes(role);
    return matchQuery && matchStatus && matchRole;
  }), [users, query, status, role]);

  useEffect(() => {
    const refreshOnlineData = async () => {
      const [latestUsers, latestOnlineCount] = await Promise.all([
        unwrap<User[]>(api.get('/users')),
        unwrap<number>(api.get('/users/online-count'))
      ]);
      setData(latestUsers);
      setOnlineVisitorCount(latestOnlineCount);
    };

    refreshOnlineData().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      refreshOnlineData().catch(() => undefined);
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [setData]);

  if (loading) return <div className="card p-6">Đang tải người dùng...</div>;

  async function toggleUser(user: User) {
    const updated = await unwrap<User>(api.put(`/users/${user.id}`, { fullName: user.fullName, enabled: !user.enabled }));
    setData(users.map((item) => item.id === user.id ? updated : item));
    toast.success(updated.enabled ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
  }

  async function renameUser(user: User) {
    const fullName = window.prompt('Nhập tên mới', user.fullName);
    if (!fullName || fullName === user.fullName) return;
    const updated = await unwrap<User>(api.put(`/users/${user.id}`, { fullName, enabled: user.enabled }));
    setData(users.map((item) => item.id === user.id ? updated : item));
    toast.success('Đã cập nhật người dùng');
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Xóa mềm user ${user.email}?`)) return;
    await api.delete(`/users/${user.id}`);
    setData(users.filter((item) => item.id !== user.id));
    toast.success('Đã xóa người dùng');
  }

  async function extendAccess(user: User) {
    const input = window.prompt(`Nhập số ngày muốn cộng thêm cho ${user.email}`, '30');
    if (!input) return;

    const days = Number(input);
    if (!Number.isInteger(days) || days <= 0) {
      toast.error('Số ngày phải là số nguyên lớn hơn 0');
      return;
    }

    try {
      const updated = await unwrap<User>(api.post(`/users/${user.id}/extend-access`, { days }));
      setData(users.map((item) => item.id === user.id ? updated : item));
      toast.success(`Đã cộng thêm ${days} ngày. Hạn mới: ${formatAccessDate(updated.accessExpiresAt)}`);
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      toast.error(message ?? `Không cộng được thời gian${status ? ` (HTTP ${status})` : ''}. Hãy chạy lại backend.`);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-500">Tìm kiếm, lọc, khóa/mở khóa, sửa tên và xóa mềm tài khoản.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:flex">
          <Summary label="Hoạt động" value={activeUsers.length} icon={<UserCheck size={18} />} />
          <Summary label="Đang truy cập" value={onlineVisitorCount} icon={<Wifi size={18} />} />
          <Summary label="Hết hạn" value={expiredUsers.length} icon={<UserX size={18} />} />
          <Summary label="Đã khóa" value={lockedUsers.length} icon={<UserX size={18} />} />
        </div>
      </div>

      <section className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={18} className="text-slate-400" />
            <input className="w-full border-0 bg-transparent text-sm outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc email..." />
          </div>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}>
            <option value="ALL">Tất cả role</option>
            <option value="ADMIN">ADMIN</option>
            <option value="STUDENT">STUDENT</option>
          </select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </div>
      </section>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="p-4">Người dùng</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Hạn học</th><th className="p-4">Truy cập</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr className="border-t border-slate-100" key={user.id}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">{user.fullName[0]}</div>
                      <span className="font-bold">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">{user.email}</td>
                  <td className="p-4">{user.roles.map((item) => <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold" key={item}>{item}</span>)}</td>
                  <td className="p-4">{renderAccessStatus(user)}</td>
                  <td className="p-4">{renderOnlineStatus(user)}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.enabled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{user.enabled ? 'Hoạt động' : 'Đã khóa'}</span></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary h-9 px-3 text-brand-700" onClick={() => extendAccess(user)} title="Cộng ngày sử dụng"><CalendarPlus size={16} /></button>
                      <button className="btn-secondary h-9 px-3" onClick={() => renameUser(user)} title="Sửa tên"><Pencil size={16} /></button>
                      <button className="btn-secondary h-9 px-3" onClick={() => toggleUser(user)} title={user.enabled ? 'Khóa' : 'Mở khóa'}>{user.enabled ? <Lock size={16} /> : <Unlock size={16} />}</button>
                      <button className="btn-secondary h-9 px-3 text-red-600" onClick={() => deleteUser(user)} title="Xóa"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <div className="p-6 text-center text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</div>}
      </div>
    </div>
  );
}

function formatAccessDate(value: string | null | undefined) {
  if (!value) return 'Chưa gia hạn';
  return new Date(value).toLocaleDateString('vi-VN');
}

function daysLeft(value: string | null | undefined) {
  if (!value) return 0;
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function hasActiveAccess(user: User) {
  const expiresAt = user.accessExpiresAt ?? user.proExpiresAt;
  return daysLeft(expiresAt) > 0;
}

function isOnlineUser(user: User) {
  if (!user.lastSeenAt) return false;
  const lastSeen = new Date(user.lastSeenAt).getTime();
  if (Number.isNaN(lastSeen)) return false;
  return Date.now() - lastSeen <= ONLINE_WINDOW_MS;
}

function formatLastSeen(value: string | null | undefined) {
  if (!value) return 'Chưa truy cập';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });
}

function renderOnlineStatus(user: User) {
  const online = user.enabled && isOnlineUser(user);
  return (
    <div>
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
        {online ? 'Đang online' : 'Offline'}
      </span>
      <p className="mt-1 text-xs font-semibold text-slate-500">{formatLastSeen(user.lastSeenAt)}</p>
    </div>
  );
}

function renderAccessStatus(user: User) {
  const expiresAt = user.accessExpiresAt ?? user.proExpiresAt;
  if (!expiresAt) {
    return <span className="text-slate-500">Chưa có hạn học</span>;
  }

  const remaining = daysLeft(expiresAt);
  const isPaid = Boolean(user.proExpiresAt);
  const expired = remaining <= 0;

  return (
    <div>
      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
        expired
          ? 'bg-red-50 text-red-700'
          : isPaid
            ? 'bg-brand-50 text-brand-700'
            : 'bg-amber-50 text-amber-700'
      }`}>
        {expired ? 'Đã hết hạn' : `Còn ${remaining} ngày`}
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {isPaid ? 'Đã gia hạn' : 'Miễn phí'} đến {formatAccessDate(expiresAt)}
      </p>
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">{icon}{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
