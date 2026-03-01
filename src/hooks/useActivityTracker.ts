"use client";

import { useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

const DEBOUNCE_KEY = "last_activity_tracked";
const PROCESS_KEY = "last_notif_process";
const DEBOUNCE_MS = 15 * 60 * 1000; // 15 minutes

export function useActivityTracker() {
  const { user, session } = useAuth();
  const supabase = createClient();

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

  // Track app_open on mount (debounced to 15 min)
  // Also trigger notification processing
  useEffect(() => {
    if (!user || !session) return;

    const lastTracked = sessionStorage.getItem(DEBOUNCE_KEY);
    const now = Date.now();

    if (lastTracked && now - parseInt(lastTracked, 10) < DEBOUNCE_MS) return;

    sessionStorage.setItem(DEBOUNCE_KEY, String(now));
    trackActivity("app_open");

    // Trigger notification processing (debounced separately to 15 min)
    const lastProcess = localStorage.getItem(PROCESS_KEY);
    if (!lastProcess || now - parseInt(lastProcess, 10) >= DEBOUNCE_MS) {
      localStorage.setItem(PROCESS_KEY, String(now));
      fetch("/api/notifications/process").catch(() => {});
    }
  }, [user, session, trackActivity]);

  return { trackActivity };
}
