/* Minimal offline shell for DayGate (relative to deploy base, e.g. /sap-daygate/). */
const CACHE = 'daygate-shell-v1';

self.addEventListener('install', (event) => {
  const base = self.registration.scope;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        base,
        new URL('index.html', base).href,
        new URL('manifest.webmanifest', base).href,
        new URL('icons/icon.svg', base).href,
      ]).catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
