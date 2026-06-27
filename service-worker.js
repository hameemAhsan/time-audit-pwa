const CACHE_NAME = 'time-audit-pwa-v6.0.0';
const APP_BASE = '/time-audit-pwa/';

const APP_SHELL = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}styles.css`,
  `${APP_BASE}app.js`,
  `${APP_BASE}manifest.json`,
  `${APP_BASE}offline.html`,
  `${APP_BASE}assets/icon-192.png`,
  `${APP_BASE}assets/icon-512.png`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Only handle this GitHub Pages app path. Do not hijack the whole github.io domain.
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(APP_BASE)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then(networkResponse => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseCopy));
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(`${APP_BASE}offline.html`);
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin + APP_BASE) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(APP_BASE);
      }

      return undefined;
    })
  );
});
