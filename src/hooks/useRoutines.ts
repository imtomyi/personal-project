"use client";

import { useMemo, useCallback } from "react";
import { useHabits } from "./useHabits";
import { useRecurringTasks } from "./useRecurringTasks";
import type { Routine, RecurrenceType, Habit, HabitLog } from "@/lib/types";

/**
 * 통합 루틴 훅: 습관 + 반복 할일을 하나의 리스트로 관리
 * 내부적으로 두 테이블(habits, recurring_tasks)을 유지하면서 UI는 통합 제공
 */
export function useRoutines(workspaceId?: string) {
  const {
    habits,
    habitsWithTime,
    logs,
    loading: habitsLoading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleLog,
    getStreak,
  } = useHabits();

  const {
    tasks: recurringTasks,
    loading: recurringLoading,
    addRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
  } = useRecurringTasks(workspaceId);

  const loading = habitsLoading || recurringLoading;

  // 통합 루틴 리스트
  const routines = useMemo<Routine[]>(() => {
    const habitRoutines: Routine[] = habits.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      mode: "habit" as const,
      recurrence: (h.frequency === "daily" || h.frequency === "weekdays" || h.frequency === "weekly"
        ? h.frequency
        : "daily") as RecurrenceType,
      days_of_week: h.days_of_week ?? [],
      time_start: h.time_start,
      time_end: h.time_end,
      is_active: h.is_active,
      sort_order: h.sort_order,
      workspace_id: null,
      priority: null,
      description: null,
      _source: "habits" as const,
    }));

    const taskRoutines: Routine[] = recurringTasks.map((t) => ({
      id: t.id,
      name: t.title,
      emoji: "🔁",
      mode: "task" as const,
      recurrence: t.recurrence,
      days_of_week: t.days_of_week,
      time_start: t.time_start,
      time_end: t.time_end,
      is_active: t.is_active,
      sort_order: t.sort_order,
      workspace_id: t.workspace_id,
      priority: t.priority,
      description: t.description,
      _source: "recurring_tasks" as const,
    }));

    return [...habitRoutines, ...taskRoutines].sort((a, b) => a.sort_order - b.sort_order);
  }, [habits, recurringTasks]);

  // CRUD 통합
  const addRoutine = useCallback(
    async (data: {
      name: string;
      emoji: string;
      mode: "habit" | "task";
      recurrence: RecurrenceType;
      days_of_week: number[];
      time_start: string | null;
      time_end: string | null;
      workspace_id?: string | null;
      priority?: number | null;
      description?: string | null;
    }) => {
      if (data.mode === "habit") {
        await addHabit(data.name, data.emoji, {
          time_start: data.time_start ?? undefined,
          time_end: data.time_end ?? undefined,
          days_of_week: data.days_of_week.length > 0 ? data.days_of_week : undefined,
          frequency: (data.recurrence === "daily" || data.recurrence === "weekdays" || data.recurrence === "weekly")
            ? data.recurrence
            : "daily",
        });
      } else {
        await addRecurringTask({
          title: data.name,
          description: data.description ?? null,
          workspace_id: data.workspace_id ?? workspaceId ?? null,
          priority: data.priority ?? null,
          recurrence: data.recurrence,
          days_of_week: data.days_of_week,
          time_start: data.time_start,
          time_end: data.time_end,
          is_active: true,
        });
      }
    },
    [addHabit, addRecurringTask, workspaceId],
  );

  const updateRoutine = useCallback(
    async (
      routine: Routine,
      updates: Partial<{
        name: string;
        emoji: string;
        recurrence: RecurrenceType;
        days_of_week: number[];
        time_start: string | null;
        time_end: string | null;
        is_active: boolean;
      }>,
    ) => {
      if (routine._source === "habits") {
        await updateHabit(routine.id, {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.emoji !== undefined ? { emoji: updates.emoji } : {}),
          ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
          ...(updates.time_start !== undefined ? { time_start: updates.time_start } : {}),
          ...(updates.time_end !== undefined ? { time_end: updates.time_end } : {}),
          ...(updates.days_of_week !== undefined ? { days_of_week: updates.days_of_week } : {}),
          ...(updates.recurrence !== undefined ? { frequency: updates.recurrence as Habit["frequency"] } : {}),
        });
      } else {
        await updateRecurringTask(routine.id, {
          ...(updates.name !== undefined ? { title: updates.name } : {}),
          ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
          ...(updates.recurrence !== undefined ? { recurrence: updates.recurrence } : {}),
          ...(updates.days_of_week !== undefined ? { days_of_week: updates.days_of_week } : {}),
          ...(updates.time_start !== undefined ? { time_start: updates.time_start } : {}),
          ...(updates.time_end !== undefined ? { time_end: updates.time_end } : {}),
        });
      }
    },
    [updateHabit, updateRecurringTask],
  );

  const deleteRoutine = useCallback(
    async (routine: Routine) => {
      if (routine._source === "habits") {
        await deleteHabit(routine.id);
      } else {
        await deleteRecurringTask(routine.id);
      }
    },
    [deleteHabit, deleteRecurringTask],
  );

  return {
    routines,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    // 습관 전용 패스스루
    toggleLog,
    getStreak,
    logs,
    habits,
    habitsWithTime,
    // 스케줄 전용 패스스루
    recurringTasks,
  };
}
