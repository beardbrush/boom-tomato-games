/* --------------------------------------------------
   Wedding Seating Puzzle – Service Worker
-------------------------------------------------- */

const CACHE_NAME = "btg-wedding-v4";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/offline.html",
  "/content/demo/tutorial_01.json",
  "/content/full/puzzle_01.json"
];

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  for (const url of ASSETS) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (res.ok) {
        await cache.put(url, res.clone());
      } else {
        console.warn("[SW] Skipping asset:", url, res.status);
      }
    } catch (err) {
      console.warn("[SW] Error:", url, err);
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
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

/* -----------------------------------------
   FETCH HANDLER
----------------------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";

  if (accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/offline.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match("/offline.html"));
    })
  );
});
