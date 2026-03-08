"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

const DEBOUNCE_KEY = "last_activity_tracked";
const PROCESS_KEY = "last_notif_process";
const DEBOUNCE_MS = 15 * 60 * 1000; // 15 minutes
const PROCESS_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes (more aggressive for notifications)

export function useActivityTracker() {
  const { user, session } = useAuth();
  const supabase = createClient();
  const processedRef = useRef(false);

  const trackActivity = useCallback(
    async (action: string, metadata: Record<string, unknown> = {}) => {
      if (!user) return;

      const now = new Date();
      await supabase.from("user_activity_log").insert({
        user_id: user.id,
        action,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),
        metadata,
      });
    },
    [user, supabase]
  );

  // Trigger notification processing (debounced to 5 min)
  const triggerNotificationProcess = useCallback(() => {
    const now = Date.now();
    const lastProcess = localStorage.getItem(PROCESS_KEY);
    if (!lastProcess || now - parseInt(lastProcess, 10) >= PROCESS_DEBOUNCE_MS) {
      localStorage.setItem(PROCESS_KEY, String(now));
      fetch("/api/notifications/process").catch(() => {});
    }
  }, []);

  // Track app_open on mount (debounced to 15 min)
  useEffect(() => {
    if (!user || !session) return;

    const lastTracked = sessionStorage.getItem(DEBOUNCE_KEY);
    const now = Date.now();

    if (lastTracked && now - parseInt(lastTracked, 10) < DEBOUNCE_MS) {
      // Even if activity tracking is debounced, still try notification processing
      if (!processedRef.current) {
        processedRef.current = true;
        triggerNotificationProcess();
      }
      return;
    }

    sessionStorage.setItem(DEBOUNCE_KEY, String(now));
    trackActivity("app_open");
    triggerNotificationProcess();
    processedRef.current = true;
  }, [user, session, trackActivity, triggerNotificationProcess]);

  // Trigger notification processing on visibility change and focus
  // This catches when the user returns to the tab/app after being away
  useEffect(() => {
    if (!user || !session) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerNotificationProcess();
      }
    };

    const handleFocus = () => {
      triggerNotificationProcess();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, session, triggerNotificationProcess]);

  return { trackActivity };
}
