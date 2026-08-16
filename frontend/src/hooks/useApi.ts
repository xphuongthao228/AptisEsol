import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  const reload = useCallback(() => {
    setReloadIndex((value) => value + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    loader()
      .then((value) => {
        if (mounted) setData(value);
      })
      .catch((err) => {
        if (!mounted) return;

        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        const detail = err?.response?.data?.errors ? `: ${JSON.stringify(err.response.data.errors)}` : '';
        const message = status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : status === 403
            ? 'Bạn không có quyền truy cập dữ liệu này.'
            : apiMessage
              ? `${apiMessage}${detail}`
              : status
                ? `Không thể tải dữ liệu (HTTP ${status})`
                : 'Không thể tải dữ liệu. Kiểm tra backend có đang chạy không.';

        setError(message);
        if (status !== 401 && status !== 403) {
          toast.error(message, { id: `api-error-${status ?? 'network'}` });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [...deps, reloadIndex]);

  return { data, loading, error, reload, setData };
}
