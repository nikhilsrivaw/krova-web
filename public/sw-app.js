// Minimal service worker for the KROVA app PWA. Registered with scope "/"
// on the app.krova.space subdomain and scope "/app/" as a fallback on the
// main site (see lib/app-nav.ts) - self.registration.scope tells us which,
// so one file covers both instead of shipping two near-identical workers.
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
  // Only our own http(s) pages. Browser extensions also send requests through
  // this worker (chrome-extension://), and the Cache API refuses those.
  if (url.origin !== self.location.origin) return;
  const scopePath = new URL(self.registration.scope).pathname; // "/" or "/app/"
  if (scopePath !== "/" && !url.pathname.startsWith(scopePath)) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Web Push: a short notification for the owner. The backend sends paths as
// "/app/..."; on the app subdomain the scope is "/", so the prefix is dropped.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "KROVA", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/app/today" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const scopePath = new URL(self.registration.scope).pathname;
  let target = (event.notification.data && event.notification.data.url) || "/app/today";
  if (scopePath === "/" && target.startsWith("/app/")) target = target.slice(4);
  const absolute = new URL(target, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(absolute);
          return client.focus();
        }
      }
      return self.clients.openWindow(absolute);
    })
  );
});
