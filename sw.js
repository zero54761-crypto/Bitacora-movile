const CACHE_NAME = "bitacora-personal-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./404.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/personal-bootstrap.js",
  "./src/data.js",
  "./src/discovery.js",
  "./src/state.js",
  "./src/ui.js",
  "./src/utils.js",
  "./src/persistence.js",
  "./src/calendar-export.js",
  "./src/calendar-ui.js",
  "./src/quick-capture-ui.js",
  "./src/storage-ui.js",
  "./src/backup.js",
  "./src/backup-ui.js",
  "./src/layout-guards.css",
  "./src/phone-resilience.css",
  "./src/navigation-state.js",
  "./src/runtime-banner.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
].map(path => new URL(path, self.registration.scope).toString());

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(response => response ?? caches.match(CORE_ASSETS[1])))
  );
});
