/* Taiwan Rice Roll PWA service worker.
   Network-first for HTML/CSS/JS (always fresh), cache-first for other assets. */
const CACHE = 'trr-v7';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/icons.js',
  './js/i18n.js',
  './js/supabase.js',
  './js/cart.js',
  './js/app.js',
  './js/auth.js',
  './js/pwa.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Never cache Supabase API/storage calls — always go to network.
  if (request.url.includes('supabase.co')) return;

  const url = new URL(request.url);
  const isHTML = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const isCode = /\.(?:js|css)$/.test(url.pathname);

  // Network-first for pages, scripts and styles so updates appear immediately.
  if (isHTML || isCode) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else (icons, fonts, images).
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
