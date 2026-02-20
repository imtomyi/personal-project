"use client";

import { useState } from "react";
import type { Assignment, AssignmentType } from "@/lib/types";
import { parseLocalDate, nowKST, isSameDay } from "@/lib/date";

const TYPE_CONFIG: Record<AssignmentType, { emoji: string; label: string }> = {
  assignment: { emoji: "📝", label: "과제" },
  exam: { emoji: "📋", label: "시험" },
  quiz: { emoji: "❓", label: "퀴즈" },
  project: { emoji: "🗂️", label: "프로젝트" },
  other: { emoji: "📌", label: "기타" },
};

type KhuAssignmentItemProps = {
  assignment: Assignment;
  onUpdate: (id: string, updates: Partial<Pick<Assignment, "title" | "description" | "type" | "due_date" | "is_completed">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function KhuAssignmentItem({ assignment, onUpdate, onDelete }: KhuAssignmentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(assignment.title);

  const config = TYPE_CONFIG[assignment.type];
  const isOverdue =
    !assignment.is_completed &&
    assignment.due_date &&
    parseLocalDate(assignment.due_date) < nowKST();
  const isToday =
    !assignment.is_completed &&
    assignment.due_date &&
    isSameDay(parseLocalDate(assignment.due_date), nowKST());

  function getDueLabel() {
    if (!assignment.due_date) return null;
    const due = parseLocalDate(assignment.due_date);
    const now = nowKST();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (assignment.is_completed) return "완료";
    if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`;
    if (diffDays === 0) return "오늘 마감";
    if (diffDays === 1) return "내일 마감";
    if (diffDays <= 7) return `${diffDays}일 남음`;
    return due.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric" });
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) return;
    await onUpdate(assignment.id, { title: editTitle.trim() });
    setIsEditing(false);
  }

  return (
    <div
      className={`group flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${
        assignment.is_completed
          ? "border-gray-100 bg-gray-50/50 dark:border-gray-700/50 dark:bg-gray-800/30"
          : isOverdue
            ? "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-900/10"
            : isToday
              ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10"
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      {/* 체크박스 */}
      <button
        onClick={() => onUpdate(assignment.id, { is_completed: !assignment.is_completed })}
        className={`mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
          assignment.is_completed
            ? "border-[#9B1B30] bg-[#9B1B30] text-white"
            : "border-gray-300 hover:border-[#9B1B30]/50 dark:border-gray-600"
        }`}
      >
        {assignment.is_completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 내용 */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded border border-gray-300 bg-transparent px-2 py-0.5 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onBlur={handleSaveEdit}
          />
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{config.emoji}</span>
              <p
                className={`text-sm ${
                  assignment.is_completed
                    ? "text-gray-400 line-through dark:text-gray-500"
                    : "font-medium text-gray-800 dark:text-gray-200"
                }`}
                onDoubleClick={() => {
                  setEditTitle(assignment.title);
                  setIsEditing(true);
                }}
              >
                {assignment.title}
              </p>
            </div>
            {/* 과목명 + 마감일 */}
            <div className="mt-1 flex items-center gap-2">
              {assignment.course && (
                <span
                  className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: assignment.course.color }}
                >
                  {assignment.course.name}
                </span>
              )}
              {assignment.due_date && (
                <span
                  className={`text-[11px] font-medium ${
                    assignment.is_completed
                      ? "text-gray-400 dark:text-gray-500"
                      : isOverdue
                        ? "text-red-500 dark:text-red-400"
                        : isToday
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {getDueLabel()}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={() => onDelete(assignment.id)}
        className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-red-400"
        title="삭제"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
