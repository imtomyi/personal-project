"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useRealtimeTodos } from "@/hooks/useRealtimeTodos";
import type { Workspace, Member, Todo } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { nowKST, toDateStr, parseLocalDate } from "@/lib/date";
import Header from "@/components/layout/Header";
import AddTodo from "@/components/todo/AddTodo";
import TodoList from "@/components/todo/TodoList";
import CalendarView from "@/components/calendar/CalendarView";
import MemberList from "@/components/workspace/MemberList";
import OnlineUsers from "@/components/workspace/OnlineUsers";
import InviteModal from "@/components/workspace/InviteModal";
import ApplyTemplateModal from "@/components/planning/ApplyTemplateModal";
import EisenhowerMatrix from "@/components/planning/EisenhowerMatrix";
import KanbanBoard from "@/components/planning/KanbanBoard";
import RoutineManager from "@/components/planning/RoutineManager";
import PomodoroTimer from "@/components/planning/PomodoroTimer";
import KeyboardShortcuts from "@/components/layout/KeyboardShortcuts";
import CommandPalette from "@/components/layout/CommandPalette";
import { useTheme } from "@/context/ThemeContext";
import { useReminders } from "@/hooks/useReminders";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useAssignments } from "@/hooks/useAssignments";
import { useCanvasCalendar } from "@/hooks/useCanvasCalendar";
import { useHabits } from "@/hooks/useHabits";
import { useGoals } from "@/hooks/useGoals";
import { WORKSPACE_COLOR_KEYS, WORKSPACE_COLOR_MAP, getWorkspaceColorByKey } from "@/hooks/useAllWorkspaceTodos";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { toggleTheme } = useTheme();
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [view, setView] = useState<"list" | "calendar" | "matrix" | "kanban">("list");
  const [showRecurring, setShowRecurring] = useState(false);

  const { todos, loading: todosLoading, addTodo, addSubtask, updateTodo, deleteTodo, reorderTodos, applyTemplate } =
    useRealtimeTodos(workspaceId);

  useReminders(todos);

  const { tasks: recurringTasks } = useRecurringTasks(workspaceId);
  const { assignments } = useAssignments();
  const { classEvents, canvasCourses } = useCanvasCalendar();
  const { habitsWithTime } = useHabits();
  const { goals } = useGoals();
  // Canvas context_code → course name mapping
  const courseNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of canvasCourses) {
      map.set(`course_${c.id}`, c.name);
    }
    return map;
  }, [canvasCourses]);

  const fetchWorkspace = useCallback(async () => {
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();
    setWorkspace(data);
  }, [workspaceId, supabase]);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("members")
      .select("*, profiles:user_id(id, email, name, avatar_url)")
      .eq("workspace_id", workspaceId);
    setMembers(data ?? []);
  }, [workspaceId, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      Promise.all([fetchWorkspace(), fetchMembers()]).then(() =>
        setLoading(false)
      );
    }
  }, [user, authLoading, router, fetchWorkspace, fetchMembers]);

  async function handleAddTodo(title: string, description?: string, dueDate?: string, durationHours?: number, goalId?: string, dueTime?: string) {
    try {
      await addTodo(title, description, dueDate, durationHours, goalId, dueTime);
      showToast("할 일이 추가되었습니다");
    } catch {
      showToast("할 일 추가에 실패했습니다", "error");
    }
  }

  async function handleUpdateTodo(id: string, updates: Partial<Pick<Todo, "title" | "description" | "is_completed" | "assigned_to" | "due_date" | "due_time" | "duration_days" | "priority" | "status">>) {
    try {
      await updateTodo(id, updates);
      if (updates.is_completed !== undefined) {
        if (updates.is_completed) {
          showToast("✅ 완료", "success", {
            label: "되돌리기",
            onClick: () => updateTodo(id, { is_completed: false }),
          });
        } else {
          showToast("다시 열림");
        }
      }
    } catch {
      showToast("업데이트에 실패했습니다", "error");
    }
  }

  async function handleDeleteTodo(id: string) {
    try {
      await deleteTodo(id);
      showToast("삭제되었습니다");
    } catch {
      showToast("삭제에 실패했습니다", "error");
    }
  }

  function handleCalendarAddTodo(title: string, dueDate: string) {
    handleAddTodo(title, undefined, dueDate, 24);
  }

  function handleCommandAction(action: string) {
    switch (action) {
      case "add-todo":
        document.getElementById("add-todo-input")?.focus();
        break;
      case "view-list":
        setView("list");
        break;
      case "view-calendar":
        setView("calendar");
        break;
      case "view-kanban":
        setView("kanban");
        break;
      case "view-matrix":
        setView("matrix");
        break;
      case "go-workspaces":
        router.push("/workspace");
        break;
      case "go-settings":
        router.push("/settings");
        break;
      case "go-khu":
        router.push("/khu");
        break;
      case "go-budget":
        router.push("/budget");
        break;
      case "toggle-theme":
        toggleTheme();
        break;
    }
  }

  // ── 활성/완료 할 일 분리 (아카이브 용) ──
  // 하위 작업(parent_id)은 부모 아래에 표시되므로 항상 activeTodos에 포함
  const activeTodos = useMemo(() => todos.filter((t) => !t.is_completed || t.description === SECTION_HEADER_MARKER || !!t.parent_id), [todos]);
  const completedTodos = useMemo(
    () => todos.filter((t) => t.is_completed && t.description !== SECTION_HEADER_MARKER && !t.parent_id)
      .sort((a, b) => {
        // 최근 완료 순 (updated_at 기준)
        const aDate = a.updated_at || a.created_at;
        const bDate = b.updated_at || b.created_at;
        return bDate.localeCompare(aDate);
      }),
    [todos],
  );
  const [showCompleted, setShowCompleted] = useState(false);

  // Quick stats
  const realTodos = todos.filter((t) => t.description !== SECTION_HEADER_MARKER);
  const total = realTodos.length;
  const completed = realTodos.filter((t) => t.is_completed).length;
  const active = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const todayStr = toDateStr(nowKST());
  const overdueTodos = useMemo(
    () =>
      realTodos.filter(
        (t) => !t.is_completed && t.due_date && toDateStr(parseLocalDate(t.due_date)) < todayStr,
      ),
    [realTodos, todayStr],
  );
  const overdue = overdueTodos.length;

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#5856D6]/[0.07] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#5856D6]/[0.12] dark:via-[#111827] dark:to-[#111827]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-[#007AFF] border-t-transparent" />
          <span className="text-[13px] text-secondary">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#5856D6]/[0.07] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#5856D6]/[0.12] dark:via-[#111827] dark:to-[#111827]">
        <div className="text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <h2 className="text-[17px] font-semibold text-foreground dark:text-white">
            워크스페이스를 찾을 수 없습니다
          </h2>
          <Link href="/workspace" className="mt-3 inline-block text-[13px] text-[#007AFF] hover:text-[#0056b3]">
            ← 워크스페이스 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#5856D6]/[0.07] via-[#f5f5f7] to-[#f5f5f7] dark:from-[#5856D6]/[0.12] dark:via-[#111827] dark:to-[#111827]">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-5 sm:pt-8">
        {/* ── Top bar ── */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          {/* Left: title + breadcrumb */}
          <div>
            <Link
              href="/workspace"
              className="mb-1.5 inline-flex items-center gap-1 text-[12px] text-secondary hover:text-foreground dark:hover:text-white"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              워크스페이스
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker((v) => !v)}
                  className={`h-5 w-5 rounded-full transition-transform hover:scale-125 ${getWorkspaceColorByKey(workspace.color || "blue").dot}`}
                  title="색상 변경"
                />
                {showColorPicker && (
                  <div className="absolute left-0 top-8 z-50 rounded-xl border border-gray-200 bg-white p-2.5 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="grid grid-cols-6 gap-1.5">
                      {WORKSPACE_COLOR_KEYS.map((key) => (
                        <button
                          key={key}
                          onClick={async () => {
                            setWorkspace((prev) => prev ? { ...prev, color: key } : prev);
                            setShowColorPicker(false);
                            await supabase.from("workspaces").update({ color: key }).eq("id", workspaceId);
                          }}
                          className={`h-6 w-6 rounded-full transition-all ${WORKSPACE_COLOR_MAP[key].dot} ${
                            workspace.color === key ? "ring-2 ring-gray-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110" : "opacity-70 hover:opacity-100 hover:scale-110"
                          }`}
                          title={key}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-[28px] dark:text-white">
                {workspace.name}
              </h1>
            </div>
            {workspace.description && (
              <p className="mt-1 text-[13px] text-secondary">
                {workspace.description}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap items-center gap-2">
            <OnlineUsers workspaceId={workspaceId} />
            <MemberList
              workspaceId={workspaceId}
              members={members}
              onMembersChange={fetchMembers}
            />
            <button
              onClick={() => setShowRecurring(true)}
              className="rounded-xl bg-black/[0.05] p-2.5 text-secondary transition-colors hover:bg-black/[0.08] hover:text-foreground dark:bg-white/[0.1] dark:hover:bg-white/[0.15] dark:hover:text-white"
              title="루틴 관리"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setShowApplyTemplate(true)}
              className="rounded-xl bg-black/[0.05] p-2.5 text-secondary transition-colors hover:bg-black/[0.08] hover:text-foreground dark:bg-white/[0.1] dark:hover:bg-white/[0.15] dark:hover:text-white"
              title="템플릿"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>
            {members.some((m) => m.user_id === user?.id && (m.role === "owner" || m.role === "admin")) && (
              <button
                onClick={() => setShowInvite(true)}
                className="rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0056b3]"
              >
                초대
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ribbon ── */}
        {total > 0 && (
          <div className="card-surface mb-6 flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            {/* Progress ring */}
            <div className="relative flex-shrink-0">
              <svg className="h-10 w-10 -rotate-90 sm:h-12 sm:w-12" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-black/[0.06] dark:text-white/[0.1]" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeLinecap="round"
                  className="text-[#007AFF]"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground dark:text-white">
                {percentage}%
              </span>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] sm:gap-3 sm:text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#007AFF]" />
                <span className="font-medium text-foreground dark:text-[#e5e5e7]">{active} 진행</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground dark:text-[#e5e5e7]">{completed} 완료</span>
              </div>
              {overdue > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">{overdue} 지연</span>
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex w-full flex-shrink-0 rounded-xl bg-[#f5f5f7] p-1 sm:w-auto dark:bg-white/[0.06]">
              <button
                onClick={() => setView("list")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all sm:flex-none sm:gap-1.5 sm:px-3.5 ${
                  view === "list"
                    ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-[#2c2c2e] dark:text-white"
                    : "text-secondary hover:text-foreground dark:hover:text-white"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                목록
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all sm:flex-none sm:gap-1.5 sm:px-3.5 ${
                  view === "calendar"
                    ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-[#2c2c2e] dark:text-white"
                    : "text-secondary hover:text-foreground dark:hover:text-white"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                캘린더
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all sm:flex-none sm:gap-1.5 sm:px-3.5 ${
                  view === "kanban"
                    ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-[#2c2c2e] dark:text-white"
                    : "text-secondary hover:text-foreground dark:hover:text-white"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                칸반
              </button>
              <button
                onClick={() => setView("matrix")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all sm:flex-none sm:gap-1.5 sm:px-3.5 ${
                  view === "matrix"
                    ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-[#2c2c2e] dark:text-white"
                    : "text-secondary hover:text-foreground dark:hover:text-white"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                매트릭스
              </button>
            </div>
          </div>
        )}

        {/* ── Content area ── */}
        {todosLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-[2.5px] border-[#007AFF] border-t-transparent" />
          </div>
        ) : view === "list" ? (
          <div>
            {/* ── 반복 할 일 (루틴) ── */}
            {recurringTasks.filter((rt) => rt.is_active).length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {recurringTasks
                    .filter((rt) => rt.is_active)
                    .map((rt) => {
                      const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
                      const days = rt.days_of_week?.length
                        ? rt.days_of_week.map((d) => dayLabels[d]).join("·")
                        : rt.recurrence === "daily" ? "매일" : rt.recurrence === "weekdays" ? "주중" : "";
                      return (
                        <button
                          key={rt.id}
                          onClick={() => setShowRecurring(true)}
                          className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1.5 text-[12px] transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:hover:bg-violet-900/30"
                        >
                          <svg className="h-3 w-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="font-medium text-violet-700 dark:text-violet-300">{rt.title}</span>
                          {days && <span className="text-violet-500/70 dark:text-violet-400/60">{days}</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <AddTodo onAdd={handleAddTodo} goals={goals} />
            <TodoList
              todos={activeTodos}
              members={members}
              isTeam={members.length > 1}
              onUpdate={handleUpdateTodo}
              onDelete={handleDeleteTodo}
              onReorder={reorderTodos}
              onAddSubtask={addSubtask}
            />

            {/* ── 완료된 할 일 아카이브 ── */}
            {completedTodos.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="mb-3 flex w-full items-center gap-2 rounded-xl bg-emerald-500/[0.06] px-4 py-2.5 text-left transition-colors hover:bg-emerald-500/[0.1] dark:bg-emerald-500/[0.08] dark:hover:bg-emerald-500/[0.12]"
                >
                  <svg
                    className={`h-3.5 w-3.5 text-emerald-600 transition-transform dark:text-emerald-400 ${showCompleted ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                    완료된 할 일 ({completedTodos.length})
                  </span>
                </button>

                {showCompleted && (
                  <div className="space-y-1 rounded-xl border border-black/[0.04] bg-white/60 p-2 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    {completedTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        {/* Completed check */}
                        <button
                          onClick={() => handleUpdateTodo(todo.id, { is_completed: false })}
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 transition-colors hover:bg-emerald-600"
                          title="되돌리기"
                        >
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>

                        {/* Title */}
                        <span className="min-w-0 flex-1 truncate text-[13px] text-gray-400 line-through dark:text-gray-500">
                          {todo.title}
                        </span>

                        {/* Date */}
                        {todo.due_date && (
                          <span className="flex-shrink-0 text-[11px] text-gray-300 dark:text-gray-600">
                            {todo.due_date.replace(/-/g, ".")}
                          </span>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="flex-shrink-0 rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="삭제"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : view === "calendar" ? (
          <CalendarView
            todos={todos}
            onTodoClick={(todo) => handleUpdateTodo(todo.id, { is_completed: !todo.is_completed })}
            onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
            onDeleteTodo={handleDeleteTodo}
            onAddTodo={handleCalendarAddTodo}
          />
        ) : view === "kanban" ? (
          <KanbanBoard
            todos={todos}
            members={members}
            onUpdate={handleUpdateTodo}
            onDelete={handleDeleteTodo}
          />
        ) : (
          <EisenhowerMatrix
            todos={todos}
            onUpdate={handleUpdateTodo}
            onDelete={handleDeleteTodo}
          />
        )}

        {/* Empty state */}
        {!todosLoading && total === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-black/[0.08] py-16 dark:border-white/[0.08]">
            <div className="mb-3 text-4xl opacity-50">📝</div>
            <p className="text-[15px] font-medium text-foreground dark:text-white">
              아직 할 일이 없습니다
            </p>
            <p className="mt-1 text-[13px] text-secondary">
              위에서 할 일을 추가하거나 템플릿을 적용해보세요
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showInvite && workspace.invite_code && (
        <InviteModal
          workspaceId={workspaceId}
          workspaceName={workspace.name}
          inviteCode={workspace.invite_code}
          onClose={() => setShowInvite(false)}
        />
      )}
      {showApplyTemplate && (
        <ApplyTemplateModal
          onApply={applyTemplate}
          onClose={() => setShowApplyTemplate(false)}
        />
      )}
      {showRecurring && (
        <RoutineManager
          workspaceId={workspaceId}
          onClose={() => setShowRecurring(false)}
        />
      )}
      {/* Keyboard shortcuts & Command palette */}
      <KeyboardShortcuts onOpenCommandPalette={() => setShowCommandPalette((prev) => !prev)} />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onAction={handleCommandAction}
      />

      <PomodoroTimer
        todos={realTodos.filter((t) => !t.is_completed).map((t) => ({ id: t.id, title: t.title }))}
        onWorkSessionComplete={async (todoId: string, durationSec: number) => {
          if (!user) return;
          await supabase.from("time_entries").insert({
            user_id: user.id,
            todo_id: todoId,
            workspace_id: workspaceId,
            started_at: new Date(Date.now() - durationSec * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            duration_sec: durationSec,
          });
        }}
      />
    </div>
  );
}
