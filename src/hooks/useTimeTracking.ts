"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { TimeEntry } from "@/lib/types";

export function useTimeTracking(workspaceId: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [tick, setTick] = useState(0); // Force re-render for running timer

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  }, [user, workspaceId, supabase]);

  useRealtimeSubscription({
    channelName: user ? `time_entries:${workspaceId}:${user.id}` : "time:noop",
    table: "time_entries",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchEntries,
    skip: !user,
  });

  // Tick every second when a timer is running
  const activeEntry = entries.find((e) => !e.ended_at);
  useEffect(() => {
    if (activeEntry) {
      timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
    }
  }, [activeEntry?.id]);

  async function startTimer(todoId: string) {
    if (!user) return;

    // Stop any currently running timer first
    if (activeEntry) {
      await stopTimer(activeEntry.id);
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("time_entries").insert({
      user_id: user.id,
      todo_id: todoId,
      workspace_id: workspaceId,
      started_at: now,
    });
    if (error) throw error;
    await fetchEntries();
  }

  async function stopTimer(entryId: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const now = new Date();
    const started = new Date(entry.started_at);
    const durationSec = Math.floor((now.getTime() - started.getTime()) / 1000);

    const { error } = await supabase
      .from("time_entries")
      .update({
        ended_at: now.toISOString(),
        duration_sec: durationSec,
      })
      .eq("id", entryId);
    if (error) throw error;
    await fetchEntries();
  }

  function getActiveEntryForTodo(todoId: string): TimeEntry | undefined {
    return entries.find((e) => e.todo_id === todoId && !e.ended_at);
  }

  function getTotalSeconds(todoId: string): number {
    return entries
      .filter((e) => e.todo_id === todoId && e.duration_sec)
      .reduce((sum, e) => sum + (e.duration_sec ?? 0), 0);
  }

  function getElapsedSeconds(entry: TimeEntry): number {
    const started = new Date(entry.started_at).getTime();
    return Math.floor((Date.now() - started) / 1000);
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return {
    entries,
    loading,
    activeEntry,
    startTimer,
    stopTimer,
    getActiveEntryForTodo,
    getTotalSeconds,
    getElapsedSeconds,
    formatTime,
    tick, // Include to trigger re-renders
  };
}
