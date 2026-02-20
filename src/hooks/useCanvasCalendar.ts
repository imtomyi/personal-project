"use client";

import { useState, useEffect, useCallback } from "react";
import type { CanvasAssignment, CanvasCourse } from "@/hooks/useCanvas";
import type { WorkspaceTodo } from "@/hooks/useAllWorkspaceTodos";
import { toDateStr } from "@/lib/date";

/**
 * Canvas(LearningX) 과제를 WorkspaceTodo 형태로 변환하여 워크스페이스 캘린더에 표시
 * KHU 탭에서 연동된 토큰을 공유 사용
 */

// Canvas 과제 → WorkspaceTodo 변환
function canvasAssignmentToTodo(
  assignment: CanvasAssignment,
  courseName: string,
): WorkspaceTodo {
  // due_at이 ISO 날짜면 KST 날짜로 변환
  let dueDate: string | null = null;
  if (assignment.due_at) {
    const d = new Date(assignment.due_at);
    dueDate = toDateStr(d);
  }

  return {
    // Todo 필수 필드
    id: `canvas-${assignment.id}`,
    workspace_id: `canvas-${assignment.course_id}`,
    title: assignment.name,
    description: courseName,
    is_completed: assignment.has_submitted_submissions,
    status: assignment.has_submitted_submissions ? "done" as const : "todo" as const,
    priority: null,
    assigned_to: null,
    created_by: null,
    due_date: dueDate,
    duration_days: 24, // 기본 1일 (hours)
    sort_order: 0,
    parent_id: null,
    recurring_task_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // WorkspaceTodo 추가 필드
    workspace_name: courseName,
    workspace_color: undefined,
    // Canvas 식별용
    source: "canvas" as const,
  };
}

export function useCanvasCalendar() {
  const [canvasTodos, setCanvasTodos] = useState<WorkspaceTodo[]>([]);
  const [canvasCourses, setCanvasCourses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const fetchCanvasData = useCallback(async () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("canvas_token");
    if (!token) {
      setIsConnected(false);
      setCanvasTodos([]);
      setCanvasCourses([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch courses
      const coursesRes = await fetch(
        `/api/canvas?token=${encodeURIComponent(token)}&endpoint=${encodeURIComponent(
          "courses?enrollment_state=active&per_page=50"
        )}`
      );
      const coursesData = await coursesRes.json();
      if (coursesData.error) throw new Error(coursesData.error);

      const courses: CanvasCourse[] = Array.isArray(coursesData) ? coursesData : [];
      if (courses.length === 0) {
        setIsConnected(true);
        setCanvasTodos([]);
        setCanvasCourses([]);
        setLoading(false);
        return;
      }

      // Course name map
      const courseMap = new Map<number, string>();
      courses.forEach((c) => courseMap.set(c.id, c.name || c.course_code));

      const courseList = courses.map((c) => ({
        id: `canvas-${c.id}`,
        name: c.name || c.course_code,
      }));
      setCanvasCourses(courseList);

      // 2. Fetch all assignments
      const allTodos: WorkspaceTodo[] = [];
      for (const course of courses) {
        try {
          const assignRes = await fetch(
            `/api/canvas?token=${encodeURIComponent(token)}&endpoint=${encodeURIComponent(
              `courses/${course.id}/assignments?per_page=50&order_by=due_at`
            )}`
          );
          const assignData = await assignRes.json();
          if (assignData.error) continue;

          const assignments: CanvasAssignment[] = Array.isArray(assignData)
            ? assignData
            : [];

          // 2주 이상 지난 과제는 캘린더에서 제외
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

          for (const a of assignments) {
            // due_at이 있는 과제만 캘린더에 표시
            if (a.due_at) {
              const dueDate = new Date(a.due_at);
              if (dueDate < twoWeeksAgo) continue; // 오래된 과제 제외
              allTodos.push(
                canvasAssignmentToTodo(a, courseMap.get(a.course_id) || course.name)
              );
            }
          }
        } catch {
          // 개별 코스 에러는 무시
        }
      }

      setCanvasTodos(allTodos);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      setCanvasTodos([]);
      setCanvasCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCanvasData();
  }, [fetchCanvasData]);

  // localStorage 변경 감지 (다른 탭에서 연동/해제 시)
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "canvas_token") {
        fetchCanvasData();
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchCanvasData]);

  return {
    canvasTodos,
    canvasCourses,
    loading,
    isConnected,
    refresh: fetchCanvasData,
  };
}
