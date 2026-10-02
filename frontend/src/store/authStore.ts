import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api, publicApi, unwrap } from '../api/client';
import type { AuthResponse, OtpResponse, User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  register: (fullName: string, email: string, password: string) => Promise<OtpResponse>;
  setAuth: (data: AuthResponse) => void;
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
        const data = await unwrap<AuthResponse>(publicApi.post('/auth/login', { email, password }));
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },
      loginWithGoogle: () => {
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
        window.location.assign(new URL('/oauth2/authorization/google', apiUrl).toString());
      },
      register: async (fullName, email, password) => {
        return unwrap<OtpResponse>(publicApi.post('/auth/register', { fullName, email, password }));
      },
      setAuth: (data) => set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }),
      setUser: (user) => set({ user }),
      logout: async () => {
        const refreshToken = get().refreshToken;
        await api.post('/auth/logout', refreshToken ? { refreshToken } : undefined).catch(() => undefined);
        set({ user: null, accessToken: null, refreshToken: null });
      }
    }),
    {
      name: 'aptis-esol-auth',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
