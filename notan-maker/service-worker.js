// -------------------------------------------------------------
// Notan Maker – Clean Service Worker
// Ensures fresh updates while keeping offline capability.
// -------------------------------------------------------------

const CACHE_NAME = "notan-maker-cache-v1";
const ASSETS = [
  "/", 
  "/index.html",
  "/style.css",
  "/script.js",
  "/notan.js",
  "/draw-guide.js",
  "/manifest.json",
  "/assets/icon-192.png",
  "/assets/icon-512.png"
];

// Install – cache important assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch – always try network first, fallback to cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and store in cache
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned);
        });
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || null)
      )
  );
});
