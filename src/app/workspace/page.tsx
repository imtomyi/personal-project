"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useAuth } from "@/context/AuthContext";
import { useAllWorkspaceTodos, getWorkspaceColorByKey } from "@/hooks/useAllWorkspaceTodos";
import type { WorkspaceTodo } from "@/hooks/useAllWorkspaceTodos";
import { useCanvasCalendar } from "@/hooks/useCanvasCalendar";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { parseLocalDate, todayKST, toDateStr, getDurationInDays } from "@/lib/date";
import { useWsWidgetConfig } from "@/hooks/useWsWidgetConfig";
import type { WsWidgetId } from "@/lib/workspace-widgets";
import Header from "@/components/Header";
import WorkspaceList from "@/components/WorkspaceList";
import WorkspaceCalendar from "@/components/WorkspaceCalendar";
import ExerciseWidget from "@/components/widgets/ExerciseWidget";
import DdayWidget from "@/components/widgets/DdayWidget";
import HabitWidget from "@/components/widgets/HabitWidget";
import GoalWidget from "@/components/widgets/GoalWidget";
import WsWidgetPicker from "@/components/widgets/WsWidgetPicker";
import SortableWsWidget from "@/components/widgets/SortableWsWidget";
import { useDdayEntries } from "@/hooks/useDdayEntries";
import RoutineManager from "@/components/RoutineManager";
import OverdueTasksAlert from "@/components/OverdueTasksAlert";
import DailySchedule from "@/components/DailySchedule";
import DailyPlanTriage from "@/components/DailyPlanTriage";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { useCarryOverPlans } from "@/hooks/useCarryOverPlans";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useHabits } from "@/hooks/useHabits";
import { useToast } from "@/context/ToastContext";
import { sortTodosBySchedulePriority, estimateMinutes } from "@/lib/autoScheduler";
import type { Todo } from "@/lib/types";

