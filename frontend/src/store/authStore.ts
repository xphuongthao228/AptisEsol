import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api, unwrap } from '../api/client';
import type { AuthResponse, User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: async (email, password) => {
        const data = await unwrap<AuthResponse>(api.post('/auth/login', { email, password }));
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },
      register: async (fullName, email, password) => {
        await unwrap<void>(api.post('/auth/register', { fullName, email, password }));
      },
      setUser: (user) => set({ user }),
      logout: async () => {
        const refreshToken = get().refreshToken;
        if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
        set({ user: null, accessToken: null, refreshToken: null });
      }
    }),
    {
      name: 'aptis-esol-auth',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
