/* Dime Store Detective — SAFE Service Worker */

const CACHE_NAME = "dime-store-detective-v3";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./characters.json",
  "./audio/2021-09-06_-_Solving_The_Crime_-_David_Fesliyan.mp3"
];

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

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([...CORE_ASSETS, ...CASES])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // HTML navigation → network first, fallback to cached HTML
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets → cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
  }
});
