"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscription() {
  const { user, session } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  // Check current subscription status
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
        setIsLoading(false);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) { console.error("[Push] Not supported"); return false; }
    if (!user) { console.error("[Push] No user"); return false; }
    if (!session) { console.error("[Push] No session"); return false; }
    if (!VAPID_PUBLIC_KEY) { console.error("[Push] No VAPID key"); return false; }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.error("[Push] Permission denied:", permission);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const subJson = subscription.toJSON();

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
          deviceLabel: navigator.userAgent.includes("Mobile")
            ? "mobile"
            : "desktop",
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        return true;
      }
      const errBody = await res.text();
      console.error("[Push] Subscribe API failed:", res.status, errBody);
      return false;
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      return false;
    }
  }, [isSupported, user, session]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user || !session) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return true;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      setIsSubscribed(false);
      return true;
    } catch {
      return false;
    }
  }, [isSupported, user, session]);

  // Load notification preferences
  const [preferences, setPreferences] = useState<{
    enabled: boolean;
    quiet_start: number;
    quiet_end: number;
    max_per_day: number;
    due_reminder: boolean;
    overdue_reminder: boolean;
    habit_reminder: boolean;
    daily_plan_reminder: boolean;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }: { data: NonNullable<typeof preferences> | null }) => {
        if (data) setPreferences(data);
      });
  }, [user, supabase]);

  const updatePreferences = useCallback(
    async (updates: Partial<NonNullable<typeof preferences>>) => {
      if (!user) return;
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs as NonNullable<typeof preferences>);
      await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    },
    [user, preferences, supabase]
  );

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    preferences,
    updatePreferences,
  };
}
