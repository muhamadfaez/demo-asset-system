/* Cache public files only. API responses and authenticated HTML never enter Cache Storage. */
const CACHE = "kams-public-v1";
const OFFLINE = "/offline.html";
const PUBLIC_FILES = [OFFLINE, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-180.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_FILES)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("kams-public-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
        // Bound storage use across repeated deployments.
        const keys = await cache.keys();
        const extras = keys.filter((entry) => !PUBLIC_FILES.includes(new URL(entry.url).pathname));
        for (const old of extras.slice(0, Math.max(0, extras.length - 100))) await cache.delete(old);
      }
      return response;
    })());
  }
});
