import type { RoleName, User } from '../types';

export function normalizeRoleName(role: unknown): RoleName | null {
  const raw = typeof role === 'string'
    ? role
    : role && typeof role === 'object' && 'name' in role && typeof role.name === 'string'
      ? role.name
      : '';

  const value = raw.replace(/^ROLE_/, '').toUpperCase();
  return value === 'ADMIN' || value === 'STUDENT' ? value : null;
}

export function userHasRole(user: User | null | undefined, role: RoleName) {
  return Array.isArray(user?.roles) && user.roles.some((item) => normalizeRoleName(item) === role);
}
