/* Sacred Sanctum — lightweight offline shell (static brand + posters only) */
const CACHE = 'sanctum-shell-v2';
const PRECACHE = [
  '/',
  '/favicon.png',
  '/manifest.webmanifest',
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
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
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
  // Only cache same-origin static brand / icons / manifest — never API or hut3d wasm
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/hut3d')) return;

  if (
    url.pathname.startsWith('/brand/') ||
    url.pathname === '/favicon.png' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/assets/cutscenes/') && url.pathname.endsWith('.jpg')
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
