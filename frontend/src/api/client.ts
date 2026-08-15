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
    const { accessToken, refreshToken } = useAuthStore.getState();
    const url = originalRequest?.url ?? '';
    const canRefresh =
      originalRequest &&
      !originalRequest._retry &&
      refreshToken &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register') &&
      !url.includes('/auth/logout') &&
      !url.includes('/auth/refresh-token');

    if (
      !canRefresh ||
      (status !== 401 && !(status === 403 && accessToken))
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
  try {
    const response = await promise;
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
      const message = error.response?.data?.message;
      if (message) throw new Error(message);
      if (error.response?.status === 401) {
        throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi chấm Writing.');
      }
      if (error.response?.status === 403) {
        throw new Error('Tài khoản chưa có quyền truy cập AI hoặc gói dùng thử/Pro đã hết hạn.');
      }
    }
    throw error;
  }
}
