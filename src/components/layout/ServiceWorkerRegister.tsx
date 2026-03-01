"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60 * 1000);

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
