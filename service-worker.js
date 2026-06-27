const CACHE_NAME = 'time-audit-pwa-v8.0.0'; // ← bump this on every deploy
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
  // Pre-cache all shell assets, THEN skip waiting
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Delete all old caches that don't match current version
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

// ← NEW: respond to skip waiting message from the page
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(APP_BASE)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      // SPA fallback: any missed navigation → serve index.html
      if (event.request.mode === 'navigate') {
        return caches.match(`${APP_BASE}index.html`);
      }

      return fetch(event.request)
        .then(networkResponse => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseCopy));
          return networkResponse;
        })
        .catch(() => new Response('', { status: 504, statusText: 'Offline' }));
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
      if (clients.openWindow) return clients.openWindow(APP_BASE);
    })
  );
});
