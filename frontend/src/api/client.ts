import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, AuthResponse } from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

export const api = axios.create({ baseURL });
export const publicApi = axios.create({ baseURL });
const authApi = axios.create({ baseURL });
const REFRESH_SKEW_SECONDS = 90;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<AuthResponse> | null = null;

publicApi.interceptors.request.use((config) => {
  delete config.headers.Authorization;
  return config;
});

function isPublicRequest(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? 'get').toLowerCase();
  const url = config.url ?? '';
  if (isPublicAuthRequest(method, url)) return true;
  if (method === 'post' && url === '/tests/random') return true;
  if (method !== 'get') return false;

  return (
    url === '/tests' ||
    url.startsWith('/tests?') ||
    /^\/tests\/[^/?]+/.test(url) ||
    url === '/skills' ||
    url.startsWith('/skills?') ||
    url === '/lessons' ||
    url.startsWith('/lessons?') ||
    url === '/predictions' ||
    url.startsWith('/predictions?') ||
    url === '/mock-tests' ||
    url.startsWith('/mock-tests?') ||
    url === '/submissions/leaderboard' ||
    url === '/submissions/leaderboard/settings' ||
    url.startsWith('/submissions/leaderboard?') ||
    url === '/notifications/public' ||
    url.startsWith('/notifications/public?')
  );
}

function isPublicAuthRequest(method: string, url: string) {
  if (url === '/auth/heartbeat' || url === '/auth/me' || url === '/auth/change-password') {
    return false;
  }

  return url.startsWith('/auth/')
    && (
      method === 'get' ||
      url === '/auth/login' ||
      url === '/auth/register' ||
      url === '/auth/verify-registration-otp' ||
      url === '/auth/resend-verification' ||
      url === '/auth/forgot-password' ||
      url === '/auth/reset-password' ||
      url === '/auth/refresh-token' ||
      url === '/auth/logout'
    );
}

api.interceptors.request.use(async (config) => {
  const { accessToken, refreshToken } = useAuthStore.getState();

  if (isPublicRequest(config)) {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  }

  let token = accessToken;

  if (refreshToken && (!token || shouldRefreshAccessToken(token))) {
    try {
      refreshPromise ??= refreshAccessToken(refreshToken);
      const data = await refreshPromise;
      useAuthStore.setState({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
      token = data.accessToken;
    } finally {
      refreshPromise = null;
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const { refreshToken } = useAuthStore.getState();
    const url = originalRequest?.url ?? '';

    // 403 = không có quyền / hết hạn gói học. Không refresh và tuyệt đối không logout.
    // Chỉ thử refresh khi access token thực sự bị 401. Nếu refresh thất bại,
    // giữ nguyên phiên hiện tại để admin không bị đá khỏi màn đang cập nhật.
    const canRefresh =
      status === 401 &&
      Boolean(originalRequest) &&
      !originalRequest?._retry &&
      Boolean(refreshToken) &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register') &&
      !url.includes('/auth/logout') &&
      !url.includes('/auth/refresh-token');

    if (!canRefresh || !originalRequest || !refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Gom các request 401 chạy đồng thời vào cùng một lần refresh.
      refreshPromise ??= refreshAccessToken(refreshToken);
      const data = await refreshPromise;

      // Chỉ cập nhật phiên khi refresh thành công.
      useAuthStore.setState({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
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

function shouldRefreshAccessToken(token: string) {
  const expiresAt = getJwtExpiresAt(token);
  if (!expiresAt) return false;
  return expiresAt - Date.now() <= REFRESH_SKEW_SECONDS * 1000;
}

function getJwtExpiresAt(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return 0;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(atob(padded));
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await promise;
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
      const message = error.response?.data?.message;

      if (message) {
        error.message = message;
      } else if (error.response?.status === 401 && isAuthEndpoint(error.config?.url ?? '')) {
        error.message = 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.';
      } else if (error.response?.status === 401) {
        error.message = 'Không xác thực được yêu cầu. Phiên hiện tại vẫn được giữ; vui lòng thử tải lại trang.';
      } else if (error.response?.status === 403) {
        error.message = 'Phiên học đã hết hạn hoặc tài khoản chưa có quyền truy cập.';
      }

      throw error;
    }

    throw error;
  }
}

function isAuthEndpoint(url: string) {
  return url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/verify-registration-otp') ||
    url.includes('/auth/resend-verification') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password');
}
