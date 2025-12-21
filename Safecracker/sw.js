const CACHE = "safecracker-endurance-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./safe.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE) ? null : caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  evt.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // cache same-origin GETs
      try{
        const url = new URL(req.url);
        if(url.origin === location.origin && req.method === "GET"){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
      }catch(e){}
      return res;
    }).catch(() => cached))
  );
});
