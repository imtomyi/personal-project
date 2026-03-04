"use client";

import { useState, useMemo } from "react";
import type { CourseSchedule, Course } from "@/lib/types";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const COURSE_COLORS = [
  "#4F46E5", "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#14B8A6",
];

type CourseScheduleEditorProps = {
  schedules: CourseSchedule[];
  loading: boolean;
  onAdd: (
    schedule: Omit<CourseSchedule, "id" | "user_id" | "created_at">
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteByCourse: (courseName: string) => Promise<void>;
  // 과목 필터링 (KHU 사이드바에서 사용)
  courses?: Course[];
  selectedCourseId?: string | null;
  onSelectCourse?: (courseId: string | null) => void;
};

export default function CourseScheduleEditor({
  schedules,
  loading,
  onAdd,
  onDelete,
  onDeleteByCourse,
  courses,
  selectedCourseId,
  onSelectCourse,
}: CourseScheduleEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("10:15");
  const [color, setColor] = useState(COURSE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 과목별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, CourseSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.course_name) || [];
      list.push(s);
      map.set(s.course_name, list);
    }
    // 정렬: 요일 순서
    for (const [, list] of map) {
      list.sort((a, b) => a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start));
    }
    return map;
  }, [schedules]);

  // 이미 등록된 과목명 추천
  const existingNames = useMemo(
    () => [...new Set(schedules.map((s) => s.course_name))],
    [schedules]
  );

  async function handleAdd() {
    if (!courseName.trim() || selectedDays.length === 0) return;
    setSaving(true);
    try {
      for (const day of selectedDays) {
        await onAdd({
          canvas_course_id: null,
          course_name: courseName.trim(),
          day_of_week: day,
          time_start: timeStart,
          time_end: timeEnd,
          location: null,
          color,
        });
      }
      // 성공 후 요일 초기화 (과목명/시간 유지 → 다른 시간대 빠르게 추가 가능)
      setSelectedDays([]);
    } catch {
      // 에러 처리
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          📚 수강 과목
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="수업 추가"
        >
          {isAdding ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>

      {/* 추가 폼 */}
      {isAdding && (
        <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
          {/* 과목명 */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
              과목명
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="예: 기계학습"
              list="course-name-suggestions"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#9B1B30] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              autoFocus
            />
            <datalist id="course-name-suggestions">
              {existingNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          {/* 요일 선택 (복수) */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
              요일 (복수 선택 가능)
            </label>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
                    selectedDays.includes(idx)
                      ? "bg-[#9B1B30] text-white"
                      : idx === 0
                        ? "bg-red-50 text-red-400 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                        : idx === 6
                          ? "bg-blue-50 text-blue-400 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                시작
              </label>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#9B1B30] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                종료
              </label>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#9B1B30] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* 색상 */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
              색상
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform ${
                    color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-700" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 추가 버튼 */}
          <button
            onClick={handleAdd}
            disabled={!courseName.trim() || selectedDays.length === 0 || saving}
            className="w-full rounded-full bg-[#9B1B30] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a1526] disabled:opacity-50"
          >
            {saving ? "추가 중..." : `${selectedDays.map((d) => DAY_LABELS[d]).join("·")} 추가`}
          </button>
        </div>
      )}

      {/* 등록된 시간표 */}
      {loading ? (
        <div className="py-4 text-center">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#9B1B30]" />
        </div>
      ) : grouped.size === 0 ? (
        !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-400 hover:border-[#9B1B30] hover:text-[#9B1B30] dark:border-gray-600 dark:hover:border-[#9B1B30]"
          >
            수업 시간표를 추가해주세요
          </button>
        )
      ) : (
        <div className="space-y-2">
          {/* 과목 필터 (KHU 사이드바용) */}
          {onSelectCourse && courses && courses.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onSelectCourse(null)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  !selectedCourseId
                    ? "bg-[#9B1B30] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                전체
              </button>
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCourse(c.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    selectedCourseId === c.id
                      ? "bg-[#9B1B30] text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {c.name.length > 6 ? c.name.slice(0, 6) + "…" : c.name}
                </button>
              ))}
            </div>
          )}
          {[...grouped.entries()].map(([name, slots]) => (
            <div
              key={name}
              className="rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: slots[0]?.color || "#4F46E5" }}
                />
                <span className="flex-1 text-[13px] font-medium text-gray-800 dark:text-gray-200">
                  {name}
                </span>
                <button
                  onClick={() => {
                    if (confirmDelete === name) {
                      onDeleteByCourse(name);
                      setConfirmDelete(null);
                    } else {
                      setConfirmDelete(name);
                      setTimeout(() => setConfirmDelete(null), 3000);
                    }
                  }}
                  className={`rounded p-0.5 text-[10px] transition-colors ${
                    confirmDelete === name
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "text-gray-300 hover:text-red-400 dark:text-gray-600"
                  }`}
                  title="과목 삭제"
                >
                  {confirmDelete === name ? "삭제 확인" : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {slots.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  >
                    <span className="font-medium">{DAY_LABELS[s.day_of_week]}</span>
                    {s.time_start}~{s.time_end}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
