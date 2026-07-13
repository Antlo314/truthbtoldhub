/* Sacred Sanctum — lightweight offline shell (brand + navigation shell) */
const CACHE = 'sanctum-shell-v3';
const PRECACHE = [
  '/',
  '/favicon.png',
  '/manifest.webmanifest',
  '/offline.html',
  '/vision',
  '/epilogue',
  '/brand/keyart-return-source.jpg',
  '/brand/bg-portal.jpg',
  '/brand/bg-hut-sanctuary.jpg',
  '/brand/bg-awakening-void.jpg',
  '/brand/bg-hall.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => undefined)
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/hut3d')) return;

  // Navigations: network first, fall back to cached shell / offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(CACHE);
            // Cache only lightweight shell routes
            if (
              url.pathname === '/' ||
              url.pathname === '/vision' ||
              url.pathname === '/epilogue' ||
              url.pathname === '/offline.html'
            ) {
              cache.put(req, res.clone());
            }
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(req)) ||
            (await cache.match(url.pathname)) ||
            (await cache.match('/offline.html')) ||
            (await cache.match('/')) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  if (
    url.pathname.startsWith('/brand/') ||
    url.pathname === '/favicon.png' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/offline.html' ||
    (url.pathname.startsWith('/assets/cutscenes/') && url.pathname.endsWith('.jpg'))
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })
    );
  }
});
