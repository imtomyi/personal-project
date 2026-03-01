"use client";

import { useState, useCallback } from "react";
import { useRoutines } from "@/hooks/useRoutines";
import type { RecurrenceType, Routine, RoutineMode } from "@/lib/types";
import { RECURRENCE_OPTIONS, WEEKDAY_LABELS } from "@/lib/constants";

type RoutineManagerProps = {
  workspaceId?: string;
  onClose: () => void;
};

const HABIT_EMOJIS = ["✅", "💪", "📚", "🏃", "💧", "🧘", "🎯", "💤", "🍎", "📝"];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 05~22
const MINUTES = [0, 15, 30, 45];

/** "HH:MM" → { h, m } */
function parseTime(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}
/** { h, m } → "HH:MM" */
function formatHM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ── Compact Time Picker ── */
function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const parsed = parseTime(value || null);
  const h = parsed?.h ?? -1;
  const m = parsed?.m ?? -1;

  const setHour = useCallback(
    (hour: number) => {
      const minute = m >= 0 ? m : 0;
      onChange(formatHM(hour, minute));
    },
    [m, onChange],
  );

  const setMinute = useCallback(
    (minute: number) => {
      const hour = h >= 0 ? h : 9;
      onChange(formatHM(hour, minute));
    },
    [h, onChange],
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-secondary">{label}</span>
      <div className="flex items-center rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06]">
        <select
          value={h >= 0 ? h : ""}
          onChange={(e) => setHour(Number(e.target.value))}
          className="cursor-pointer appearance-none bg-transparent py-1 pl-2 pr-0.5 text-center text-[12px] font-medium text-foreground outline-none dark:text-white"
        >
          <option value="" disabled>--</option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>{String(hour).padStart(2, "0")}</option>
          ))}
        </select>
        <span className="text-[11px] text-secondary/60">:</span>
        <select
          value={m >= 0 ? m : ""}
          onChange={(e) => setMinute(Number(e.target.value))}
          className="cursor-pointer appearance-none bg-transparent py-1 pl-0.5 pr-2 text-center text-[12px] font-medium text-foreground outline-none dark:text-white"
        >
          <option value="" disabled>--</option>
          {MINUTES.map((min) => (
            <option key={min} value={min}>{String(min).padStart(2, "0")}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function RoutineManager({ workspaceId, onClose }: RoutineManagerProps) {
  const { routines, loading, addRoutine, updateRoutine, deleteRoutine } = useRoutines(workspaceId);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("✅");
  const [newMode, setNewMode] = useState<RoutineMode>("habit");
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceType>("daily");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newTimeStart, setNewTimeStart] = useState("");
  const [newTimeEnd, setNewTimeEnd] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);

  function toggleDay(arr: number[], day: number): number[] {
    return arr.includes(day) ? arr.filter((d) => d !== day) : [...arr, day].sort();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await addRoutine({
        name: newName.trim(),
        emoji: newMode === "habit" ? newEmoji : "🔁",
        mode: newMode,
        recurrence: newRecurrence,
        days_of_week: newRecurrence === "custom" || newRecurrence === "weekly" ? newDays : [],
        time_start: newTimeStart || null,
        time_end: newTimeEnd || null,
        workspace_id: workspaceId ?? null,
      });
      resetForm();
    } catch {
      // Error
    }
  }

  function resetForm() {
    setNewName("");
    setNewEmoji("✅");
    setNewMode("habit");
    setNewRecurrence("daily");
    setNewDays([]);
    setNewTimeStart("");
    setNewTimeEnd("");
    setShowAdd(false);
  }

  function getRecurrenceLabel(r: RecurrenceType): string {
    return RECURRENCE_OPTIONS.find((o) => o.key === r)?.label ?? r;
  }

  function formatDays(days: number[]): string {
    if (days.length === 0) return "";
    if (days.length === 7) return "매일";
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "평일";
    return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
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
            <span className="text-lg">🔄</span>
            <h2 className="text-[15px] font-semibold text-foreground dark:text-white">루틴 관리</h2>
            <span className="rounded-full bg-[#007AFF]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#007AFF]">
              {routines.filter((r) => r.is_active).length}
            </span>
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
              루틴 추가
            </button>
          )}

          {/* Add form */}
          {showAdd && (
            <div className="mb-4 rounded-xl border border-black/[0.06] bg-[#f5f5f7] p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
              {/* Mode toggle */}
              <div className="mb-3 flex gap-1">
                <button
                  onClick={() => setNewMode("habit")}
                  className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium ${
                    newMode === "habit"
                      ? "bg-violet-500 text-white"
                      : "bg-white text-secondary hover:bg-black/[0.05] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                  }`}
                >
                  ✅ 습관
                </button>
                <button
                  onClick={() => setNewMode("task")}
                  className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium ${
                    newMode === "task"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-secondary hover:bg-black/[0.05] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                  }`}
                >
                  🔁 반복 할일
                </button>
              </div>

              {/* Emoji (habit only) */}
              {newMode === "habit" && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {HABIT_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={`rounded-md p-1 text-sm ${
                        newEmoji === e
                          ? "bg-[#007AFF]/10 ring-1 ring-[#007AFF]"
                          : "hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              {/* Name */}
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newMode === "habit" ? "습관 이름..." : "반복 할일 제목..."}
                className="mb-3 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#007AFF] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />

              {/* Recurrence type */}
              <div className="mb-3">
                <label className="mb-1 block text-[11px] font-medium text-secondary">반복 주기</label>
                <div className="flex gap-1">
                  {RECURRENCE_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setNewRecurrence(key as RecurrenceType)}
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

              {/* Day selector */}
              {(newRecurrence === "weekly" || newRecurrence === "custom") && (
                <div className="mb-3">
                  <label className="mb-1 block text-[11px] font-medium text-secondary">요일 선택</label>
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => setNewDays(toggleDay(newDays, i))}
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

              {/* Time range — compact inline picker */}
              <div className="mb-3">
                <label className="mb-1 block text-[11px] font-medium text-secondary">시간 설정</label>
                <div className="flex items-center gap-2">
                  <TimePicker label="시작" value={newTimeStart} onChange={setNewTimeStart} />
                  <span className="text-[11px] text-secondary/50">~</span>
                  <TimePicker label="종료" value={newTimeEnd} onChange={setNewTimeEnd} />
                </div>
                <p className="mt-1 text-[10px] text-secondary/60">미설정 시 빈 시간에 자동 배치</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={resetForm}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                >
                  취소
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="rounded-lg bg-[#007AFF] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0056b3] disabled:opacity-40"
                >
                  추가
                </button>
              </div>
            </div>
          )}

          {/* Routine list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
            </div>
          ) : routines.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-2xl opacity-40">🔄</div>
              <p className="text-[13px] text-secondary">루틴이 없습니다</p>
              <p className="mt-1 text-[11px] text-secondary/70">
                매일 반복되는 습관과 할일을 등록하세요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => {
                const isEditingTime = editingTimeId === `${routine._source}-${routine.id}`;
                const routineKey = `${routine._source}-${routine.id}`;
                return (
                  <div
                    key={routineKey}
                    className="group rounded-xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e]"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{routine.emoji}</span>
                          <p className="truncate text-[13px] font-medium text-foreground dark:text-[#e5e5e7]">
                            {routine.name}
                          </p>
                          <span
                            className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                              routine.mode === "habit"
                                ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                                : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {routine.mode === "habit" ? "습관" : "할일"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {getRecurrenceLabel(routine.recurrence)}
                          </span>
                          {/* Time badge — clickable to edit */}
                          <button
                            onClick={() => setEditingTimeId(isEditingTime ? null : routineKey)}
                            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                              routine.time_start
                                ? "bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/30"
                                : "bg-orange-50 text-orange-500 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
                            }`}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {routine.time_start
                              ? `${routine.time_start}${routine.time_end ? ` - ${routine.time_end}` : ""}`
                              : "시간 설정"}
                          </button>
                          {routine.days_of_week.length > 0 && (
                            <span className="text-[10px] text-secondary">
                              {formatDays(routine.days_of_week)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateRoutine(routine, { is_active: !routine.is_active })}
                          className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                            routine.is_active
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                          }`}
                        >
                          {routine.is_active ? "활성" : "비활성"}
                        </button>
                        <button
                          onClick={() => deleteRoutine(routine)}
                          className="rounded p-1 text-secondary opacity-0 hover:text-red-500 group-hover:opacity-100"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Inline time editor */}
                    {isEditingTime && (
                      <div className="border-t border-black/[0.04] px-3 pb-2.5 pt-2 dark:border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <TimePicker
                            label="시작"
                            value={routine.time_start ?? ""}
                            onChange={(v) => updateRoutine(routine, { time_start: v || null })}
                          />
                          <span className="text-[11px] text-secondary/50">~</span>
                          <TimePicker
                            label="종료"
                            value={routine.time_end ?? ""}
                            onChange={(v) => updateRoutine(routine, { time_end: v || null })}
                          />
                          {routine.time_start && (
                            <button
                              onClick={() => {
                                updateRoutine(routine, { time_start: null, time_end: null });
                                setEditingTimeId(null);
                              }}
                              className="ml-auto flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              해제
                            </button>
                          )}
                        </div>
                        <p className="mt-1.5 text-[10px] text-secondary/60">
                          {routine.time_start ? "시간표에 고정 배치" : "미설정 시 자동 배치"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
