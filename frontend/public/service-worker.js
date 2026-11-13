const CACHE_VERSION = 'aptis-pwa-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-48x48.png',
  '/favicon-192x192.png',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('aptis-pwa-') && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy)));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // SPA rewrites can return index.html for a missing chunk. Never keep that
  // HTML response under a CSS/JS URL: it would break every subsequent retry.
  if (url.pathname.startsWith('/assets/') && /\.(?:css|m?js)$/.test(url.pathname)) {
    const isCss = url.pathname.endsWith('.css');
    const valid = (response) => response?.ok && (isCss
      ? response.headers.get('content-type')?.includes('text/css')
      : /(?:javascript|ecmascript)/i.test(response.headers.get('content-type') || ''));
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (valid(cached)) return cached;
      if (cached) await cache.delete(request);
      const response = await fetch(request);
      if (!valid(response)) return new Response('Application asset unavailable', { status: 503 });
      event.waitUntil(cache.put(request, response.clone()));
      return response;
    })());
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
