"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { Goal } from "@/lib/types";

export function useGoals() {
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
  };
}
