// Care Log service worker — caches the app shell so it works offline after first load.
// Bump CACHE_NAME when the app changes so old caches get cleared out.
const CACHE_NAME = "care-log-shell-v2";
const APP_SHELL = [
  "./care-log-standalone.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone@7/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch((e) => {
      // If a CDN resource fails to cache (e.g. offline on first install), don't block
      // installation entirely — the app can still fetch it live next time it's online.
      console.error("care-log sw: shell caching failed", e);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first: serve from cache when available (fast, works offline), fall back to
// network, and quietly update the cache in the background when online.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached — nothing more we can do
      return cached || networkFetch;
    })
  );
});
