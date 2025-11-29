/* --------------------------------------------------
   Character Silhouette Trainer – Service Worker
-------------------------------------------------- */

const CACHE_NAME = "btg-silhouette-trainer-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
  // You can add silhouettes here if you want them precached,
  // but 50 PNGs might be a bit heavy – optional.
];

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

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => cached);
    })
  );
});
