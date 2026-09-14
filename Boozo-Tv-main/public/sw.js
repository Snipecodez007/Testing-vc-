// Boozo Tv — minimal service worker
// Caches only the static app shell so the app can install & reopen offline
// to a friendly screen. Everything else (TMDB API, video embeds, images)
// always goes to the network — we never want to serve stale streaming data.

const CACHE_NAME = 'boozo-tv-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET navigations/static assets. Everything else
  // (API calls, cross-origin embeds, POST requests) passes straight through.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Keep the shell cache fresh in the background
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
