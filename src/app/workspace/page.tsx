"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
import { parseLocalDate, todayKST, toDateStr, getDurationInDays, parseNaturalDate } from "@/lib/date";
import { useWsWidgetConfig } from "@/hooks/useWsWidgetConfig";
import type { WsWidgetId } from "@/lib/workspace-widgets";
import Header from "@/components/layout/Header";
import WorkspaceList from "@/components/workspace/WorkspaceList";
import WorkspaceCalendar from "@/components/calendar/WorkspaceCalendar";
import ExerciseWidget from "@/components/widgets/ExerciseWidget";
import DdayWidget from "@/components/widgets/DdayWidget";
import HabitWidget from "@/components/widgets/HabitWidget";
import GoalWidget from "@/components/widgets/GoalWidget";
import WsWidgetPicker from "@/components/widgets/WsWidgetPicker";
import SortableWsWidget from "@/components/widgets/SortableWsWidget";
import { useDdayEntries } from "@/hooks/useDdayEntries";
import RoutineManager from "@/components/planning/RoutineManager";
import PomodoroTimer from "@/components/planning/PomodoroTimer";
import { createClient } from "@/lib/supabase";
import OverdueTasksAlert from "@/components/todo/OverdueTasksAlert";
import DailySchedule from "@/components/planning/DailySchedule";
import DailyPlanTriage from "@/components/planning/DailyPlanTriage";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { useCarryOverPlans } from "@/hooks/useCarryOverPlans";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useHabits } from "@/hooks/useHabits";
import { useToast } from "@/context/ToastContext";
import { sortTodosBySchedulePriority, estimateMinutes, type ScheduleBlock } from "@/lib/autoScheduler";
import { DURATION_PRESETS, DEFAULT_DURATION_HOURS } from "@/lib/constants";
import DatePicker from "@/components/calendar/DatePicker";
import TimePicker from "@/components/planning/TimePicker";
import type { Todo } from "@/lib/types";
import OnboardingModal from "@/components/workspace/OnboardingModal";

