"use client";

import { useState } from "react";
import type { Course, AssignmentType } from "@/lib/types";

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string; emoji: string }[] = [
  { value: "assignment", label: "과제", emoji: "📝" },
  { value: "exam", label: "시험", emoji: "📋" },
  { value: "quiz", label: "퀴즈", emoji: "❓" },
  { value: "project", label: "프로젝트", emoji: "🗂️" },
  { value: "other", label: "기타", emoji: "📌" },
];

type AddAssignmentProps = {
  courses: Course[];
  defaultCourseId?: string;
  onAdd: (
    courseId: string,
    title: string,
    options?: { description?: string; type?: AssignmentType; due_date?: string }
  ) => Promise<void>;
};

export default function AddAssignment({ courses, defaultCourseId, onAdd }: AddAssignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [courseId, setCourseId] = useState(defaultCourseId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssignmentType>("assignment");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit() {
    if (!title.trim() || !courseId) return;
    try {
      await onAdd(courseId, title.trim(), {
        description: description.trim() || undefined,
        type,
        due_date: dueDate || undefined,
      });
      setTitle("");
      setDescription("");
      setType("assignment");
      setDueDate("");
      setIsOpen(false);
    } catch {
      // 에러는 상위에서 처리
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-[#9B1B30]/40 hover:text-[#9B1B30] dark:border-gray-600 dark:text-gray-400 dark:hover:border-[#9B1B30]/50 dark:hover:text-[#e8a0ad]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        과제/시험 추가
      </button>
    );
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
      {/* 과목 선택 */}
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option value="">과목 선택</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* 제목 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) handleSubmit();
          if (e.key === "Escape") setIsOpen(false);
        }}
      />

      {/* 설명 */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="설명 (선택)"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />

      {/* 유형 선택 */}
      <div className="flex flex-wrap gap-1.5">
        {ASSIGNMENT_TYPES.map((at) => (
          <button
            key={at.value}
            onClick={() => setType(at.value)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              type === at.value
                ? "bg-[#9B1B30] text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
            }`}
          >
            {at.emoji} {at.label}
          </button>
        ))}
      </div>

      {/* 마감일 */}
      <input
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !courseId}
          className="flex-1 rounded-full bg-[#9B1B30] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7a1526] disabled:opacity-50"
        >
          추가
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
        >
          취소
        </button>
      </div>
    </div>
  );
}
