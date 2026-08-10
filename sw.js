// Bump this string every time index.html / app logic changes so old caches
// are dropped automatically instead of silently serving a stale version.
const CACHE = 'labtracker-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Never cache Gemini API calls.
  if (e.request.url.includes('generativelanguage.googleapis.com')) return;
  // Network-first for the app shell itself so updates show up immediately;
  // cache-first for everything else (CDN libs, icons) to save bandwidth offline.
  const isAppShell = ASSETS.some(a => e.request.url.endsWith(a.replace('./','')) || e.request.url.endsWith('/'));
  if (isAppShell) {
    e.respondWith(
      fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }))
    );
  }
});