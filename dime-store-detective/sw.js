/* Dime Store Detective — cache-first SW (fixed: safe fallback + scoped URLs) */

const CACHE_NAME = "dime-store-detective-v2";

// Build absolute URLs from the SW scope so paths are always correct
const scope = self.registration.scope; // e.g. https://boomtomatogames.com/dime-store-detective/
const u = (path) => new URL(path, scope).toString();

const CORE = [
  u("./"),
  u("./index.html"),
  u("./style.css"),
  u("./app.js"),
  u("./manifest.json"),
  u("./characters.json"),
  u("./audio/2021-09-06_-_Solving_The_Crime_-_David_Fesliyan.mp3"),
];

// Optional: cases offline-ready
const CASES = [
  u("./cases/case1.json"),
  u("./cases/case2.json"),
  u("./cases/case3.json"),
  u("./cases/case4.json"),
  u("./cases/case5.json"),
  u("./cases/case6.json"),
  u("./cases/case7.json"),
  u("./cases/case8.json"),
  u("./cases/case9.json"),
  u("./cases/case10.json"),
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...CORE, ...CASES]);
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

  const url = new URL(req.url);
  const sameOrigin = (url.origin === self.location.origin);

  event.respondWith((async () => {
    // Only handle same-origin requests
    if (!sameOrigin) {
      try { return await fetch(req); }
      catch {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || new Response("Offline", { status: 503 });
      }
    }

    // Cache-first
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);

      // Only cache successful basic responses
      if (fresh && fresh.ok && fresh.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      }

      return fresh;
    } catch (e) {
      // ✅ CRITICAL FIX:
      // Only return index.html as a fallback for page navigations (documents).
      const isNav =
        req.mode === "navigate" ||
        req.destination === "document" ||
        (req.headers.get("accept") || "").includes("text/html");

      if (isNav) {
        const fallback = await caches.match(u("./index.html"), { ignoreSearch: true });
        return fallback || new Response("Offline", { status: 503 });
      }

      // For CSS/JS/images/audio: do NOT return HTML
      return new Response("Offline", { status: 503 });
    }
  })());
});
