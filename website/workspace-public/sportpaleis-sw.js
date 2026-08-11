const CACHE_VERSION = "sportpaleis-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("sportpaleis-") && key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

// Authenticated routes and API data deliberately remain network-only.
