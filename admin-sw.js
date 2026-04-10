// ============================================================
// Gen Dimension Admin — Service Worker
// ============================================================

const CACHE_NAME = 'gd-admin-v1';

const PRE_CACHE = [
  '/admin.html',
  '/admin-manifest.json',
  '/css/style.css',
  '/js/cart.js',
  '/js/main.js',
  '/images/favicon.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== 'gd-v1').map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // API — always network, fallback to offline message
  if (url.pathname.startsWith('/backend/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — reconnect to manage orders.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Everything else — cache first, update in background
  event.respondWith(
    caches.match(request).then(cached => {
      const networkUpdate = fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
      return cached || networkUpdate;
    })
  );
});
