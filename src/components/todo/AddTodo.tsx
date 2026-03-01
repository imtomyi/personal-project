"use client";

import { useState } from "react";
import { todayKST, parseNaturalDate } from "@/lib/date";
import { DURATION_PRESETS, DEFAULT_DURATION_HOURS } from "@/lib/constants";
import DatePicker from "@/components/calendar/DatePicker";
import TimePicker from "@/components/planning/TimePicker";
import type { Goal } from "@/lib/types";

type AddTodoProps = {
  onAdd: (title: string, description?: string, dueDate?: string, durationHours?: number, goalId?: string, dueTime?: string) => Promise<void>;
  goals?: Goal[];
};

export default function AddTodo({ onAdd, goals }: AddTodoProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayKST());
  const [durationHours, setDurationHours] = useState(DEFAULT_DURATION_HOURS);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeGoals = goals?.filter((g) => g.status === "active") ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const { cleaned, date: parsedDate } = parseNaturalDate(title.trim());
      const finalTitle = parsedDate ? cleaned : title.trim();
      const finalDueDate = parsedDate ?? dueDate;
      await onAdd(finalTitle, description.trim() || undefined, finalDueDate, durationHours, selectedGoalId ?? undefined, dueTime || undefined);
      setTitle("");
      setDescription("");
      setDueDate(todayKST());
      setDurationHours(24);
      setSelectedGoalId(null);
      setDueTime("");
      setExpanded(false);
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <input
          id="add-todo-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          autoComplete="off"
          placeholder="새 할 일 추가..."
          className="w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none dark:text-white"
          disabled={loading}
        />
        {expanded && (
          <>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명 추가 (선택)"
              rows={2}
              className="mt-2 w-full resize-none bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300"
              disabled={loading}
            />

            {/* 시작일 + 기간 */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* 시작일 — 커스텀 DatePicker */}
              <DatePicker value={dueDate} onChange={setDueDate} disabled={loading} />

              {/* 기간 — pill 칩 */}
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div className="flex flex-wrap gap-1">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDurationHours(preset.value)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                        durationHours === preset.value
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 선호 시간 */}
            <div className="mt-2 flex items-center gap-2">
              <TimePicker
                value={dueTime}
                onChange={setDueTime}
                onClear={() => setDueTime("")}
                disabled={loading}
                placeholder="선호 시간"
              />
              {!dueTime && (
                <span className="text-[11px] text-gray-400">선택 사항</span>
              )}
            </div>

            {/* 목표 연결 */}
            {activeGoals.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
                  🎯
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedGoalId(null)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                      !selectedGoalId
                        ? "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                        : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    없음
                  </button>
                  {activeGoals.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedGoalId(goal.id)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                        selectedGoalId === goal.id
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {goal.emoji} {goal.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (title.trim() && !window.confirm("작성 중인 내용이 있습니다. 닫으시겠습니까?")) {
                    return;
                  }
                  setExpanded(false);
                  setTitle("");
                  setDescription("");
                  setDueDate(todayKST());
                  setDurationHours(DEFAULT_DURATION_HOURS);
                  setSelectedGoalId(null);
                  setDueTime("");
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!title.trim() || loading}
                className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "추가 중..." : "할 일 추가"}
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
