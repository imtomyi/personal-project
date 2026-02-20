"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { Habit, HabitLog } from "@/lib/types";

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setHabits(data ?? []);
    setLoading(false);
  }, [user, supabase]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    // Fetch last 30 days of logs for streak calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", since);
    setLogs(data ?? []);
  }, [user, supabase]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchHabits(), fetchLogs()]);
  }, [fetchHabits, fetchLogs]);

  useRealtimeSubscription({
    channelName: user ? `habits:${user.id}` : "habits:noop",
    table: "habits",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchAll,
    skip: !user,
  });

  useRealtimeSubscription({
    channelName: user ? `habit_logs:${user.id}` : "habit_logs:noop",
    table: "habit_logs",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchLogs,
    skip: !user,
  });

  async function addHabit(name: string, emoji: string = "✅") {
    if (!user) return;
    const nextOrder = habits.length > 0 ? Math.max(...habits.map((h) => h.sort_order)) + 1 : 0;

    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name,
      emoji,
      sort_order: nextOrder,
    });
    if (error) throw error;
    await fetchHabits();
  }

  async function deleteHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) {
      await fetchHabits();
      throw error;
    }
  }

  async function toggleLog(habitId: string, date: string) {
    if (!user) return;
    const existing = logs.find((l) => l.habit_id === habitId && l.date === date);

    if (existing) {
      // Remove log
      setLogs((prev) => prev.filter((l) => l.id !== existing.id));
      const { error } = await supabase.from("habit_logs").delete().eq("id", existing.id);
      if (error) {
        await fetchLogs();
        throw error;
      }
    } else {
      // Add log
      const optimistic: HabitLog = {
        id: crypto.randomUUID(),
        habit_id: habitId,
        user_id: user.id,
        date,
        created_at: new Date().toISOString(),
      };
      setLogs((prev) => [...prev, optimistic]);

      const { error } = await supabase.from("habit_logs").insert({
        habit_id: habitId,
        user_id: user.id,
        date,
      });
      if (error) {
        setLogs((prev) => prev.filter((l) => l.id !== optimistic.id));
        throw error;
      }
      await fetchLogs();
    }
  }

  // Calculate streak for a habit
  function getStreak(habitId: string): number {
    const habitLogs = logs
      .filter((l) => l.habit_id === habitId)
      .map((l) => l.date)
      .sort()
      .reverse();

    if (habitLogs.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const checkDate = new Date(today);

    // Check if today is completed; if not, start from yesterday
    const todayStr = checkDate.toISOString().slice(0, 10);
    if (!habitLogs.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (habitLogs.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  return {
    habits,
    logs,
    loading,
    addHabit,
    deleteHabit,
    toggleLog,
    getStreak,
  };
}