export default function WorkspacesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { todos, workspaces, loading: todosLoading, addTodo: addAllTodo, updateTodo: updateAllTodo, archiveWorkspace, addWorkspaceLocally } = useAllWorkspaceTodos();
  const { canvasTodos, canvasCourses, classEvents, isConnected: canvasConnected, loading: canvasLoading } = useCanvasCalendar();
  const { entries: ddayEntries, updateEntry: updateDdayEntry } = useDdayEntries();
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
    unskipTodo,
    updateSchedule: updateDailySchedule,
    removePlan,
    refreshSchedule,
  } = useDailyPlan();
  const { carriedOverCount, isProcessing: carryOverProcessing } = useCarryOverPlans();
  const { tasks: allRecurringTasks, deleteRecurringTask } = useRecurringTasks();
  const { habitsWithTime, toggleLog, logs: habitLogs } = useHabits();
  const [showTriage, setShowTriage] = useState(false);
  const todayStr = todayKST();

  // ── Canvas 과목명 매핑 (시간표 수업 블록용) ──
  const courseNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of canvasCourses) {
      map.set(`course_${c.id}`, c.name);
    }
    return map;
  }, [canvasCourses]);

  // ── 오늘 디데이 항목 필터 (시간표 연동) ──
  const todayDdayEntries = useMemo(
    () => ddayEntries.filter((e) => e.date === todayStr),
    [ddayEntries, todayStr],
  );

  // ── 활성/아카이브 워크스페이스 분리 ──
  const activeWorkspaces = useMemo(() => workspaces.filter((w) => !w.is_archived), [workspaces]);
  const archivedWorkspaces = useMemo(() => workspaces.filter((w) => w.is_archived), [workspaces]);
  const [showArchived, setShowArchived] = useState(false);
  // 다가오는 할 일 카드 완료 애니메이션
  const [exitingUpcomingIds, setExitingUpcomingIds] = useState<Set<string>>(new Set());

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
  const autoDistRef = useRef(false);
  useEffect(() => {
    if (todosLoading || carryOverProcessing || autoDistRef.current) return;
    const key = "auto_dist_global";
    try {
      if (localStorage.getItem(key) === todayStr) {
        autoDistRef.current = true;
        return;
      }
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
        !scheduledIds.has(t.id) &&
        !t.recurring_task_id, // 반복일정에서 자동 생성된 할일은 제외 (이미 recurring 블록으로 표시됨)
    );
    if (unplanned.length === 0) {
      try { localStorage.setItem(key, todayStr); } catch { /* ignore */ }
      autoDistRef.current = true;
      return;
    }

    autoDistRef.current = true; // 실행 전에 설정하여 이중 호출 방지
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

  const deletingIdsRef = useRef(new Set<string>());
  const handleDeleteRecurringTask = useCallback(async (id: string) => {
    if (deletingIdsRef.current.has(id)) return; // 이중 삭제 방지
    deletingIdsRef.current.add(id);
    try {
      await deleteRecurringTask(id);
      showToast("반복일정이 삭제되었습니다", "success");
    } catch {
      showToast("삭제 실패", "error");
    } finally {
      deletingIdsRef.current.delete(id);
    }
  }, [deleteRecurringTask, showToast]);

  // ── 내일로 넘기기 핸들러 ──
  const handlePostponeTodos = useCallback(async (todoIds: string[]) => {
    if (todoIds.length === 0) return;
    const tomorrow = (() => {
      const d = parseLocalDate(todayStr);
      d.setDate(d.getDate() + 1);
      return toDateStr(d);
    })();

    // 되돌리기용: 기존 due_date와 plan minutes 저장
    const prevDates = new Map<string, string | null>();
    const planMinutes = new Map<string, number>();
    for (const todoId of todoIds) {
      const todo = todos.find((t: WorkspaceTodo) => t.id === todoId);
      if (todo) prevDates.set(todoId, todo.due_date);
      const plan = dailyPlans?.find((p) => p.todo_id === todoId && !p.is_skipped);
      if (plan) planMinutes.set(todoId, plan.estimated_minutes);
    }

    // 1) due_date → 내일, 2) 오늘 plan skip
    await Promise.all(
      todoIds.flatMap((todoId) => [
        updateAllTodo(todoId, { due_date: tomorrow }),
        skipTodo(todoId),
      ]),
    );

    showToast(
      `${todoIds.length}개 할 일이 내일로 넘겨졌습니다`,
      "success",
      {
        label: "되돌리기",
        onClick: async () => {
          await Promise.all(
            todoIds.flatMap((todoId) => [
              updateAllTodo(todoId, { due_date: prevDates.get(todoId) ?? todayStr }),
              unskipTodo(todoId, planMinutes.get(todoId) ?? 30),
            ]),
          );
          showToast("되돌리기 완료");
        },
      },
    );
  }, [todayStr, todos, dailyPlans, updateAllTodo, skipTodo, unskipTodo, showToast]);

  // ── 시간표에서 제거 (되돌리기 지원) ──
  const handleRemoveFromSchedule = useCallback(async (planId: string, block: ScheduleBlock) => {
    const plan = dailyPlans?.find((p) => p.id === planId);
    const savedMinutes = plan?.estimated_minutes ?? (block.endMin - block.startMin);
    const savedStart = plan?.scheduled_start_min ?? block.startMin;
    const savedEnd = plan?.scheduled_end_min ?? block.endMin;
    const todoId = block.todoId;

    await removePlan(planId);

    showToast("시간표에서 제거되었습니다", "info", {
      label: "되돌리기",
      onClick: async () => {
        if (!todoId) return;
        await addPlan(todoId, savedMinutes);
        // 재배치 후 원래 시간 복원
        const freshPlans = dailyPlans ?? [];
        const restored = freshPlans.find((p) => p.todo_id === todoId && !p.is_skipped);
        if (restored) {
          await updateDailySchedule(restored.id, savedStart, savedEnd);
        }
        showToast("되돌리기 완료");
      },
    });
  }, [dailyPlans, removePlan, addPlan, updateDailySchedule, showToast]);

  // ── 시간대 변경 ──
  const handleRescheduleBlock = useCallback(async (planId: string, startMin: number, endMin: number) => {
    await updateDailySchedule(planId, startMin, endMin);
    showToast("시간대가 변경되었습니다");
  }, [updateDailySchedule, showToast]);

  // ── stale plan 자동 정리 (날짜 변경/완료/삭제된 todo의 daily_plan 제거) ──
  const handleCleanupStalePlans = useCallback(async (planIds: string[]) => {
    if (planIds.length === 0) return;
    await Promise.all(planIds.map((id) => removePlan(id)));
  }, [removePlan]);

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
  const [quickExpanded, setQuickExpanded] = useState(false);
  const [quickDueDate, setQuickDueDate] = useState(todayKST());
  const [quickDuration, setQuickDuration] = useState(DEFAULT_DURATION_HOURS);
  const [quickDueTime, setQuickDueTime] = useState("");

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
      const { cleaned, date: parsedDate } = parseNaturalDate(quickTitle.trim());
      const finalTitle = parsedDate ? cleaned : quickTitle.trim();
      const finalDueDate = parsedDate ?? quickDueDate;
      await addAllTodo(quickWsId, finalTitle, finalDueDate, quickDuration, quickDueTime || undefined);
      setQuickTitle("");
      setQuickDueDate(todayKST());
      setQuickDuration(DEFAULT_DURATION_HOURS);
      setQuickDueTime("");
      setQuickExpanded(false);
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
      <OnboardingModal />
      <Header />

      {/* 워크스페이스 서브 헤더 */}
      <div className="border-b border-[#5856D6]/[0.08] bg-gradient-to-r from-[#5856D6]/[0.03] via-white/80 to-white/80 backdrop-blur-xl backdrop-saturate-[1.8] dark:border-[#5856D6]/[0.15] dark:from-[#5856D6]/[0.08] dark:via-[#111827]/80 dark:to-[#111827]/80">
        <div className="mx-auto max-w-[1400px] overflow-x-clip px-4 sm:px-8">
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
                  {activeWorkspaces.length}개 워크스페이스 · {realTodoCount}개 할 일
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
          <div className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-2.5 sm:-mx-8 sm:px-8">
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
            <div className={`rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-all dark:border-white/[0.08] dark:bg-[#1c1c1e] ${quickExpanded ? "ring-2 ring-[#5856D6]/20" : ""}`}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <select
                  value={quickWsId}
                  onChange={(e) => setQuickWsId(e.target.value)}
                  className="max-w-[120px] truncate rounded-lg border-0 bg-black/[0.04] px-2 py-1.5 text-[12px] font-medium text-foreground outline-none sm:max-w-[160px] dark:bg-white/[0.08] dark:text-white"
                >
                  {activeWorkspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onFocus={() => setQuickExpanded(true)}
                  id="quick-add-input"
                  autoComplete="off"
                  placeholder="할 일 추가..."
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder-secondary/60 outline-none dark:text-white"
                  disabled={quickAdding}
                />
                {quickExpanded && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickExpanded(false);
                      setQuickDueDate(todayKST());
                      setQuickDuration(DEFAULT_DURATION_HOURS);
                      setQuickDueTime("");
                    }}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.08]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}
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
              {/* 확장 패널: 날짜 + 기간 */}
              {quickExpanded && (
                <div className="border-t border-black/[0.04] px-3 pb-3 pt-2.5 dark:border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {/* 시작일 */}
                    <div className="flex items-center gap-1.5">
                      <DatePicker value={quickDueDate} onChange={setQuickDueDate} disabled={quickAdding} inline />
                    </div>
                    {/* 기간 pill */}
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 flex-shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex flex-wrap gap-1">
                        {DURATION_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setQuickDuration(preset.value)}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                              quickDuration === preset.value
                                ? "bg-[#5856D6] text-white shadow-sm"
                                : "text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 선호 시간 */}
                    <div className="flex items-center gap-1.5">
                      <TimePicker
                        value={quickDueTime}
                        onChange={setQuickDueTime}
                        onClear={() => setQuickDueTime("")}
                        disabled={quickAdding}
                        compact
                        placeholder="시간"
                      />
                    </div>
                  </div>
                </div>
              )}
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
              {upcomingTodos.filter(item => !exitingUpcomingIds.has(item.id) || true).map((item) => {
                const color = upcomingColorMap.get(item.workspace_id);
                const isExiting = exitingUpcomingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`group relative flex items-start gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3.5 transition-all dark:bg-white/[0.06] ${isExiting ? "scale-95 opacity-0 duration-300" : "hover:bg-[#ededf0] active:scale-[0.98] dark:hover:bg-white/[0.1]"}`}
                  >
                    {/* 체크 버튼 */}
                    {item.source !== "canvas" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExitingUpcomingIds(prev => new Set(prev).add(item.id));
                          setTimeout(() => {
                            updateAllTodo(item.id, { is_completed: true, status: "done" });
                          }, 300);
                        }}
                        className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-600 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
                      >
                        <svg className="h-3 w-3 text-transparent group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <Link
                      href={item.source === "canvas" ? "/khu" : `/workspace/${item.workspace_id}`}
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold ${color?.bg ?? "bg-blue-100 dark:bg-blue-900/30"} ${color?.text ?? "text-blue-600 dark:text-blue-400"}`}>
                        {item.source === "canvas" ? "📚" : item.workspace_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[14px] font-medium text-foreground dark:text-white ${isExiting ? "line-through" : ""}`}>
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Side-by-side layout: Calendar + Schedule (left) + Sidebar (right) */}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Calendar + 오늘 시간표 */}
          <div className="min-w-0 flex-1 space-y-6">
            <WorkspaceCalendar
              todos={mergedTodos}
              workspaces={workspaces}
              loading={todosLoading && canvasLoading}
              canvasConnected={canvasConnected}
              canvasCourses={canvasCourses}
              ddayEntries={ddayEntries}
              onUpdateTodo={updateAllTodo}
              recurringTasks={allRecurringTasks}
              onDeleteRecurringTask={handleDeleteRecurringTask}
              onOpenRoutineManager={() => setShowRoutineManager(true)}
            />
            <DailySchedule
              todos={todos}
              recurringTasks={allRecurringTasks}
              onUpdate={handleScheduleUpdateTodo}
              habits={habitsWithTime}
              dailyPlans={dailyPlans}
              onOpenTriage={() => setShowTriage(true)}
              onScheduleUpdate={updateDailySchedule}
              onAutoDistributeTodayTasks={handleAutoDistributeTodayTasks}
              onRefreshSchedule={refreshSchedule}
              workspaceMap={workspaceMap}
              ddayEntries={todayDdayEntries}
              onDeleteRecurringTask={handleDeleteRecurringTask}
              onOpenRoutineManager={() => setShowRoutineManager(true)}
              onPostponeTodos={handlePostponeTodos}
              onRemoveFromSchedule={handleRemoveFromSchedule}
              onRescheduleBlock={handleRescheduleBlock}
              onCleanupStalePlans={handleCleanupStalePlans}
              habitLogs={habitLogs}
              onHabitToggle={toggleLog}
              classEvents={classEvents}
              courseNames={courseNames}
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

              {/* Workspace list — 활성 */}
              <div>
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-secondary">
                  워크스페이스
                </h2>
                <WorkspaceList
                  layout="sidebar"
                  wsProgress={wsProgress}
                  workspaceColors={activeWorkspaces}
                  wsNextTodo={wsNextTodo}
                  onArchive={archiveWorkspace}
                  filterWorkspaces={activeWorkspaces}
                  onWorkspaceCreated={addWorkspaceLocally}
                />
              </div>

              {/* Workspace list — 아카이브 */}
              {archivedWorkspaces.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="mb-2 flex w-full items-center gap-1.5 text-[12px] font-medium text-secondary transition-colors hover:text-foreground"
                  >
                    <svg
                      className={`h-3 w-3 transition-transform ${showArchived ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    아카이브 ({archivedWorkspaces.length})
                  </button>
                  {showArchived && (
                    <WorkspaceList
                      layout="sidebar"
                      wsProgress={wsProgress}
                      workspaceColors={archivedWorkspaces}
                      wsNextTodo={wsNextTodo}
                      onArchive={archiveWorkspace}
                      filterWorkspaces={archivedWorkspaces}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 위젯 ── */}
        <div className="mt-8">
          {visibleWidgets.length > 0 && (
            <div className="flex-1 min-w-0">
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
                    <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
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
                <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
                  {visibleWidgets.map((w) => (
                    <div key={w.id} className="min-w-0">{renderWidget(w.id)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
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

      <PomodoroTimer
        todos={todos.filter((t) => !t.is_completed && t.description !== "__section_header__").map((t) => ({ id: t.id, title: t.title }))}
        onWorkSessionComplete={async (todoId: string, durationSec: number) => {
          if (!user) return;
          const todo = todos.find((t) => t.id === todoId);
          const supabase = createClient();
          await supabase.from("time_entries").insert({
            user_id: user.id,
            todo_id: todoId,
            workspace_id: todo?.workspace_id ?? "",
            started_at: new Date(Date.now() - durationSec * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            duration_sec: durationSec,
          });
        }}
      />
    </div>
  );
}
