const CACHE_NAME = "fart-detective-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./offline.html",
  "./game.pck",
  "./game.js",
  "./game.wasm",
  "./engine.js",
  "./icon-192.png",
  "./icon-512.png",
  "./splash.png"
];

// Install: cache all assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: try network, fallback to cache, fallback to offline
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(res => res)
      .catch(() =>
        caches.match(event.request).then(resp => resp || caches.match("./offline.html"))
      )
  );
});
