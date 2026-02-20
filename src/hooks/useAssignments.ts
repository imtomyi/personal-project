"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Assignment, AssignmentType } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { parseLocalDate, nowKST, isSameDay } from "@/lib/date";

export function useAssignments(courseId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAssignments = useCallback(async () => {
    let query = supabase
      .from("assignments")
      .select("*, course:courses(*)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data } = await query;
    setAssignments(data ?? []);
    setLoading(false);
  }, [courseId]);

  useRealtimeSubscription({
    channelName: courseId ? `assignments:${courseId}` : "assignments:all",
    table: "assignments",
    filter: courseId ? `course_id=eq.${courseId}` : undefined,
    onChanged: fetchAssignments,
  });

  async function addAssignment(
    courseIdParam: string,
    title: string,
    options?: {
      description?: string;
      type?: AssignmentType;
      due_date?: string;
    }
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    const nextOrder = (assignments.length > 0 ? Math.max(...assignments.map((a) => a.sort_order)) : 0) + 1;

    // 낙관적 업데이트
    const optimisticAssignment: Assignment = {
      id: crypto.randomUUID(),
      user_id: user.id,
      course_id: courseIdParam,
      title,
      description: options?.description || null,
      type: options?.type || "assignment",
      due_date: options?.due_date || null,
      is_completed: false,
      sort_order: nextOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      canvas_assignment_id: null,
    };

    setAssignments((prev) => [optimisticAssignment, ...prev]);

    const { error } = await supabase.from("assignments").insert({
      user_id: user.id,
      course_id: courseIdParam,
      title,
      description: options?.description || null,
      type: options?.type || "assignment",
      due_date: options?.due_date || null,
      sort_order: nextOrder,
    });

    if (error) {
      setAssignments((prev) => prev.filter((a) => a.id !== optimisticAssignment.id));
      throw error;
    }

    await fetchAssignments();
  }

  async function updateAssignment(
    id: string,
    updates: Partial<Pick<Assignment, "title" | "description" | "type" | "due_date" | "is_completed" | "sort_order">>
  ) {
    // 낙관적 업데이트
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));

    const { error } = await supabase
      .from("assignments")
      .update(updates)
      .eq("id", id);

    if (error) {
      await fetchAssignments();
      throw error;
    }
  }

  async function deleteAssignment(id: string) {
    // 낙관적 업데이트
    setAssignments((prev) => prev.filter((a) => a.id !== id));

    const { error } = await supabase.from("assignments").delete().eq("id", id);

    if (error) {
      await fetchAssignments();
      throw error;
    }
  }

  /** Canvas 과제를 학기 플래너(assignments)에 가져오기 — canvas_assignment_id로 upsert */
  async function importAssignmentsFromCanvas(
    canvasAssignments: { id: number; name: string; due_at: string | null; course_id: number }[],
    courseMapping: Map<number, string>,
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    let nextOrder = (assignments.length > 0 ? Math.max(...assignments.map((a) => a.sort_order)) : 0) + 1;

    for (const ca of canvasAssignments) {
      const dbCourseId = courseMapping.get(ca.course_id);
      if (!dbCourseId) continue;

      const { data: existing } = await supabase
        .from("assignments")
        .select("id")
        .eq("canvas_assignment_id", ca.id)
        .maybeSingle();

      if (existing) {
        // 마감일만 업데이트
        if (ca.due_at) {
          await supabase
            .from("assignments")
            .update({ due_date: ca.due_at.slice(0, 10) })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("assignments").insert({
          user_id: user.id,
          course_id: dbCourseId,
          title: ca.name,
          type: "assignment" as const,
          due_date: ca.due_at ? ca.due_at.slice(0, 10) : null,
          canvas_assignment_id: ca.id,
          sort_order: nextOrder++,
        });
      }
    }

    await fetchAssignments();
  }

  // 유틸리티: 다가오는 과제들 (마감일 기준)
  const upcomingAssignments = assignments
    .filter((a) => !a.is_completed && a.due_date)
    .sort((a, b) => parseLocalDate(a.due_date!).getTime() - parseLocalDate(b.due_date!).getTime());

  const overdueAssignments = assignments.filter(
    (a) => !a.is_completed && a.due_date && parseLocalDate(a.due_date) < nowKST()
  );

  const todayAssignments = assignments.filter((a) => {
    if (!a.due_date || a.is_completed) return false;
    return isSameDay(parseLocalDate(a.due_date), nowKST());
  });

  return {
    assignments,
    loading,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    importAssignmentsFromCanvas,
    upcomingAssignments,
    overdueAssignments,
    todayAssignments,
  };
}
