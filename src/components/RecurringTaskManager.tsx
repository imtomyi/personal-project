"use client";

import { useState } from "react";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import type { RecurringTask, RecurrenceType } from "@/lib/types";

type RecurringTaskManagerProps = {
  workspaceId: string;
  onClose: () => void;
};

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  daily: "매일",
  weekdays: "평일",
  weekly: "매주",
  custom: "사용자 지정",
};

export default function RecurringTaskManager({ workspaceId, onClose }: RecurringTaskManagerProps) {
  const { tasks, loading, addRecurringTask, updateRecurringTask, deleteRecurringTask } =
    useRecurringTasks(workspaceId);

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceType>("daily");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newTimeStart, setNewTimeStart] = useState("");
  const [newTimeEnd, setNewTimeEnd] = useState("");

  async function handleAdd() {
    if (!newTitle.trim()) return;

    try {
      await addRecurringTask({
        title: newTitle.trim(),
        description: null,
        workspace_id: workspaceId,
        priority: null,
        recurrence: newRecurrence,
        days_of_week: newRecurrence === "custom" || newRecurrence === "weekly" ? newDays : [],
        time_start: newTimeStart || null,
        time_end: newTimeEnd || null,
        is_active: true,
      });
      setNewTitle("");
      setNewRecurrence("daily");
      setNewDays([]);
      setNewTimeStart("");
      setNewTimeEnd("");
      setShowAdd(false);
    } catch {
      // Error
    }
  }

  function toggleDay(day: number) {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔁</span>
            <h2 className="text-[15px] font-semibold text-foreground dark:text-white">반복 할일</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {/* Add button */}
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/[0.08] py-3 text-[13px] font-medium text-secondary hover:border-[#007AFF]/30 hover:text-[#007AFF] dark:border-white/[0.08] dark:hover:border-[#007AFF]/30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              반복 할일 추가
            </button>
          )}

          {/* Add form */}
          {showAdd && (
            <div className="mb-4 rounded-xl border border-black/[0.06] bg-[#f5f5f7] p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="반복 할일 제목..."
                className="mb-3 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#007AFF] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                autoFocus
              />

              {/* Recurrence type */}
              <div className="mb-3">
                <label className="mb-1 block text-[11px] font-medium text-secondary">반복 주기</label>
                <div className="flex gap-1">
                  {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setNewRecurrence(key)}
                      className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${
                        newRecurrence === key
                          ? "bg-[#007AFF] text-white"
                          : "bg-white text-secondary hover:bg-black/[0.05] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day selector (for weekly/custom) */}
              {(newRecurrence === "weekly" || newRecurrence === "custom") && (
                <div className="mb-3">
                  <label className="mb-1 block text-[11px] font-medium text-secondary">요일 선택</label>
                  <div className="flex gap-1">
                    {DAYS.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={`h-8 w-8 rounded-full text-[12px] font-medium ${
                          newDays.includes(i)
                            ? "bg-[#007AFF] text-white"
                            : "bg-white text-secondary hover:bg-black/[0.05] dark:bg-white/[0.06]"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time range */}
              <div className="mb-3 flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-secondary">시작 시간</label>
                  <input
                    type="time"
                    value={newTimeStart}
                    onChange={(e) => setNewTimeStart(e.target.value)}
                    className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-secondary">종료 시간</label>
                  <input
                    type="time"
                    value={newTimeEnd}
                    onChange={(e) => setNewTimeEnd(e.target.value)}
                    className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                >
                  취소
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="rounded-lg bg-[#007AFF] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0056b3] disabled:opacity-40"
                >
                  추가
                </button>
              </div>
            </div>
          )}

          {/* Task list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-2xl opacity-40">🔁</div>
              <p className="text-[13px] text-secondary">반복 할일이 없습니다</p>
              <p className="mt-1 text-[11px] text-secondary/70">
                운동, 수업, 식사 등 매일/매주 반복되는 일을 등록하세요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-[#1c1c1e]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground dark:text-[#e5e5e7]">
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {RECURRENCE_LABELS[task.recurrence as RecurrenceType]}
                      </span>
                      {task.time_start && (
                        <span className="text-[10px] text-secondary">
                          {task.time_start}
                          {task.time_end ? ` - ${task.time_end}` : ""}
                        </span>
                      )}
                      {task.days_of_week.length > 0 && (
                        <span className="text-[10px] text-secondary">
                          {task.days_of_week.map((d) => DAYS[d]).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateRecurringTask(task.id, { is_active: !task.is_active })
                      }
                      className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                        task.is_active
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                      }`}
                    >
                      {task.is_active ? "활성" : "비활성"}
                    </button>
                    <button
                      onClick={() => deleteRecurringTask(task.id)}
                      className="rounded p-1 text-secondary opacity-0 hover:text-red-500 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
