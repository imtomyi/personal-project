"use client";

import { useEffect } from "react";

/**
 * Register Periodic Background Sync for notification checking.
 * Chrome 80+, requires user engagement with the site.
 * Falls back gracefully if not supported.
 */
async function registerPeriodicSync(registration: ServiceWorkerRegistration) {
  try {
    // Check if Periodic Background Sync API is available
    if (!("periodicSync" in registration)) return;

    const periodicSync = (registration as unknown as { periodicSync: {
      register: (tag: string, opts: { minInterval: number }) => Promise<void>;
    } }).periodicSync;

    // Check permission
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });

    if (status.state === "granted") {
      await periodicSync.register("notification-check", {
        minInterval: 15 * 60 * 1000, // 15 minutes (browser may throttle)
      });
    }
  } catch {
    // Periodic sync not supported or permission denied — fall back to other mechanisms
  }
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60 * 1000);

        // Register periodic background sync for notifications
        registerPeriodicSync(registration);

        // When a new SW is found and installed, reload the page to use it
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "activated" &&
              navigator.serviceWorker.controller
            ) {
              // New version activated — reload to get fresh content
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed — silently ignore
      });

    // Also handle controller change (e.g. skipWaiting from new SW)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return null;
}
