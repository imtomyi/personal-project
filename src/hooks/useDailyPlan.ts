"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { todayKST } from "@/lib/date";
import type { DailyPlan } from "@/lib/types";

export function useDailyPlan(dateStr?: string) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const targetDate = dateStr || todayKST();

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", targetDate)
      .order("sort_order", { ascending: true });
    setPlans(data ?? []);
    setLoading(false);
  }, [user, targetDate, supabase]);

  useRealtimeSubscription({
    channelName: user ? `daily_plans:${user.id}:${targetDate}` : "dp:noop",
    table: "daily_plans",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchPlans,
    skip: !user,
  });

  // "오늘 할 일" 선택 시
  async function addPlan(todoId: string, estimatedMinutes: number) {
    if (!user) return;
    const nextOrder =
      plans.length > 0 ? Math.max(...plans.map((p) => p.sort_order)) + 1 : 0;

    const optimistic: DailyPlan = {
      id: crypto.randomUUID(),
      user_id: user.id,
      todo_id: todoId,
      date: targetDate,
      estimated_minutes: estimatedMinutes,
      scheduled_start_min: null,
      scheduled_end_min: null,
      is_skipped: false,
      sort_order: nextOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setPlans((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("daily_plans").insert({
      user_id: user.id,
      todo_id: todoId,
      date: targetDate,
      estimated_minutes: estimatedMinutes,
      sort_order: nextOrder,
    });
    if (error) {
      setPlans((prev) => prev.filter((p) => p.id !== optimistic.id));
      throw error;
    }
    await fetchPlans();
  }

  // 일괄 추가 (자동 배치용)
  async function addPlanBatch(
    items: { todoId: string; estimatedMinutes: number }[],
  ) {
    if (!user || items.length === 0) return;
    const baseOrder =
      plans.length > 0 ? Math.max(...plans.map((p) => p.sort_order)) + 1 : 0;
    const rows = items.map((item, i) => ({
      user_id: user.id,
      todo_id: item.todoId,
      date: targetDate,
      estimated_minutes: item.estimatedMinutes,
      sort_order: baseOrder + i,
    }));
    const { error } = await supabase
      .from("daily_plans")
      .upsert(rows, { onConflict: "todo_id,date" });
    if (!error) await fetchPlans();
  }

  // "오늘 안 함" 선택 시
  async function skipTodo(todoId: string) {
    if (!user) return;

    const optimistic: DailyPlan = {
      id: crypto.randomUUID(),
      user_id: user.id,
      todo_id: todoId,
      date: targetDate,
      estimated_minutes: 0,
      scheduled_start_min: null,
      scheduled_end_min: null,
      is_skipped: true,
      sort_order: 999,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setPlans((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("daily_plans").upsert(
      {
        user_id: user.id,
        todo_id: todoId,
        date: targetDate,
        estimated_minutes: 0,
        is_skipped: true,
        sort_order: 999,
      },
      { onConflict: "todo_id,date" },
    );
    if (error) {
      setPlans((prev) => prev.filter((p) => p.id !== optimistic.id));
      throw error;
    }
    await fetchPlans();
  }

  // 드래그/리사이즈 후 시간 업데이트
  async function updateSchedule(
    planId: string,
    startMin: number,
    endMin: number,
  ) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              scheduled_start_min: startMin,
              scheduled_end_min: endMin,
              estimated_minutes: endMin - startMin,
            }
          : p,
      ),
    );
    const { error } = await supabase
      .from("daily_plans")
      .update({
        scheduled_start_min: startMin,
        scheduled_end_min: endMin,
        estimated_minutes: endMin - startMin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId);
    if (error) {
      await fetchPlans();
      throw error;
    }
  }

  // 자동 배치 결과 일괄 저장
  async function batchUpdateSchedules(
    updates: { id: string; startMin: number; endMin: number }[],
  ) {
    // Optimistic
    setPlans((prev) =>
      prev.map((p) => {
        const upd = updates.find((u) => u.id === p.id);
        return upd
          ? {
              ...p,
              scheduled_start_min: upd.startMin,
              scheduled_end_min: upd.endMin,
            }
          : p;
      }),
    );
    // Persist each
    for (const upd of updates) {
      await supabase
        .from("daily_plans")
        .update({
          scheduled_start_min: upd.startMin,
          scheduled_end_min: upd.endMin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", upd.id);
    }
  }

  // 계획 삭제
  async function removePlan(planId: string) {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    const { error } = await supabase
      .from("daily_plans")
      .delete()
      .eq("id", planId);
    if (error) {
      await fetchPlans();
      throw error;
    }
  }

  // 시간표 새로고침 — 모든 활성 plan의 시간 배정을 초기화하여 재배치 트리거
  async function refreshSchedule() {
    const active = plans.filter((p) => !p.is_skipped && p.estimated_minutes > 0);
    if (active.length === 0) return;

    // Optimistic: 모든 scheduled_start_min/end_min → null
    setPlans((prev) =>
      prev.map((p) =>
        !p.is_skipped && p.estimated_minutes > 0
          ? { ...p, scheduled_start_min: null, scheduled_end_min: null }
          : p,
      ),
    );

    // DB 일괄 업데이트
    const ids = active.map((p) => p.id);
    await supabase
      .from("daily_plans")
      .update({
        scheduled_start_min: null,
        scheduled_end_min: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    await fetchPlans();
  }

  // 활성 계획 (스킵 제외)
  const activePlans = useMemo(
    () => plans.filter((p) => !p.is_skipped && p.estimated_minutes > 0),
    [plans],
  );

  // 이미 트리아지된 할일 ID 목록
  const triagedTodoIds = useMemo(
    () => new Set(plans.map((p) => p.todo_id)),
    [plans],
  );

  return {
    plans,
    activePlans,
    triagedTodoIds,
    loading,
    addPlan,
    addPlanBatch,
    skipTodo,
    updateSchedule,
    batchUpdateSchedules,
    removePlan,
    refreshSchedule,
    refetch: fetchPlans,
  };
}
