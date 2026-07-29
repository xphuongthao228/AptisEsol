import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, AuthResponse } from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

export const api = axios.create({ baseURL });
const authApi = axios.create({ baseURL });

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<AuthResponse> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const refreshToken = useAuthStore.getState().refreshToken;
    const url = originalRequest?.url ?? '';

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      !refreshToken ||
      url.includes('/auth/login') ||
      url.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken(refreshToken);
      const data = await refreshPromise;
      useAuthStore.setState({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

async function refreshAccessToken(refreshToken: string) {
  const response = await authApi.post<ApiResponse<AuthResponse>>('/auth/refresh-token', { refreshToken });
  return response.data.data;
}

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
