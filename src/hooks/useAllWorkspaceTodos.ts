"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { todayKST } from "@/lib/date";
import type { Todo, Workspace, Assignment } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type WorkspaceTodo = Todo & {
  workspace_name: string;
  workspace_color?: string;
  /** "workspace" (기본), "canvas" (LearningX 연동), "khu" (학기 플래너 연동) */
  source?: "workspace" | "canvas" | "khu";
};

// ─── 10색 키맵 워크스페이스 색상 시스템 ───
export type WorkspaceColorKey =
  | "blue" | "purple" | "emerald" | "amber" | "rose"
  | "cyan" | "orange" | "indigo" | "teal" | "pink";

type ColorEntry = { bg: string; text: string; dot: string; border: string };

export const WORKSPACE_COLOR_MAP: Record<WorkspaceColorKey, ColorEntry> = {
  blue:    { bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400",    dot: "bg-blue-500",    border: "border-l-blue-500" },
  purple:  { bg: "bg-purple-100 dark:bg-purple-900/30",  text: "text-purple-700 dark:text-purple-400",  dot: "bg-purple-500",  border: "border-l-purple-500" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-l-emerald-500" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-700 dark:text-amber-400",   dot: "bg-amber-500",   border: "border-l-amber-500" },
  rose:    { bg: "bg-rose-100 dark:bg-rose-900/30",    text: "text-rose-700 dark:text-rose-400",    dot: "bg-rose-500",    border: "border-l-rose-500" },
  cyan:    { bg: "bg-cyan-100 dark:bg-cyan-900/30",    text: "text-cyan-700 dark:text-cyan-400",    dot: "bg-cyan-500",    border: "border-l-cyan-500" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-700 dark:text-orange-400",  dot: "bg-orange-500",  border: "border-l-orange-500" },
  indigo:  { bg: "bg-indigo-100 dark:bg-indigo-900/30",  text: "text-indigo-700 dark:text-indigo-400",  dot: "bg-indigo-500",  border: "border-l-indigo-500" },
  teal:    { bg: "bg-teal-100 dark:bg-teal-900/30",    text: "text-teal-700 dark:text-teal-400",    dot: "bg-teal-500",    border: "border-l-teal-500" },
  pink:    { bg: "bg-pink-100 dark:bg-pink-900/30",    text: "text-pink-700 dark:text-pink-400",    dot: "bg-pink-500",    border: "border-l-pink-500" },
};

export const WORKSPACE_COLOR_KEYS: WorkspaceColorKey[] = Object.keys(WORKSPACE_COLOR_MAP) as WorkspaceColorKey[];

/** DB에 저장된 색상 키로 색상 오브젝트를 반환 (fallback: blue) */
export function getWorkspaceColorByKey(key: string): ColorEntry {
  return WORKSPACE_COLOR_MAP[key as WorkspaceColorKey] ?? WORKSPACE_COLOR_MAP.blue;
}

/** @deprecated — 하위 호환용. 새 코드는 getWorkspaceColorByKey 사용 */
export function getWorkspaceColor(index: number) {
  return getWorkspaceColorByKey(WORKSPACE_COLOR_KEYS[index % WORKSPACE_COLOR_KEYS.length]);
}

export function useAllWorkspaceTodos() {
  const [todos, setTodos] = useState<WorkspaceTodo[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    // 1. Get all workspaces the user is a member of
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });

    const ws: Workspace[] = (wsData ?? []) as Workspace[];
    setWorkspaces(ws);

    if (ws.length === 0) {
      setTodos([]);
      setLoading(false);
      return;
    }

    // 2. Get all todos from those workspaces
    const wsIds = ws.map((w: Workspace) => w.id);
    const { data: todoData } = await supabase
      .from("todos")
      .select("*")
      .in("workspace_id", wsIds)
      .order("due_date", { ascending: true });

    // 3. Map workspace names — 색상은 w.color 사용 (DB 저장된 키)
    const wsMap = new Map(ws.map((w: Workspace) => [w.id, { name: w.name, color: w.color }]));

    const enriched: WorkspaceTodo[] = ((todoData ?? []) as Todo[]).map((t: Todo) => {
      const info = wsMap.get(t.workspace_id);
      return {
        ...t,
        workspace_name: info?.name ?? "Unknown",
        workspace_color: info?.color ?? "blue",
      };
    });

    // 4. 연결된 KHU 과목의 과제도 fetch → WorkspaceTodo로 변환
    const { data: linkedCourses } = await supabase
      .from("courses")
      .select("id, name, workspace_id")
      .not("workspace_id", "is", null);

    type LinkedCourse = { id: string; name: string; workspace_id: string | null };

    if (linkedCourses && linkedCourses.length > 0) {
      const courseIds = (linkedCourses as LinkedCourse[]).map((c) => c.id);
      const { data: khuAssignments } = await supabase
        .from("assignments")
        .select("*")
        .in("course_id", courseIds)
        .order("due_date", { ascending: true });

      if (khuAssignments) {
        const courseMap = new Map((linkedCourses as LinkedCourse[]).map((c) => [c.id, c]));

        const khuTodos: WorkspaceTodo[] = (khuAssignments as Assignment[]).map((a) => {
          const course = courseMap.get(a.course_id);
          const wsInfo = course?.workspace_id ? wsMap.get(course.workspace_id) : null;

          return {
            id: `khu-${a.id}`,
            workspace_id: course?.workspace_id ?? "",
            title: a.title,
            description: `📚 ${course?.name ?? ""}`,
            is_completed: a.is_completed,
            status: a.is_completed ? "done" as const : "todo" as const,
            priority: null,
            assigned_to: null,
            created_by: a.user_id,
            due_date: a.due_date,
            duration_days: 24, // 기본 1일
            sort_order: a.sort_order,
            parent_id: null,
            recurring_task_id: null,
            goal_id: null,
            created_at: a.created_at,
            updated_at: a.updated_at,
            workspace_name: wsInfo?.name ?? "Unknown",
            workspace_color: wsInfo?.color ?? "blue",
            source: "khu" as const,
          };
        });

        enriched.push(...khuTodos);
      }
    }

    setTodos(enriched);
    setLoading(false);
  }, []);

  useRealtimeSubscription({
    channelName: "all-todos-realtime",
    table: "todos",
    onChanged: fetchAll,
  });

  useRealtimeSubscription({
    channelName: "all-assignments-realtime",
    table: "assignments",
    onChanged: fetchAll,
  });

  const addTodo = useCallback(async (workspaceId: string, title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const wsTodos = todos.filter((t) => t.workspace_id === workspaceId);
    const nextOrder = wsTodos.length > 0 ? Math.max(...wsTodos.map((t) => t.sort_order)) + 1 : 0;
    await supabase.from("todos").insert({
      workspace_id: workspaceId,
      title,
      created_by: user.id,
      due_date: todayKST(),
      duration_days: 24,
      sort_order: nextOrder,
    });
    // realtime subscription will trigger fetchAll automatically
  }, [supabase, todos]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Pick<Todo, "due_date" | "duration_days" | "is_completed" | "status">>) => {
    // Optimistic update
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    const { error } = await supabase.from("todos").update(updates).eq("id", id);
    if (error) {
      await fetchAll();
    }
  }, [supabase, fetchAll]);

  const archiveWorkspace = useCallback(async (workspaceId: string, archive: boolean) => {
    const updates = archive
      ? { is_archived: true, archived_at: new Date().toISOString() }
      : { is_archived: false, archived_at: null };
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === workspaceId ? { ...w, ...updates } : w
      )
    );
    const { error } = await supabase.from("workspaces").update(updates).eq("id", workspaceId);
    if (error) {
      await fetchAll();
    }
  }, [supabase, fetchAll]);

  return { todos, workspaces, loading, addTodo, updateTodo, archiveWorkspace };
}
