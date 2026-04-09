// ============================================================
// Gen Dimension — Service Worker  (cache-first PWA support)
// ============================================================

const CACHE_NAME = 'gd-v1';

// Static assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/cart.js',
  '/js/main.js',
  '/js/orders.js',
  '/js/reviews.js',
  '/js/emailjs.js',
  '/manifest.json',
  '/images/favicon.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
];

// ── Install: pre-cache core assets ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: strategy per request type ────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests over http(s)
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // Backend API — network-first, fallback to offline JSON
  if (url.pathname.startsWith('/backend/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'You appear to be offline.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // External CDN assets (fonts, EmailJS) — cache-first
  if (!url.origin.includes('gendimension.co.za') && url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (HTML, CSS, JS, images) — cache-first, update in background
  event.respondWith(
    caches.match(request).then(cached => {
      const networkUpdate = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
      return cached || networkUpdate;
    })
  );
});
