// PocketLedger Service Worker
// Hosted at repo root alongside index.html on GitHub Pages
// Bump this version string whenever you push an update to index.html
const APP_VERSION = '1.1.0';
const CACHE_NAME  = 'pocketledger-shell-' + APP_VERSION;

// Files to pre-cache on install
const PRECACHE = [
  './',
  './index.html',
];

// ── Install: cache the app shell ─────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())   // activate immediately, don't wait
  );
});

// ── Activate: delete all old caches ──────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())  // take control of all open tabs
  );
});

// ── Fetch: network-first for navigation, cache-first for assets ──────────
self.addEventListener('fetch', e => {
  // Only handle same-origin requests
  if (!e.request.url.startsWith(self.location.origin)) return;

  if (e.request.mode === 'navigate') {
    // Navigation (loading the app): try network first so updates are picked
    // up immediately, fall back to cache when offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Assets (fonts, etc.): cache-first, network fallback
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
