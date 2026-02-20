"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Course } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    setCourses(data ?? []);
    setLoading(false);
  }, []);

  useRealtimeSubscription({
    channelName: "courses",
    table: "courses",
    onChanged: fetchCourses,
  });

  async function addCourse(name: string, professor?: string, color?: string, semester?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    // 낙관적 업데이트
    const optimisticCourse: Course = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name,
      professor: professor || null,
      color: color || "#3B82F6",
      semester: semester || null,
      created_at: new Date().toISOString(),
      canvas_course_id: null,
      workspace_id: null,
    };

    setCourses((prev) => [optimisticCourse, ...prev]);

    const { error } = await supabase.from("courses").insert({
      user_id: user.id,
      name,
      professor: professor || null,
      color: color || "#3B82F6",
      semester: semester || null,
    });

    if (error) {
      setCourses((prev) => prev.filter((c) => c.id !== optimisticCourse.id));
      throw error;
    }

    await fetchCourses();
  }

  /** Canvas 과목을 학기 플래너(courses)에 가져오기 — canvas_course_id로 upsert */
  async function importCoursesFromCanvas(
    canvasCourses: { id: number; name: string; course_code: string }[]
  ): Promise<Map<number, string>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    const mapping = new Map<number, string>(); // canvasId → courseId

    for (const cc of canvasCourses) {
      const { data: existing } = await supabase
        .from("courses")
        .select("id")
        .eq("canvas_course_id", cc.id)
        .maybeSingle();

      if (existing) {
        mapping.set(cc.id, existing.id);
      } else {
        const { data: inserted, error } = await supabase
          .from("courses")
          .insert({
            user_id: user.id,
            name: cc.name,
            color: "#8B5CF6",
            canvas_course_id: cc.id,
          })
          .select("id")
          .single();

        if (!error && inserted) {
          mapping.set(cc.id, inserted.id);
        }
      }
    }

    await fetchCourses();
    return mapping;
  }

  /** 과목에 워크스페이스 연결/해제 */
  async function linkCourseToWorkspace(courseId: string, workspaceId: string | null) {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, workspace_id: workspaceId } : c))
    );

    const { error } = await supabase
      .from("courses")
      .update({ workspace_id: workspaceId })
      .eq("id", courseId);

    if (error) {
      await fetchCourses();
      throw error;
    }
  }

  async function updateCourse(id: string, updates: Partial<Pick<Course, "name" | "professor" | "color" | "semester">>) {
    // 낙관적 업데이트
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

    const { error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", id);

    if (error) {
      await fetchCourses();
      throw error;
    }
  }

  async function deleteCourse(id: string) {
    // 낙관적 업데이트
    setCourses((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      await fetchCourses();
      throw error;
    }
  }

  return { courses, loading, addCourse, updateCourse, deleteCourse, importCoursesFromCanvas, linkCourseToWorkspace };
}
