"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { Goal, Todo } from "@/lib/types";

export type GoalTodoStats = {
  total: number;
  completed: number;
  progress: number; // 0-100
};

export function useGoals(allTodos?: Todo[]) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setGoals(data ?? []);
    setLoading(false);
  }, [user, supabase]);

  /** 각 goal에 연결된 할일 통계 */
  const goalTodoStatsMap = useMemo(() => {
    const map = new Map<string, GoalTodoStats>();
    if (!allTodos) return map;
    for (const goal of goals) {
      const linked = allTodos.filter((t) => t.goal_id === goal.id);
      if (linked.length === 0) continue;
      const completedCount = linked.filter((t) => t.is_completed).length;
      map.set(goal.id, {
        total: linked.length,
        completed: completedCount,
        progress: Math.round((completedCount / linked.length) * 100),
      });
    }
    return map;
  }, [goals, allTodos]);

  useRealtimeSubscription({
    channelName: user ? `goals:${user.id}` : "goals:noop",
    table: "goals",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchGoals,
    skip: !user,
  });

  async function addGoal(title: string, emoji: string = "🎯", targetDate?: string) {
    if (!user) return;
    const nextOrder = goals.length > 0 ? Math.max(...goals.map((g) => g.sort_order)) + 1 : 0;

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      title,
      emoji,
      target_date: targetDate || null,
      sort_order: nextOrder,
    });
    if (error) throw error;
    await fetchGoals();
  }

  async function updateGoal(id: string, updates: Partial<Pick<Goal, "title" | "emoji" | "progress" | "status" | "target_date">>) {
    // Optimistic
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));

    const { error } = await supabase
      .from("goals")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      await fetchGoals();
      throw error;
    }
  }

  async function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      await fetchGoals();
      throw error;
    }
  }

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    goalTodoStatsMap,
  };
}
