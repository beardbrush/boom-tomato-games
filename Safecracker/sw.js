const CACHE = "safecracker-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",

  // Main safe play page(s)
  "./safe.html",

  // If you have separate safe pages, include them here so offline works.
  // Rename/remove to match your real filenames:
  "./safe_iron.html",
  "./safe_bronze.html",
  "./safe_steel.html",
  "./endurance.html",

  // Icons (only if they exist in your manifest paths)
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE)
      .then(async (c) => {
        // During development, a missing asset can break install.
        // This loads what exists and skips what doesn't.
        const results = await Promise.allSettled(ASSETS.map((u) => c.add(u)));
        // You can inspect results in DevTools if needed.
        return results;
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evt) => {
  const req = evt.request;

  // Only handle GET. Let POST/others pass through.
  if (req.method !== "GET") return;

  evt.respondWith(
    caches.match(req).then((cached) => {
      // Serve cache first if available
      if (cached) return cached;

      // Otherwise, try network
      return fetch(req)
        .then((res) => {
          // Cache same-origin successful responses
          try {
            const url = new URL(req.url);
            if (url.origin === location.origin && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
          } catch (e) {}
          return res;
        })
        .catch(async () => {
          // Offline fallback: try index, then root
          const fallback =
            (await caches.match("./index.html")) ||
            (await caches.match("./")) ||
            cached;
          return fallback;
        });
    })
  );
});
