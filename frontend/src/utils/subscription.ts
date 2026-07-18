export interface SubscriptionStatus {
  active: boolean;
  expired: boolean;
  expireDate: Date | null;
  daysLeft: number;
}

const ACCESS_KEY = 'aptis_pro_access';
const EXPIRE_KEY = 'aptis_pro_expire_date';

export function getSubscriptionStatus(): SubscriptionStatus {
  const hasAccess = localStorage.getItem(ACCESS_KEY) === 'true';
  const expireValue = localStorage.getItem(EXPIRE_KEY);
  const expireDate = expireValue ? parseStoredDate(expireValue) : null;
  const validDate = expireDate && !Number.isNaN(expireDate.getTime()) ? expireDate : null;
  const today = startOfDay(new Date());

  if (!hasAccess || !validDate) {
    return { active: false, expired: false, expireDate: validDate, daysLeft: 0 };
  }

  const expireDay = endOfDay(validDate);
  const expired = expireDay.getTime() < today.getTime();
  const daysLeft = expired ? 0 : Math.max(0, Math.ceil((expireDay.getTime() - today.getTime()) / 86400000));

  if (expired) {
    localStorage.setItem(ACCESS_KEY, 'false');
  }

  return { active: !expired, expired, expireDate: validDate, daysLeft };
}

export function saveSubscription(days: number) {
  const current = getSubscriptionStatus();
  const expireDate = current.active && current.expireDate ? new Date(current.expireDate) : new Date();
  expireDate.setDate(expireDate.getDate() + days);
  saveSubscriptionUntil(expireDate);
  return expireDate;
}

export function saveSubscriptionUntil(expireDate: Date | string | null) {
  if (!expireDate) {
    localStorage.setItem(ACCESS_KEY, 'false');
    localStorage.removeItem(EXPIRE_KEY);
    return null;
  }
  const date = expireDate instanceof Date ? expireDate : new Date(expireDate);
  if (Number.isNaN(date.getTime())) {
    localStorage.setItem(ACCESS_KEY, 'false');
    localStorage.removeItem(EXPIRE_KEY);
    return null;
  }
  localStorage.setItem(ACCESS_KEY, 'true');
  localStorage.setItem(EXPIRE_KEY, date.toISOString());
  return date;
}

export function formatSubscriptionDate(date: Date | null) {
  return date ? date.toLocaleDateString('vi-VN') : '';
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseStoredDate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  return new Date(Number.NaN);
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
