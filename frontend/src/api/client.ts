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

function clearAuthSession() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null
  });
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return;
  window.location.replace('/login');
}

function shouldRedirectToLogin(url: string) {
  if (url.includes('/auth/login') || url.includes('/auth/register')) return false;
  if (url.includes('/auth/heartbeat')) return false;

  const currentPath = typeof window === 'undefined' ? '' : window.location.pathname;
  const isLearningPage =
    currentPath.startsWith('/app/tests') ||
    currentPath.startsWith('/app/exams') ||
    currentPath.startsWith('/app/mock-tests');

  const isLearningRequest =
    url.includes('/tests') ||
    url.includes('/questions') ||
    url.includes('/submissions') ||
    url.includes('/ai/') ||
    url.includes('/payments/subscription/me');

  return !(isLearningPage && isLearningRequest);
}

function isPublicGetRequest(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get') return false;

  const url = config.url ?? '';
  return (
    url === '/tests' ||
    url.startsWith('/tests?') ||
    url === '/skills' ||
    url.startsWith('/skills?') ||
    url === '/lessons' ||
    url.startsWith('/lessons?') ||
    url === '/predictions' ||
    url.startsWith('/predictions?') ||
    url === '/mock-tests' ||
    url.startsWith('/mock-tests?') ||
    url === '/notifications/public' ||
    url.startsWith('/notifications/public?')
  );
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !isPublicGetRequest(config)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const { refreshToken, accessToken, user } = useAuthStore.getState();
    const url = originalRequest?.url ?? '';
    const hasSession = Boolean(accessToken || refreshToken || user);

    // 403 = không có quyền / hết hạn gói học. Không refresh và tuyệt đối không logout.
    // Chỉ thử refresh khi access token thực sự bị 401.
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
      if (status === 401 && hasSession && shouldRedirectToLogin(url)) {
        clearAuthSession();
        redirectToLogin();
      }
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
      const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
      if ((refreshStatus === 400 || refreshStatus === 401 || refreshStatus === 403) && shouldRedirectToLogin(url)) {
        clearAuthSession();
        redirectToLogin();
      }
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

      if (message) {
        error.message = message;
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
