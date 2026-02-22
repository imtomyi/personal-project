"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { DdayEntry } from "@/lib/types";
import { DDAY_STORAGE_KEY } from "@/lib/workspace-widgets";

export function useDdayEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DdayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const migratedRef = useRef(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("dday_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setEntries(data ?? []);
    setLoading(false);

    // 1회성 localStorage → DB 마이그레이션
    if (!migratedRef.current) {
      migratedRef.current = true;
      try {
        const stored = localStorage.getItem(DDAY_STORAGE_KEY);
        if (stored && (!data || data.length === 0)) {
          const localEntries = JSON.parse(stored) as Array<{
            id: string;
            title: string;
            date: string;
            emoji: string;
            color: string;
          }>;
          if (localEntries.length > 0) {
            const toInsert = localEntries.map((e, i) => ({
              user_id: user.id,
              title: e.title,
              date: e.date,
              emoji: e.emoji || "📌",
              color: e.color || "blue",
              sort_order: i,
            }));
            await supabase.from("dday_entries").insert(toInsert);
            localStorage.removeItem(DDAY_STORAGE_KEY);
            // Re-fetch after migration
            const { data: newData } = await supabase
              .from("dday_entries")
              .select("*")
              .eq("user_id", user.id)
              .order("sort_order", { ascending: true });
            setEntries(newData ?? []);
          }
        }
      } catch {
        // 마이그레이션 실패 시 무시
      }
    }
  }, [user, supabase]);

  useRealtimeSubscription({
    channelName: user ? `dday:${user.id}` : "dday:noop",
    table: "dday_entries",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchEntries,
    skip: !user,
  });

  async function addEntry(
    title: string,
    date: string,
    emoji: string = "📌",
    color: string = "blue",
    estimated_minutes: number = 30,
  ) {
    if (!user) return;
    const nextOrder =
      entries.length > 0 ? Math.max(...entries.map((e) => e.sort_order)) + 1 : 0;

    const optimistic: DdayEntry = {
      id: crypto.randomUUID(),
      user_id: user.id,
      title,
      date,
      emoji,
      color,
      sort_order: nextOrder,
      estimated_minutes,
      created_at: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("dday_entries").insert({
      user_id: user.id,
      title,
      date,
      emoji,
      color,
      sort_order: nextOrder,
      estimated_minutes,
    });
    if (error) {
      setEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
      throw error;
    }
    await fetchEntries();
  }

  async function updateEntry(
    id: string,
    updates: Partial<Pick<DdayEntry, "estimated_minutes" | "title" | "date" | "emoji" | "color">>,
  ) {
    if (!user) return;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    const { error } = await supabase.from("dday_entries").update(updates).eq("id", id);
    if (error) {
      await fetchEntries();
      throw error;
    }
  }

  async function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("dday_entries").delete().eq("id", id);
    if (error) {
      await fetchEntries();
      throw error;
    }
  }

  return { entries, loading, addEntry, updateEntry, removeEntry };
}
