const CACHE_NAME = "collab-todo-v3";

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

// ─── Push Notification ───────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const {
    title = "할 일 알림",
    body = "",
    icon = "/icon-192.png",
    badge = "/icon-192.png",
    tag = "default",
    data: notifData = {},
  } = data;

  const level = notifData.escalation_level ?? 0;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: notifData,
      vibrate: level >= 3 ? [300, 100, 300, 100, 300] : [200, 100, 200],
      requireInteraction: level >= 2,
    })
  );
});

// ─── Periodic Background Sync ────────────────────────────────────────
// Runs periodically even when the app is closed (Chrome 80+, requires engagement)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "notification-check") {
    event.waitUntil(
      fetch("/api/notifications/process").catch(() => {})
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { url, notification_log_id } = event.notification.data || {};
  const targetUrl = url || "/workspace";

  event.waitUntil(
    Promise.all([
      // Navigate to app
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
      // Record click
      notification_log_id
        ? fetch("/api/notifications/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: notification_log_id, action: "click" }),
          }).catch(() => {})
        : Promise.resolve(),
    ])
  );
});