export default function WorkspacesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { todos, workspaces, loading: todosLoading, addTodo: addAllTodo, updateTodo: updateAllTodo } = useAllWorkspaceTodos();
  const { canvasTodos, canvasCourses, isConnected: canvasConnected, loading: canvasLoading } = useCanvasCalendar();
  const { entries: ddayEntries } = useDdayEntries();
  const { showToast } = useToast();
  const [showRoutineManager, setShowRoutineManager] = useState(false);
  const [showOverdueAlert, setShowOverdueAlert] = useState(false);

  // ── 통합 시간표용 hooks ──
  const {
    plans: dailyPlans,
    triagedTodoIds,
    addPlan,
    addPlanBatch,
    skipTodo,
    updateSchedule: updateDailySchedule,
  } = useDailyPlan();
  const { carriedOverCount, isProcessing: carryOverProcessing } = useCarryOverPlans();
  const { tasks: allRecurringTasks } = useRecurringTasks();
  const { habitsWithTime } = useHabits();
  const [showTriage, setShowTriage] = useState(false);
  const todayStr = todayKST();

  // ── 워크스페이스 맵 (시간표 블록에 워크스페이스 이름 표시용) ──
  const workspaceMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const ws of workspaces) {
      map.set(ws.id, { name: ws.name, color: (ws as Record<string, unknown>).color as string ?? "blue" });
    }
    return map;
  }, [workspaces]);

  // ── 이월 토스트 ──
  useEffect(() => {
    if (carriedOverCount > 0) {
      showToast(`어제 미완료 ${carriedOverCount}개 할 일이 오늘로 이월되었습니다`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriedOverCount]);

  // ── 전체 워크스페이스 자동 배치 (하루 1회) ──
  useEffect(() => {
    if (todosLoading || carryOverProcessing) return;
    const key = "auto_dist_global";
    try {
      if (localStorage.getItem(key) === todayStr) return;
    } catch {
      return;
    }

    const scheduledIds = new Set(dailyPlans.map((p) => p.todo_id));
    const unplanned = todos.filter(
      (t: WorkspaceTodo) =>
        !t.is_completed &&
        !t.parent_id &&
        t.description !== SECTION_HEADER_MARKER &&
        t.due_date &&
        t.due_date <= todayStr &&
        !scheduledIds.has(t.id),
    );
    if (unplanned.length === 0) {
      try { localStorage.setItem(key, todayStr); } catch { /* ignore */ }
      return;
    }

    const sorted = sortTodosBySchedulePriority(unplanned, todayStr);
    const items = sorted.map((t) => ({
      todoId: t.id,
      estimatedMinutes: estimateMinutes(t),
    }));
    addPlanBatch(items).then(() => {
      try { localStorage.setItem(key, todayStr); } catch { /* ignore */ }
      showToast(`${items.length}개 할 일이 자동으로 시간표에 배치되었습니다`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosLoading, carryOverProcessing, dailyPlans, todayStr]);

  // ── 시간표 핸들러 ──
  const handleAutoDistributeTodayTasks = useCallback(async (todayTodos: Todo[]) => {
    const sorted = sortTodosBySchedulePriority(todayTodos, todayStr);
    const items = sorted.map((t) => ({
      todoId: t.id,
      estimatedMinutes: estimateMinutes(t),
    }));
    await addPlanBatch(items);
    showToast(`${sorted.length}개 할 일이 시간표에 배치되었습니다`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr, addPlanBatch]);

  const handleScheduleUpdateTodo = useCallback(async (id: string, updates: Partial<Pick<Todo, "is_completed" | "status">>) => {
    await updateAllTodo(id, updates);
  }, [updateAllTodo]);

  // ── 지연된 할 일 (전체 워크스페이스 통합) ──
  const overdueTodos = useMemo(() => {
    if (todosLoading) return [];
    return todos.filter(
      (t: WorkspaceTodo) =>
        t.description !== SECTION_HEADER_MARKER &&
        !t.is_completed &&
        t.due_date &&
        toDateStr(parseLocalDate(t.due_date)) < todayStr,
    );
  }, [todos, todosLoading, todayStr]);

  // 하루 1회 지연 할일 알림 (메인 페이지 진입 시)
  useEffect(() => {
    if (todosLoading || overdueTodos.length === 0) return;
    try {
      const shownDate = localStorage.getItem("overdue_alert_shown_date");
      if (shownDate !== todayStr) {
        setShowOverdueAlert(true);
      }
    } catch {
      // localStorage 접근 불가 시 무시
    }
  }, [todosLoading, overdueTodos.length, todayStr]);

  // 지연 할일 핸들러
  const handleOverdueDefer = useCallback(async (todoId: string) => {
    await updateAllTodo(todoId, { due_date: todayStr });
  }, [updateAllTodo, todayStr]);

  const handleOverdueDeferAll = useCallback(async () => {
    for (const todo of overdueTodos) {
      await updateAllTodo(todo.id, { due_date: todayStr });
    }
  }, [overdueTodos, updateAllTodo, todayStr]);

  const handleOverdueComplete = useCallback(async (todoId: string) => {
    await updateAllTodo(todoId, { is_completed: true });
    showToast("완료 처리되었습니다");
  }, [updateAllTodo, showToast]);

  const handleOverdueAlertClose = useCallback(() => {
    try {
      localStorage.setItem("overdue_alert_shown_date", todayStr);
    } catch {
      // ignore
    }
    setShowOverdueAlert(false);
  }, [todayStr]);

  // renderWidget — component 내부에서 todos 접근 가능
  function renderWidget(id: WsWidgetId) {
    switch (id) {
      case "exercise":
        return <ExerciseWidget />;
      case "dday":
        return <DdayWidget />;
      case "habit":
        return <HabitWidget onOpenRoutineManager={() => setShowRoutineManager(true)} />;
      case "goals":
        return <GoalWidget allTodos={todos} />;
      case "daily-schedule":
        return null; // 통합 시간표가 캘린더 아래에 배치됨
      default:
        return null;
    }
  }

  // Merge workspace todos + canvas assignments
  const mergedTodos = [...todos, ...canvasTodos];

  // 서브 헤더용 빠른 카운트
  const realTodoCount = todos.filter((t: WorkspaceTodo) => t.description !== SECTION_HEADER_MARKER).length;
  const overdueCount = todosLoading ? 0 : mergedTodos.filter((t: WorkspaceTodo) => {
    if ((t.source !== "canvas" && t.description === SECTION_HEADER_MARKER) || !t.due_date || t.is_completed) return false;
    const start = parseLocalDate(t.due_date);
    const durDays = getDurationInDays(t.duration_days);
    const end = new Date(start);
    end.setDate(end.getDate() + durDays - 1);
    return toDateStr(end) < todayKST();
  }).length;
  const todayCount = todosLoading ? 0 : mergedTodos.filter((t: WorkspaceTodo) => {
    if ((t.source !== "canvas" && t.description === SECTION_HEADER_MARKER) || !t.due_date || t.is_completed) return false;
    const today = todayKST();
    const start = parseLocalDate(t.due_date);
    const durDays = getDurationInDays(t.duration_days);
    const end = new Date(start);
    end.setDate(end.getDate() + durDays - 1);
    return toDateStr(start) <= today && toDateStr(end) >= today;
  }).length;

  // 오늘 요약 데이터
  const todayStats = useMemo(() => {
    const today = todayKST();
    const real = mergedTodos.filter(
      (t: WorkspaceTodo) => (t.source === "canvas" || t.description !== SECTION_HEADER_MARKER) && t.due_date
    );
    const dueToday = real.filter((t: WorkspaceTodo) => {
      if (!t.due_date || t.is_completed) return false;
      // due_date = 시작일, duration만큼 앞으로
      const start = parseLocalDate(t.due_date);
      const durDays = getDurationInDays(t.duration_days);
      const end = new Date(start);
      end.setDate(end.getDate() + durDays - 1);
      return toDateStr(start) <= today && toDateStr(end) >= today;
    });
    const overdue = real.filter((t: WorkspaceTodo) => {
      if (!t.due_date || t.is_completed) return false;
      // due_date = 시작일, 마감 = 시작 + duration
      const start = parseLocalDate(t.due_date);
      const durDays = getDurationInDays(t.duration_days);
      const end = new Date(start);
      end.setDate(end.getDate() + durDays - 1);
      return toDateStr(end) < today;
    });
    const completedToday = real.filter((t: WorkspaceTodo) => {
      if (!t.due_date || !t.is_completed) return false;
      return toDateStr(parseLocalDate(t.due_date)) === today;
    });
    return { dueToday, overdue, completedToday };
  }, [mergedTodos]);

  // 워크스페이스별 진행률
  const wsProgress = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    todos.forEach((t: WorkspaceTodo) => {
      if (t.description === SECTION_HEADER_MARKER) return;
      const wsId = t.workspace_id;
      if (!map.has(wsId)) map.set(wsId, { total: 0, completed: 0 });
      const entry = map.get(wsId)!;
      entry.total++;
      if (t.is_completed) entry.completed++;
    });
    return map;
  }, [todos]);

  // 워크스페이스별 다음 마감 할일
  const wsNextTodo = useMemo(() => {
    const today = todayKST();
    const map = new Map<string, { title: string; dueLabel: string; isOverdue: boolean }>();
    // 마감일순 정렬 — due_date = 시작일이므로 마감 = 시작 + duration
    const sorted = todos
      .filter((t: WorkspaceTodo) => t.description !== SECTION_HEADER_MARKER && t.due_date && !t.is_completed)
      .map((t: WorkspaceTodo) => {
        const s = parseLocalDate(t.due_date!);
        const dur = getDurationInDays(t.duration_days);
        const e = new Date(s); e.setDate(e.getDate() + dur - 1);
        return { ...t, _endDate: e, _endStr: toDateStr(e) };
      })
      .sort((a, b) => a._endStr.localeCompare(b._endStr));

    for (const t of sorted) {
      if (map.has(t.workspace_id)) continue;
      const diffMs = t._endDate.getTime() - parseLocalDate(today).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays < 0;
      let dueLabel: string;
      if (diffDays < 0) dueLabel = `${Math.abs(diffDays)}일 지남`;
      else if (diffDays === 0) dueLabel = "오늘";
      else if (diffDays === 1) dueLabel = "내일";
      else if (diffDays <= 7) dueLabel = `D-${diffDays}`;
      else dueLabel = `${t._endDate.getMonth() + 1}/${t._endDate.getDate()}`;
      map.set(t.workspace_id, { title: t.title, dueLabel, isOverdue });
    }
    return map;
  }, [todos]);

  // 홈 메인 영역: 다가오는 할 일 (지연 + 가까운 마감일 최대 6개)
  type UpcomingItem = WorkspaceTodo & { _daysLeft: number; _dueLabel: string };
  const upcomingTodos = useMemo<UpcomingItem[]>(() => {
    const today = todayKST();
    const items = mergedTodos
      .filter((t: WorkspaceTodo) =>
        (t.source === "canvas" || t.description !== SECTION_HEADER_MARKER) &&
        t.due_date && !t.is_completed
      )
      .map((t: WorkspaceTodo) => {
        // due_date = 시작일, 마감 = 시작 + duration
        const startDate = parseLocalDate(t.due_date!);
        const durDays = getDurationInDays(t.duration_days);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durDays - 1);
        const diffMs = endDate.getTime() - parseLocalDate(today).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        let dueLabel: string;
        if (diffDays < 0) dueLabel = `${Math.abs(diffDays)}일 지남`;
        else if (diffDays === 0) dueLabel = "오늘 마감";
        else if (diffDays === 1) dueLabel = "내일 마감";
        else if (diffDays <= 7) dueLabel = `D-${diffDays}`;
        else dueLabel = `${endDate.getMonth() + 1}/${endDate.getDate()}`;
        return { ...t, _daysLeft: diffDays, _dueLabel: dueLabel };
      })
      // 지연(과거) → 오늘 → 가까운 미래 순으로 정렬
      .sort((a, b) => a._daysLeft - b._daysLeft)
      // 최대 6개
      .slice(0, 6);
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedTodos]);

  // 색상 매핑 (upcomingTodos에서 사용)
  const upcomingColorMap = useMemo(() => {
    const map = new Map<string, { bg: string; text: string }>();
    workspaces.forEach((w) => {
      const c = getWorkspaceColorByKey(w.color);
      map.set(w.id, { bg: c.bg, text: c.text });
    });
    return map;
  }, [workspaces]);

  // 주간 리뷰 통계
  const weeklyStats = useMemo(() => {
    const today = todayKST();
    const todayDate = parseLocalDate(today);
    const dayOfWeek = todayDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + mondayOffset);
    const weekStartStr = toDateStr(weekStart);

    const real = mergedTodos.filter(
      (t: WorkspaceTodo) => (t.source === "canvas" || t.description !== SECTION_HEADER_MARKER)
    );

    // 이번 주 기간에 활성인 할 일 (시작~마감이 이번 주와 겹치는 것)
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekStart.getDate() + 6);
    const weekEndStr = toDateStr(weekEndDate);

    const weekTasks = real.filter((t: WorkspaceTodo) => {
      if (!t.due_date) return false;
      const start = parseLocalDate(t.due_date);
      const durDays = getDurationInDays(t.duration_days);
      const end = new Date(start);
      end.setDate(end.getDate() + durDays - 1);
      return toDateStr(end) >= weekStartStr && toDateStr(start) <= weekEndStr;
    });

    const weekCompleted = weekTasks.filter((t) => t.is_completed).length;
    const weekTotal = weekTasks.length;
    const weekOverdue = weekTasks.filter((t) => {
      if (t.is_completed) return false;
      const start = parseLocalDate(t.due_date!);
      const durDays = getDurationInDays(t.duration_days);
      const end = new Date(start);
      end.setDate(end.getDate() + durDays - 1);
      return toDateStr(end) < today;
    }).length;

    // 요일별 완료 수 (월~일)
    const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=월

    return { weekCompleted, weekTotal, weekOverdue, dayLabels, dayIndex, weekStart: weekStartStr, weekEnd: weekEndStr };
  }, [mergedTodos]);

  // 워크스페이스별 통계 (대시보드용)
  const wsStats = useMemo(() => {
    return workspaces.map((w) => {
      const progress = wsProgress.get(w.id) || { total: 0, completed: 0 };
      const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
      const c = getWorkspaceColorByKey(w.color);
      return { id: w.id, name: w.name, ...progress, pct, color: c };
    }).filter((w) => w.total > 0);
  }, [workspaces, wsProgress]);

  const {
    widgets,
    visibleWidgets,
    isEditing,
    setIsEditing,
    toggleWidget,
    reorderWidgets,
    resetConfig,
  } = useWsWidgetConfig();

  // Quick add todo
  const [quickTitle, setQuickTitle] = useState("");
  const [quickWsId, setQuickWsId] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  // Set default workspace when workspaces load
  useEffect(() => {
    if (workspaces.length > 0 && !quickWsId) {
      setQuickWsId(workspaces[0].id);
    }
  }, [workspaces, quickWsId]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim() || !quickWsId) return;
    setQuickAdding(true);
    try {
      await addAllTodo(quickWsId, quickTitle.trim());
      setQuickTitle("");
    } catch (err) {
      console.error("Quick add failed:", err);
    }
    setQuickAdding(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
    const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderWidgets(oldIndex, newIndex);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#5856D6]/[0.07] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#5856D6]/[0.12] dark:via-[#111827] dark:to-[#111827]">
        <div className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-[#007AFF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#5856D6]/[0.07] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#5856D6]/[0.12] dark:via-[#111827] dark:to-[#111827]">
      <Header />

      {/* 워크스페이스 서브 헤더 */}
      <div className="border-b border-[#5856D6]/[0.08] bg-gradient-to-r from-[#5856D6]/[0.03] via-white/80 to-white/80 backdrop-blur-xl backdrop-saturate-[1.8] dark:border-[#5856D6]/[0.15] dark:from-[#5856D6]/[0.08] dark:via-[#111827]/80 dark:to-[#111827]/80">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          <div className="flex items-center gap-3 py-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#5856D6] shadow-[0_2px_8px_rgba(88,86,214,0.25)]">
                <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-foreground sm:text-[17px] dark:text-white">
                  워크스페이스
                </h1>
                <p className="text-[11px] text-[#5856D6]/60 sm:text-[12px] dark:text-[#a5a4f3]/60">
                  {workspaces.length}개 워크스페이스 · {realTodoCount}개 할 일
                </p>
              </div>
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              {!todosLoading && overdueCount > 0 && (
                <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[12px] font-medium text-red-600 dark:text-red-400">
                  지연 {overdueCount}개
                </span>
              )}
              {!todosLoading && todayCount > 0 && (
                <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium text-foreground dark:bg-white/[0.08] dark:text-white">
                  📌 오늘 {todayCount}개
                </span>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium sm:px-4 ${
                  isEditing
                    ? "bg-[#5856D6] text-white dark:bg-[#5856D6]"
                    : "bg-[#5856D6]/[0.08] text-[#5856D6] hover:bg-[#5856D6]/[0.12] dark:bg-[#5856D6]/[0.15] dark:text-[#a5a4f3] dark:hover:bg-[#5856D6]/[0.22]"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">{isEditing ? "완료" : "위젯 편집"}</span>
              </button>
            </div>
          </div>
          {/* 빠른 요약 바 */}
          <div className="-mx-5 flex items-center gap-1 overflow-x-auto px-5 pb-2.5 sm:-mx-8 sm:px-8">
            {wsStats.length > 0 && wsStats.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium text-secondary transition-colors hover:bg-[#5856D6]/[0.08] hover:text-[#5856D6] dark:hover:bg-[#5856D6]/[0.15] dark:hover:text-[#a5a4f3]"
              >
                <span className={`h-2 w-2 rounded-full ${ws.pct === 100 ? "bg-emerald-500" : "bg-[#007AFF]"}`} />
                {ws.name}
                <span className="text-[10px] text-[#aeaeb2]">{ws.pct}%</span>
              </Link>
            ))}
            {wsStats.length === 0 && !todosLoading && (
              <span className="px-2 py-1 text-[12px] text-secondary">워크스페이스를 만들어 할 일을 관리하세요</span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 pb-8 pt-6 sm:px-8 sm:pt-8">

        {/* Widget picker (edit mode) */}
        {isEditing && (
          <div className="mb-4">
            <WsWidgetPicker
              widgets={widgets}
              onToggle={toggleWidget}
              onReset={resetConfig}
              onClose={() => setIsEditing(false)}
            />
          </div>
        )}

        {/* 빠른 할 일 추가 */}
        {workspaces.length > 0 && (
          <form onSubmit={handleQuickAdd} className="mb-6">
            <div className="flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]">
              <select
                value={quickWsId}
                onChange={(e) => setQuickWsId(e.target.value)}
                className="max-w-[120px] truncate rounded-lg border-0 bg-black/[0.04] px-2 py-1.5 text-[12px] font-medium text-foreground outline-none sm:max-w-[160px] dark:bg-white/[0.08] dark:text-white"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                id="quick-add-input"
                placeholder="할 일 추가..."
                className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder-secondary/60 outline-none dark:text-white"
                disabled={quickAdding}
              />
              <button
                type="submit"
                disabled={!quickTitle.trim() || quickAdding}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#5856D6] text-white transition-all hover:bg-[#4a48c4] disabled:opacity-30"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </form>
        )}

        {/* 다가오는 할 일 */}
        {!todosLoading && upcomingTodos.length > 0 && (
          <div className="card-surface mb-6 p-4 sm:mb-8 sm:p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground sm:mb-5 sm:text-[17px] dark:text-white">
              다가오는 할 일
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingTodos.map((item) => {
                const color = upcomingColorMap.get(item.workspace_id);
                return (
                  <Link
                    key={item.id}
                    href={item.source === "canvas" ? "/khu" : `/workspace/${item.workspace_id}`}
                    className="group flex items-start gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3.5 transition-all hover:bg-[#ededf0] active:scale-[0.98] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                  >
                    <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold ${color?.bg ?? "bg-blue-100 dark:bg-blue-900/30"} ${color?.text ?? "text-blue-600 dark:text-blue-400"}`}>
                      {item.source === "canvas" ? "📚" : item.workspace_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-foreground dark:text-white">
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item._daysLeft < 0
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : item._daysLeft <= 1
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : item._daysLeft <= 3
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-black/[0.04] text-secondary dark:bg-white/[0.06]"
                        }`}>
                          {item._dueLabel}
                        </span>
                        <span className="truncate text-[11px] text-[#aeaeb2]">{item.workspace_name}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Side-by-side layout: Calendar (left) + Sidebar (right) */}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Calendar */}
          <div className="min-w-0 flex-1">
            <WorkspaceCalendar
              todos={mergedTodos}
              workspaces={workspaces}
              loading={todosLoading && canvasLoading}
              canvasConnected={canvasConnected}
              canvasCourses={canvasCourses}
              ddayEntries={ddayEntries}
              onUpdateTodo={updateAllTodo}
            />
          </div>

          {/* Right sidebar */}
          <div className="w-full flex-shrink-0 lg:w-80 xl:w-[340px]">
            <div className="space-y-6">
              {/* ① 오늘 요약 카드 */}
              {!todosLoading && (todayStats.dueToday.length > 0 || todayStats.overdue.length > 0 || todayStats.completedToday.length > 0) && (
                <div className="card-surface p-5">
                  <h2 className="mb-4 text-[15px] font-semibold text-foreground dark:text-white">
                    오늘
                  </h2>

                  {/* 지연 항목 */}
                  {todayStats.overdue.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="text-[12px] font-medium text-red-600 dark:text-red-400">지연 {todayStats.overdue.length}개</span>
                      </div>
                      <div className="space-y-0.5">
                        {todayStats.overdue.slice(0, 3).map((t: WorkspaceTodo) => (
                          <Link
                            key={t.id}
                            href={t.source === "canvas" ? "/khu" : `/workspace/${t.workspace_id}`}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-red-700 hover:bg-red-500/[0.06] dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <span className="truncate flex-1">{t.title}</span>
                            <span className="flex-shrink-0 text-[11px] text-[#aeaeb2]">{t.workspace_name}</span>
                          </Link>
                        ))}
                        {todayStats.overdue.length > 3 && (
                          <span className="px-3 text-[11px] text-[#aeaeb2]">+{todayStats.overdue.length - 3}개 더</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 오늘 마감 */}
                  {todayStats.dueToday.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-[11px]">📌</span>
                        <span className="text-[12px] font-medium text-foreground dark:text-[#e5e5e7]">진행 중 {todayStats.dueToday.length}개</span>
                      </div>
                      <div className="space-y-0.5">
                        {todayStats.dueToday.slice(0, 4).map((t: WorkspaceTodo) => (
                          <Link
                            key={t.id}
                            href={t.source === "canvas" ? "/khu" : `/workspace/${t.workspace_id}`}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-foreground hover:bg-black/[0.03] dark:text-[#e5e5e7] dark:hover:bg-white/[0.05]"
                          >
                            {t.source === "canvas" && <span className="text-[10px]">📚</span>}
                            <span className="truncate flex-1">{t.title}</span>
                            <span className="flex-shrink-0 text-[11px] text-[#aeaeb2]">{t.workspace_name}</span>
                          </Link>
                        ))}
                        {todayStats.dueToday.length > 4 && (
                          <span className="px-3 text-[11px] text-[#aeaeb2]">+{todayStats.dueToday.length - 4}개 더</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 오늘 완료 */}
                  {todayStats.completedToday.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/[0.08] px-3 py-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                        오늘 {todayStats.completedToday.length}개 완료
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Workspace list */}
              <div>
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-secondary">
                  워크스페이스
                </h2>
                <WorkspaceList layout="sidebar" wsProgress={wsProgress} workspaceColors={workspaces} wsNextTodo={wsNextTodo} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 통합 시간표 (캘린더 아래) ── */}
        <div className="mt-8">
          <DailySchedule
            todos={todos}
            recurringTasks={allRecurringTasks}
            onUpdate={handleScheduleUpdateTodo}
            habits={habitsWithTime}
            dailyPlans={dailyPlans}
            onOpenTriage={() => setShowTriage(true)}
            onScheduleUpdate={updateDailySchedule}
            onAutoDistributeTodayTasks={handleAutoDistributeTodayTasks}
            workspaceMap={workspaceMap}
          />
        </div>

        {/* 트리아지 모달 */}
        {showTriage && (
          <DailyPlanTriage
            todos={todos}
            triagedTodoIds={triagedTodoIds}
            onPlan={addPlan}
            onSkip={skipTodo}
            onComplete={() => {}}
            onClose={() => setShowTriage(false)}
          />
        )}

        {/* ── 위젯 영역 (전체 폭 2열 그리드) ── */}
        {visibleWidgets.length > 0 && (
          <div className="mt-8">
            {isEditing ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleWidgets.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    {visibleWidgets.map((w) => (
                      <SortableWsWidget
                        key={w.id}
                        id={w.id}
                        isEditing={true}
                        onRemove={toggleWidget}
                      >
                        {renderWidget(w.id)}
                      </SortableWsWidget>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {visibleWidgets.map((w) => (
                  <div key={w.id}>{renderWidget(w.id)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 하단: 통계 대시보드 + 주간 리뷰 ── */}
        {!todosLoading && (wsStats.length > 0 || weeklyStats.weekTotal > 0) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* 워크스페이스별 진행률 */}
            {wsStats.length > 0 && (
              <div className="card-surface p-6">
                <h2 className="mb-5 text-[15px] font-semibold text-foreground dark:text-white">
                  워크스페이스 진행률
                </h2>
                <div className="space-y-4">
                  {wsStats.map((ws) => (
                    <Link key={ws.id} href={`/workspace/${ws.id}`} className="group block">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-foreground group-hover:text-[#007AFF] dark:text-white dark:group-hover:text-[#64d2ff]">
                          {ws.name}
                        </span>
                        <span className="text-[12px] text-secondary">
                          {ws.completed}/{ws.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${ws.pct}%`,
                            backgroundColor: ws.pct === 100 ? "#34c759" : "#007AFF",
                          }}
                        />
                      </div>
                      <div className="mt-1 text-right">
                        <span className={`text-[11px] font-medium ${ws.pct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-secondary"}`}>
                          {ws.pct}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 주간 리뷰 */}
            {weeklyStats.weekTotal > 0 && (
              <div className="card-surface p-6">
                <h2 className="mb-5 text-[15px] font-semibold text-foreground dark:text-white">
                  이번 주 리뷰
                </h2>

                {/* 큰 숫자 요약 */}
                <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl bg-[#007AFF]/[0.06] p-3 text-center sm:p-4 dark:bg-[#007AFF]/[0.12]">
                    <p className="text-[20px] font-bold text-[#007AFF] sm:text-[24px]">{weeklyStats.weekTotal}</p>
                    <p className="text-[10px] text-secondary sm:text-[11px]">전체</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/[0.06] p-3 text-center sm:p-4 dark:bg-emerald-500/[0.12]">
                    <p className="text-[20px] font-bold text-emerald-600 sm:text-[24px] dark:text-emerald-400">{weeklyStats.weekCompleted}</p>
                    <p className="text-[10px] text-secondary sm:text-[11px]">완료</p>
                  </div>
                  <div className={`rounded-2xl p-3 text-center sm:p-4 ${weeklyStats.weekOverdue > 0 ? "bg-red-500/[0.06] dark:bg-red-500/[0.12]" : "bg-black/[0.02] dark:bg-white/[0.04]"}`}>
                    <p className={`text-[20px] font-bold sm:text-[24px] ${weeklyStats.weekOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-secondary"}`}>{weeklyStats.weekOverdue}</p>
                    <p className="text-[10px] text-secondary sm:text-[11px]">지연</p>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] text-secondary">주간 완료율</span>
                    <span className="text-[13px] font-semibold text-foreground dark:text-white">
                      {weeklyStats.weekTotal > 0 ? Math.round((weeklyStats.weekCompleted / weeklyStats.weekTotal) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#007AFF] to-[#5ac8fa] transition-all duration-700"
                      style={{ width: `${weeklyStats.weekTotal > 0 ? Math.round((weeklyStats.weekCompleted / weeklyStats.weekTotal) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* 요일 인디케이터 */}
                <div className="mt-5 flex justify-between">
                  {weeklyStats.dayLabels.map((day, i) => (
                    <div key={day} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${i === weeklyStats.dayIndex ? "text-[#007AFF]" : "text-secondary"}`}>
                        {day}
                      </span>
                      <div className={`h-2 w-2 rounded-full ${
                        i < weeklyStats.dayIndex
                          ? "bg-[#007AFF]"
                          : i === weeklyStats.dayIndex
                            ? "bg-[#007AFF] ring-[3px] ring-[#007AFF]/20"
                            : "bg-black/[0.06] dark:bg-white/[0.1]"
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showOverdueAlert && overdueTodos.length > 0 && (
        <OverdueTasksAlert
          overdueTodos={overdueTodos}
          onDefer={handleOverdueDefer}
          onComplete={handleOverdueComplete}
          onSkip={() => {}}
          onDeferAll={handleOverdueDeferAll}
          onClose={handleOverdueAlertClose}
        />
      )}

      {showRoutineManager && (
        <RoutineManager onClose={() => setShowRoutineManager(false)} />
      )}
    </div>
  );
}
