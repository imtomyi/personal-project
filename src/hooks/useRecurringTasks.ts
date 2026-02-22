"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { todayKST, parseLocalDate } from "@/lib/date";
import type { RecurringTask } from "@/lib/types";

export function useRecurringTasks(workspaceId?: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const generatedRef = useRef(false);

  // workspaceId 변경 시 generatedRef 리셋 → 새 워크스페이스에서도 할 일 생성 가능
  useEffect(() => {
    generatedRef.current = false;
  }, [workspaceId]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("recurring_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch recurring tasks:", error);
      setLoading(false);
      return; // 기존 state 유지, 빈 배열로 덮어쓰지 않음
    }
    setTasks(data ?? []);
    setLoading(false);
  }, [user, workspaceId, supabase]);

  useRealtimeSubscription({
    channelName: user ? `recurring:${user.id}:${workspaceId ?? "all"}` : "recurring:noop",
    table: "recurring_tasks",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchTasks,
    skip: !user,
  });

  // Auto-generate today's todos from recurring tasks
  useEffect(() => {
    if (!user || loading || generatedRef.current) return;

    const generateTodos = async () => {
      try {
        const today = todayKST();
        const dayOfWeek = parseLocalDate(today).getDay(); // 0=Sun..6=Sat (KST)

        const activeTasks = tasks.filter((t) => t.is_active);
        if (activeTasks.length === 0) {
          generatedRef.current = true;
          return;
        }

        // Check which recurring tasks should fire today
        const todayTasks = activeTasks.filter((t) => {
          switch (t.recurrence) {
            case "daily":
              return true;
            case "weekdays":
              return dayOfWeek >= 1 && dayOfWeek <= 5;
            case "weekly":
              return t.days_of_week.includes(dayOfWeek);
            case "custom":
              return t.days_of_week.includes(dayOfWeek);
            default:
              return false;
          }
        });

        if (todayTasks.length === 0) {
          generatedRef.current = true;
          return;
        }

        // Check which ones already have todos generated today
        const recurringIds = todayTasks.map((t) => t.id);
        const { data: existingTodos } = await supabase
          .from("todos")
          .select("recurring_task_id")
          .in("recurring_task_id", recurringIds)
          .eq("due_date", today);

        const existingSet = new Set(
          (existingTodos ?? []).map((t: { recurring_task_id: string }) => t.recurring_task_id)
        );

        const toCreate = todayTasks.filter((t) => !existingSet.has(t.id));
        if (toCreate.length === 0) {
          generatedRef.current = true;
          return;
        }

        // Create todos for each
        const todosToInsert = toCreate.map((t) => ({
          workspace_id: t.workspace_id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          created_by: user.id,
          due_date: today,
          duration_days: 24,
          sort_order: 0,
          recurring_task_id: t.id,
          status: "todo",
        }));

        // Only insert if workspace_id is not null
        const validInserts = todosToInsert.filter((t) => t.workspace_id);
        if (validInserts.length > 0) {
          await supabase.from("todos").insert(validInserts);
        }

        // 성공 시에만 generatedRef 설정 → 실패 시 재시도 가능
        generatedRef.current = true;
      } catch (err) {
        console.error("Failed to generate recurring todos:", err);
        // generatedRef를 설정하지 않아 다음 렌더에서 재시도
      }
    };

    generateTodos();
  }, [user, loading, tasks, supabase]);

  async function addRecurringTask(
    task: Omit<RecurringTask, "id" | "user_id" | "sort_order" | "created_at">
  ) {
    if (!user) return;
    const nextOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) + 1 : 0;

    const { error } = await supabase.from("recurring_tasks").insert({
      user_id: user.id,
      ...task,
      sort_order: nextOrder,
    });
    if (error) throw error;
    await fetchTasks();
  }

  async function updateRecurringTask(
    id: string,
    updates: Partial<Pick<RecurringTask, "title" | "description" | "recurrence" | "days_of_week" | "time_start" | "time_end" | "is_active" | "priority" | "workspace_id">>
  ) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    const { error } = await supabase
      .from("recurring_tasks")
      .update(updates)
      .eq("id", id);
    if (error) {
      await fetchTasks();
      throw error;
    }
  }

  async function deleteRecurringTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // FK 제약: todos 테이블에서 이 반복일정을 참조하는 행의 recurring_task_id를 null로 변경
    await supabase.from("todos").update({ recurring_task_id: null }).eq("recurring_task_id", id);
    const { error } = await supabase.from("recurring_tasks").delete().eq("id", id);
    if (error) {
      await fetchTasks();
      throw error;
    }
  }

  return {
    tasks,
    loading,
    addRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
  };
}
