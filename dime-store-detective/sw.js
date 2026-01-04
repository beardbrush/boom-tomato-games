// sw.js — Dime Store Detective (safe offline)
// Key rule: only use index.html fallback for NAVIGATION requests,
// never for JSON (cases/characters), never for images/audio.

const CACHE_NAME = "dsdet-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./characters.json",
  // If you want the first case available offline, include it:
  "./cases/case1.json",
  // Add icons you actually have:
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Music if you want it offline:
  "./audio/2021-09-06_-_Solving_The_Crime_-_David_Fesliyan.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
      ),
      self.clients.claim(),
    ])
  );
});

function isJsonRequest(req) {
  const url = new URL(req.url);
  return url.pathname.endsWith(".json") || url.pathname.includes("/cases/") || url.pathname.endsWith("/characters.json");
}

function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // ✅ Never treat JSON like navigation. Always network-first for JSON.
  if (isJsonRequest(req)) {
    event.respondWith(
      fetch(req).then((res) => {
        // If network works, update cache
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(async () => {
        // Offline fallback: try cache
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        // If truly missing, return a proper 404 (not index.html)
        return new Response(JSON.stringify({ error: "offline_or_missing_json" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // ✅ Navigation: cache-first + fallback to index.html (offline)
  if (isNavigationRequest(req)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || caches.match("./index.html");
      })
    );
    return;
  }

  // Everything else (images/audio/css/js): stale-while-revalidate
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
