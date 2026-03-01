"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { Habit, HabitLog } from "@/lib/types";

const HABITS_STORAGE_KEY = "ws_habits_data";
const HABIT_CHECKS_STORAGE_KEY = "ws_habit_checks_data";

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const migratedRef = useRef(false);

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setHabits(data ?? []);
    setLoading(false);

    // 1회성 localStorage → Supabase 마이그레이션
    if (!migratedRef.current) {
      migratedRef.current = true;
      try {
        const storedHabits = localStorage.getItem(HABITS_STORAGE_KEY);
        if (storedHabits && (!data || data.length === 0)) {
          const localHabits = JSON.parse(storedHabits) as Array<{
            id: string;
            name: string;
            emoji: string;
            createdAt?: string;
          }>;
          if (localHabits.length > 0) {
            const toInsert = localHabits.map((h, i) => ({
              user_id: user.id,
              name: h.name,
              emoji: h.emoji || "✅",
              sort_order: i,
              is_active: true,
            }));
            await supabase.from("habits").insert(toInsert);
            localStorage.removeItem(HABITS_STORAGE_KEY);
            localStorage.removeItem(HABIT_CHECKS_STORAGE_KEY);
            // Re-fetch
            const { data: newData } = await supabase
              .from("habits")
              .select("*")
              .eq("user_id", user.id)
              .order("sort_order", { ascending: true });
            setHabits(newData ?? []);
          }
        } else if (storedHabits && data && data.length > 0) {
          // Supabase에 이미 데이터가 있으면 localStorage 정리
          localStorage.removeItem(HABITS_STORAGE_KEY);
          localStorage.removeItem(HABIT_CHECKS_STORAGE_KEY);
        }
      } catch {
        // 마이그레이션 실패 시 무시
      }
    }
  }, [user, supabase]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    // Fetch last 30 days of logs for streak calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("habit_logs")
      .select("id, habit_id, date")
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
    onChanged: fetchHabits,
    skip: !user,
  });

  useRealtimeSubscription({
    channelName: user ? `habit_logs:${user.id}` : "habit_logs:noop",
    table: "habit_logs",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchLogs,
    skip: !user,
  });

  async function addHabit(
    name: string,
    emoji: string = "✅",
    options?: { time_start?: string; time_end?: string; days_of_week?: number[]; frequency?: "daily" | "weekdays" | "weekly" },
  ) {
    if (!user) return;
    const nextOrder = habits.length > 0 ? Math.max(...habits.map((h) => h.sort_order)) + 1 : 0;

    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name,
      emoji,
      sort_order: nextOrder,
      frequency: options?.frequency || "daily",
      time_start: options?.time_start || null,
      time_end: options?.time_end || null,
      days_of_week: options?.days_of_week || null,
    });
    if (error) throw error;
    await fetchHabits();
  }

  async function updateHabit(
    id: string,
    updates: Partial<Pick<Habit, "name" | "emoji" | "frequency" | "is_active" | "time_start" | "time_end" | "days_of_week">>,
  ) {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
    const { error } = await supabase.from("habits").update(updates).eq("id", id);
    if (error) {
      await fetchHabits();
      throw error;
    }
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

  // 시간표 연동용: 활성 습관 전체 (시간 미설정 시 자동 배치)
  const habitsWithTime = habits.filter((h) => h.is_active);

  return {
    habits,
    habitsWithTime,
    logs,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleLog,
    getStreak,
  };
}
