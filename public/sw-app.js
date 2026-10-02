// Minimal service worker for the KROVA app PWA (scope: /app/).
// Just enough to make the browser consider this installable and to let
// already-visited pages keep working with no signal - no aggressive
// precaching, since the app's data is never static.
const CACHE = "krova-app-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first, falling back to whatever was last cached for that exact
// URL - a stale screen beats a blank one when the signal drops, but never
// shows stale data when a connection is actually available.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith("/app")) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
