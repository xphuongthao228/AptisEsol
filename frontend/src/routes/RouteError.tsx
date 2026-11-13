import { useState } from 'react';
import { useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const [retrying, setRetrying] = useState(false);
  const message = error instanceof Error ? error.message : String(error ?? '');
  const assetError = /preload CSS|dynamically imported module|module script|loading chunk|importing a module/i.test(message);

  async function reload() {
    setRetrying(true);
    // Remove only app caches; keep login and saved learner data intact.
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('aptis-pwa-')).map(key => caches.delete(key)));
      }
    } catch {
      // A restricted browser can deny CacheStorage; reload is still available.
    } finally {
      window.location.reload();
    }
  }

  return (
    <main className="grid min-h-screen place-content-center gap-4 bg-white p-6 text-center text-slate-800">
      <h1 className="text-2xl font-bold">{assetError ? 'Chưa tải được trang' : 'Trang đang gặp sự cố'}</h1>
      <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
        {assetError ? 'Trang có thể vừa được cập nhật hoặc kết nối bị gián đoạn. Bạn hãy kiểm tra mạng rồi tải lại để tiếp tục.' : 'Bạn hãy tải lại trang. Nếu lỗi vẫn xuất hiện, vui lòng liên hệ hỗ trợ.'}
      </p>
      <button type="button" disabled={retrying} onClick={() => { void reload(); }} className="btn-primary mx-auto disabled:opacity-50">
        {retrying ? 'Đang tải lại…' : 'Tải lại trang'}
      </button>
    </main>
  );
}
