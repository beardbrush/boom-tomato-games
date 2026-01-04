/* Dime Store Detective — simple cache-first SW */

const CACHE_NAME = "dime-store-detective-v1";
const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./characters.json",
  "./audio/2021-09-06_-_Solving_The_Crime_-_David_Fesliyan.mp3"
];

// Add your cases explicitly if you like (optional)
// If you add all 10, they’ll be offline-ready:
const CASES = [
  "./cases/case1.json",
  "./cases/case2.json",
  "./cases/case3.json",
  "./cases/case4.json",
  "./cases/case5.json",
  "./cases/case6.json",
  "./cases/case7.json",
  "./cases/case8.json",
  "./cases/case9.json",
  "./cases/case10.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...CORE, ...CASES].map(u => new URL(u, self.location).toString()));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const url = new URL(req.url);

    // Cache-first for local assets
    if (url.origin === self.location.origin) {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // fallback if offline
        const fallback = await caches.match("./index.html");
        return fallback || new Response("Offline", { status: 503 });
      }
    }

    // Network-first for external
    try {
      return await fetch(req);
    } catch (e) {
      const cached = await caches.match(req);
      return cached || new Response("Offline", { status: 503 });
    }
  })());
});
