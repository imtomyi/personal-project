"use client";

import { useState, useEffect, useCallback } from "react";
import { useHabits } from "@/hooks/useHabits";
import { todayKST } from "@/lib/date";

const EMOJI_OPTIONS = ["✅", "💪", "📚", "🏃", "💧", "🧘", "🎯", "💤", "🍎", "📝"];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getLast7Days(): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + 540);
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - i);
    days.push(dd.toISOString().slice(0, 10));
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  const today = todayKST();
  if (dateStr === today) return "오늘";
  const d = new Date(dateStr + "T00:00:00");
  return DAY_LABELS[d.getDay()];
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return "";
  return end ? `${start}-${end}` : start;
}

function formatDaysShort(days: number[] | null): string {
  if (!days || days.length === 0) return "";
  if (days.length === 7) return "매일";
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  )
    return "평일";
  return days.map((d) => DAY_LABELS[d]).join("");
}

type HabitWidgetProps = {
  onOpenRoutineManager?: () => void;
};

export default function HabitWidget({ onOpenRoutineManager }: HabitWidgetProps = {}) {
  const {
    habits,
    logs,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleLog,
    getStreak,
  } = useHabits();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("✅");
  // Time settings for add form
  const [showTime, setShowTime] = useState(false);
  const [newTimeStart, setNewTimeStart] = useState("");
  const [newTimeEnd, setNewTimeEnd] = useState("");
  const [newDays, setNewDays] = useState<number[]>([]);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimeStart, setEditTimeStart] = useState("");
  const [editTimeEnd, setEditTimeEnd] = useState("");
  const [editDays, setEditDays] = useState<number[]>([]);

  const days = getLast7Days();
  const today = todayKST();

  // 운동 기록 시 운동 관련 습관 자동 체크
  const handleExerciseLogged = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail as { date: string };
      const exerciseHabit = habits.find(
        (h) =>
          h.is_active &&
          (h.name.includes("운동") ||
            h.name.toLowerCase().includes("exercise") ||
            h.emoji === "💪" ||
            h.emoji === "🏃"),
      );
      if (!exerciseHabit) return;
      const alreadyLogged = logs.some(
        (l) => l.habit_id === exerciseHabit.id && l.date === detail.date,
      );
      if (!alreadyLogged) {
        toggleLog(exerciseHabit.id, detail.date);
      }
    },
    [habits, logs, toggleLog],
  );

  useEffect(() => {
    window.addEventListener("exercise-logged", handleExerciseLogged);
    return () => window.removeEventListener("exercise-logged", handleExerciseLogged);
  }, [handleExerciseLogged]);

  function toggleDay(arr: number[], day: number): number[] {
    return arr.includes(day) ? arr.filter((d) => d !== day) : [...arr, day].sort();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await addHabit(
        newName.trim(),
        newEmoji,
        showTime && newTimeStart
          ? {
              time_start: newTimeStart,
              time_end: newTimeEnd || undefined,
              days_of_week: newDays.length > 0 ? newDays : undefined,
            }
          : undefined,
      );
      setNewName("");
      setNewEmoji("✅");
      setShowTime(false);
      setNewTimeStart("");
      setNewTimeEnd("");
      setNewDays([]);
      setShowAdd(false);
    } catch {
      // Error
    }
  }

  function startEdit(habit: typeof habits[0]) {
    setEditingId(habit.id);
    setEditTimeStart(habit.time_start || "");
    setEditTimeEnd(habit.time_end || "");
    setEditDays(habit.days_of_week || []);
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await updateHabit(editingId, {
        time_start: editTimeStart || null,
        time_end: editTimeEnd || null,
        days_of_week: editDays.length > 0 ? editDays : null,
      });
      setEditingId(null);
    } catch {
      // Error
    }
  }

  if (loading) {
    return (
      <div className="card-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">습관 트래커</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">습관 트래커</h3>
        </div>
        <div className="flex items-center gap-1">
          {onOpenRoutineManager && (
            <button
              onClick={onOpenRoutineManager}
              className="rounded-lg px-2 py-1 text-[10px] font-medium text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
              title="루틴 관리"
            >
              🔄 관리
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-lg p-1 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-xl border border-black/[0.06] bg-[#f5f5f7] p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {EMOJI_OPTIONS.map((e) => (
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
          </div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="습관 이름..."
              className="flex-1 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#007AFF] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-lg bg-[#007AFF] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0056b3] disabled:opacity-40"
            >
              추가
            </button>
          </div>

          {/* Time toggle */}
          <button
            onClick={() => setShowTime(!showTime)}
            className={`mt-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              showTime
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            }`}
          >
            ⏰ 시간표에 표시
          </button>

          {showTime && (
            <div className="mt-2 space-y-2 rounded-lg bg-white/60 p-2 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newTimeStart}
                  onChange={(e) => setNewTimeStart(e.target.value)}
                  className="rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[12px] outline-none focus:border-violet-400 dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                />
                <span className="text-[11px] text-secondary">~</span>
                <input
                  type="time"
                  value={newTimeEnd}
                  onChange={(e) => setNewTimeEnd(e.target.value)}
                  className="rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[12px] outline-none focus:border-violet-400 dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                />
              </div>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setNewDays(toggleDay(newDays, i))}
                    className={`h-6 w-7 rounded-md text-[10px] font-medium transition-colors ${
                      newDays.includes(i)
                        ? "bg-violet-500 text-white"
                        : "bg-black/[0.04] text-secondary hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Habit grid */}
      {habits.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[12px] text-secondary">습관을 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Day headers */}
          <div className="flex items-center">
            <div className="w-[120px] flex-shrink-0" />
            <div className="flex flex-1 justify-between">
              {days.map((d) => (
                <div
                  key={d}
                  className={`flex w-8 flex-col items-center text-[10px] ${
                    d === today ? "font-bold text-[#007AFF]" : "text-secondary"
                  }`}
                >
                  <span>{getDayLabel(d)}</span>
                  <span className="text-[9px]">{d.slice(8)}</span>
                </div>
              ))}
            </div>
            <div className="w-12 flex-shrink-0" />
          </div>

          {/* Habit rows */}
          {habits
            .filter((h) => h.is_active)
            .map((habit) => {
              const streak = getStreak(habit.id);
              const isEditing = editingId === habit.id;
              const hasTime = !!habit.time_start;

              return (
                <div key={habit.id}>
                  <div className="group flex items-center rounded-lg py-1 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    {/* Habit name + time badge */}
                    <div className="flex w-[120px] flex-shrink-0 flex-col pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{habit.emoji}</span>
                        <span className="truncate text-[12px] font-medium text-foreground dark:text-[#e5e5e7]">
                          {habit.name}
                        </span>
                      </div>
                      {hasTime && (
                        <button
                          onClick={() =>
                            isEditing ? setEditingId(null) : startEdit(habit)
                          }
                          className="ml-5 truncate text-left text-[9px] text-violet-500 hover:text-violet-700 dark:text-violet-400"
                        >
                          {formatTimeRange(habit.time_start, habit.time_end)}{" "}
                          {formatDaysShort(habit.days_of_week)}
                        </button>
                      )}
                      {!hasTime && (
                        <button
                          onClick={() => startEdit(habit)}
                          className="ml-5 text-left text-[9px] text-secondary opacity-0 group-hover:opacity-100"
                        >
                          + 시간 설정
                        </button>
                      )}
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-1 justify-between">
                      {days.map((d) => {
                        const isChecked = logs.some(
                          (l) => l.habit_id === habit.id && l.date === d
                        );
                        return (
                          <button
                            key={d}
                            onClick={() => toggleLog(habit.id, d)}
                            className={`flex h-7 w-8 items-center justify-center rounded-md transition-all ${
                              isChecked
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "text-black/[0.1] hover:bg-black/[0.04] dark:text-white/[0.1] dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            {isChecked ? (
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <span className="h-4 w-4 rounded-md border-2 border-current" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Streak + delete */}
                    <div className="flex w-12 flex-shrink-0 items-center justify-end gap-1">
                      {streak > 0 && (
                        <span
                          className="text-[10px] font-medium text-amber-500"
                          title={`${streak}일 연속`}
                        >
                          🔥{streak}
                        </span>
                      )}
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="rounded p-0.5 text-secondary opacity-0 hover:text-red-500 group-hover:opacity-100"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Edit time inline */}
                  {isEditing && (
                    <div className="mb-1 ml-5 rounded-lg border border-violet-200 bg-violet-50/50 p-2 dark:border-violet-800 dark:bg-violet-900/10">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={editTimeStart}
                          onChange={(e) => setEditTimeStart(e.target.value)}
                          className="rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[11px] outline-none focus:border-violet-400 dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                        />
                        <span className="text-[10px] text-secondary">~</span>
                        <input
                          type="time"
                          value={editTimeEnd}
                          onChange={(e) => setEditTimeEnd(e.target.value)}
                          className="rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[11px] outline-none focus:border-violet-400 dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
                        />
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {DAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setEditDays(toggleDay(editDays, i))
                            }
                            className={`h-5 w-6 rounded text-[9px] font-medium transition-colors ${
                              editDays.includes(i)
                                ? "bg-violet-500 text-white"
                                : "bg-black/[0.04] text-secondary dark:bg-white/[0.06]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-2 py-0.5 text-[10px] text-secondary hover:bg-black/[0.05]"
                          >
                            취소
                          </button>
                          <button
                            onClick={saveEdit}
                            className="rounded bg-violet-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-violet-600"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
