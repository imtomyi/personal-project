const CACHE_NAME = "collab-todo-v2";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/workspace",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
];

// Install: pre-cache shell & skip waiting immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches & claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything (ensures fresh content on update)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip API routes, auth, and supabase — always network only
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("supabase")
  ) return;

  // Network-first for all resources: try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) =>
          cached || caches.match("/workspace")
        )
      )
  );
});
