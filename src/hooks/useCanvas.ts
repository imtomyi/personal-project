"use client";

import { useState, useCallback } from "react";

type CanvasCourse = {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
  enrollments?: { type: string; computed_current_score: number | null }[];
};

type CanvasAssignment = {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  course_id: number;
  points_possible: number | null;
  submission_types: string[];
  has_submitted_submissions: boolean;
};

export function useCanvas() {
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("canvas_token") || "";
    }
    return "";
  });
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const saveToken = useCallback((newToken: string) => {
    setToken(newToken);
    if (typeof window !== "undefined") {
      if (newToken) {
        localStorage.setItem("canvas_token", newToken);
      } else {
        localStorage.removeItem("canvas_token");
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    saveToken("");
    setCourses([]);
    setAssignments([]);
    setIsConnected(false);
    setError(null);
  }, [saveToken]);

  async function canvasFetch(endpoint: string) {
    const res = await fetch(
      `/api/canvas?token=${encodeURIComponent(token)}&endpoint=${encodeURIComponent(endpoint)}`,
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await canvasFetch(
        "courses?enrollment_state=active&per_page=50&include[]=total_scores",
      );
      setCourses(Array.isArray(data) ? data : []);
      setIsConnected(true);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "연결 실패";
      setError(msg);
      setIsConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAssignments = useCallback(
    async (courseId: number) => {
      if (!token) return [];
      try {
        const data = await canvasFetch(
          `courses/${courseId}/assignments?per_page=50&order_by=due_at`,
        );
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [token],
  );

  const fetchAllAssignments = useCallback(async () => {
    if (!token || courses.length === 0) return;
    setLoading(true);
    try {
      const allAssignments: CanvasAssignment[] = [];
      for (const course of courses) {
        const courseAssignments = await fetchAssignments(course.id);
        allAssignments.push(...courseAssignments);
      }
      // 마감일 순 정렬
      allAssignments.sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
      setAssignments(allAssignments);
    } finally {
      setLoading(false);
    }
  }, [token, courses, fetchAssignments]);

  const connect = useCallback(
    async (newToken: string) => {
      saveToken(newToken);
      setToken(newToken);
      // token이 바뀌면 useCallback 내에서 직접 fetch
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/canvas?token=${encodeURIComponent(newToken)}&endpoint=${encodeURIComponent("courses?enrollment_state=active&per_page=50&include[]=total_scores")}`,
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setCourses(Array.isArray(data) ? data : []);
        setIsConnected(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "연결 실패";
        setError(msg);
        setIsConnected(false);
        saveToken("");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [saveToken],
  );

  return {
    token,
    courses,
    assignments,
    loading,
    error,
    isConnected,
    connect,
    disconnect,
    fetchCourses,
    fetchAssignments,
    fetchAllAssignments,
  };
}

export type { CanvasCourse, CanvasAssignment };
