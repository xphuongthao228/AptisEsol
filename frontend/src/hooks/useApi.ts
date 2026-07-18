import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loader()
      .then((value) => mounted && setData(value))
      .catch((err) => {
        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        const detail = err?.response?.data?.errors ? `: ${JSON.stringify(err.response.data.errors)}` : '';
        const message = apiMessage
          ? `${apiMessage}${detail}`
          : status
            ? `Không thể tải dữ liệu (HTTP ${status})`
            : 'Không thể tải dữ liệu. Kiểm tra backend có đang chạy không.';
        setError(message);
        toast.error(message);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, deps);

  return { data, loading, error, setData };
}
