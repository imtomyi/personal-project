"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { CourseSchedule } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export function useCourseSchedules() {
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from("course_schedules")
      .select("*")
      .order("day_of_week")
      .order("time_start");
    if (!error) setSchedules(data ?? []);
    setLoading(false);
  }, []);

  useRealtimeSubscription({
    channelName: "course_schedules",
    table: "course_schedules",
    onChanged: fetchSchedules,
  });

  /** 수업 스케줄 추가 */
  async function addSchedule(
    schedule: Omit<CourseSchedule, "id" | "user_id" | "created_at">
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    const { error } = await supabase.from("course_schedules").insert({
      user_id: user.id,
      canvas_course_id: schedule.canvas_course_id,
      course_name: schedule.course_name,
      day_of_week: schedule.day_of_week,
      time_start: schedule.time_start,
      time_end: schedule.time_end,
      location: schedule.location,
      color: schedule.color || "#4F46E5",
    });

    if (error) throw error;
    await fetchSchedules();
  }

  /** 수업 스케줄 일괄 추가 */
  async function addScheduleBatch(
    items: Omit<CourseSchedule, "id" | "user_id" | "created_at">[]
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    const rows = items.map((s) => ({
      user_id: user.id,
      canvas_course_id: s.canvas_course_id,
      course_name: s.course_name,
      day_of_week: s.day_of_week,
      time_start: s.time_start,
      time_end: s.time_end,
      location: s.location,
      color: s.color || "#4F46E5",
    }));

    const { error } = await supabase.from("course_schedules").insert(rows);
    if (error) throw error;
    await fetchSchedules();
  }

  /** 수업 스케줄 삭제 */
  async function deleteSchedule(id: string) {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase
      .from("course_schedules")
      .delete()
      .eq("id", id);
    if (error) {
      await fetchSchedules();
      throw error;
    }
  }

  /** 특정 과목의 모든 스케줄 삭제 */
  async function deleteSchedulesByCourse(courseName: string) {
    setSchedules((prev) => prev.filter((s) => s.course_name !== courseName));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("course_schedules")
      .delete()
      .eq("user_id", user.id)
      .eq("course_name", courseName);
    if (error) {
      await fetchSchedules();
      throw error;
    }
  }

  return {
    schedules,
    loading,
    addSchedule,
    addScheduleBatch,
    deleteSchedule,
    deleteSchedulesByCourse,
  };
}
