/* --------------------------------------------------
   Speed Drawing Trainer – Service Worker
-------------------------------------------------- */

const CACHE_NAME = "btg-speed-drawing-trainer-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
  // NOTE:
  // We do NOT preload silhouettes because 50 PNGs = heavy.
  // They will be cached on first view (runtime caching).
];

/* --------------------------------------------------
   INSTALL – Precache Core Files
-------------------------------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) {
            await cache.put(url, res.clone());
          }
        } catch (err) {
          console.warn("[SW] Failed to cache:", url, err);
        }
      }
    })
  );

  self.skipWaiting();
});

/* --------------------------------------------------
   ACTIVATE – Remove Old Caches
-------------------------------------------------- */
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

/* --------------------------------------------------
   FETCH – Cache-first for performance
-------------------------------------------------- */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET (ignore POST/PUT/etc.)
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached; // Serve from cache

      return fetch(request)
        .then((response) => {
          // Cache new silhouette files & others
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => cached); // fallback to cache when offline
    })
  );
});
