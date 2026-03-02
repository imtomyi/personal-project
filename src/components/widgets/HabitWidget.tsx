"use client";

import { useState, useEffect, useCallback } from "react";
import { useHabits } from "@/hooks/useHabits";
import { todayKST, nowKST, parseLocalDate, toDateStr } from "@/lib/date";
import TimePicker from "@/components/planning/TimePicker";

const EMOJI_OPTIONS = ["✅", "💪", "📚", "🏃", "💧", "🧘", "🎯", "💤", "🍎", "📝"];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getLast7Days(): string[] {
  const days: string[] = [];
  const d = nowKST();
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - i);
    days.push(toDateStr(dd));
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  const today = todayKST();
  if (dateStr === today) return "오늘";
  const d = parseLocalDate(dateStr);
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

  const activeHabits = habits.filter((h) => h.is_active);

  // 주간 완료율
  const totalChecks = activeHabits.length * 7;
  const doneChecks = activeHabits.reduce(
    (sum, h) => sum + days.filter((d) => logs.some((l) => l.habit_id === h.id && l.date === d)).length,
    0,
  );

  if (loading) {
    return (
      <div className="card-surface p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-foreground dark:text-white">루틴</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-foreground dark:text-white">루틴</h3>
          {totalChecks > 0 && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              {Math.round((doneChecks / totalChecks) * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {onOpenRoutineManager && (
            <button
              onClick={onOpenRoutineManager}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
              title="루틴 관리"
            >
              관리
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-md p-0.5 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-3 rounded-lg border border-black/[0.06] bg-[#f5f5f7] p-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <div className="mb-1.5 flex flex-wrap gap-0.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setNewEmoji(e)}
                className={`rounded-md p-0.5 text-[13px] ${
                  newEmoji === e
                    ? "bg-[#007AFF]/10 ring-1 ring-[#007AFF]"
                    : "hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="루틴 이름..."
              className="flex-1 rounded-md border border-black/[0.08] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#007AFF] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-md bg-[#007AFF] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0056b3] disabled:opacity-40"
            >
              추가
            </button>
          </div>

          {/* Time toggle */}
          <button
            onClick={() => setShowTime(!showTime)}
            className={`mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              showTime
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            }`}
          >
            ⏰ 시간표에 표시
          </button>

          {showTime && (
            <div className="mt-1.5 space-y-1.5 rounded-md bg-white/60 p-1.5 dark:bg-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <TimePicker
                  value={newTimeStart}
                  onChange={setNewTimeStart}
                  onClear={() => setNewTimeStart("")}
                  compact
                  placeholder="시작"
                />
                <span className="text-[10px] text-secondary">~</span>
                <TimePicker
                  value={newTimeEnd}
                  onChange={setNewTimeEnd}
                  onClear={() => setNewTimeEnd("")}
                  compact
                  placeholder="종료"
                />
              </div>
              <div className="flex gap-0.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setNewDays(toggleDay(newDays, i))}
                    className={`h-5 w-6 rounded text-[9px] font-medium transition-colors ${
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
      {activeHabits.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-[11px] text-secondary">루틴을 추가해보세요</p>
        </div>
      ) : (
        <div>
          {/* Day headers */}
          <div className="mb-1 flex items-center">
            <div className="w-[72px] flex-shrink-0 sm:w-[100px]" />
            <div className="flex flex-1 items-center justify-between">
              {days.map((d) => {
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    className={`flex w-5 flex-col items-center sm:w-6 ${
                      isToday ? "font-bold text-[#007AFF]" : "text-secondary"
                    }`}
                  >
                    <span className="text-[9px] leading-tight">{getDayLabel(d)}</span>
                  </div>
                );
              })}
            </div>
            <div className="w-6 flex-shrink-0 sm:w-10" />
          </div>

          {/* Habit rows */}
          <div className="-mx-1">
            {activeHabits.map((habit) => {
              const streak = getStreak(habit.id);
              const isEditing = editingId === habit.id;
              const hasTime = !!habit.time_start;

              return (
                <div key={habit.id}>
                  <div className="group flex items-center rounded-md px-1 py-[3px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    {/* Habit name */}
                    <div className="flex w-[72px] flex-shrink-0 items-center gap-1 pr-1 sm:w-[100px]">
                      <span className="flex-shrink-0 text-[12px]">{habit.emoji}</span>
                      <span className="min-w-0 truncate text-[11px] font-medium text-foreground dark:text-[#e5e5e7]">
                        {habit.name}
                      </span>
                    </div>

                    {/* Dot checkboxes */}
                    <div className="flex flex-1 items-center justify-between">
                      {days.map((d) => {
                        const isChecked = logs.some(
                          (l) => l.habit_id === habit.id && l.date === d,
                        );
                        const isToday = d === today;
                        return (
                          <button
                            key={d}
                            onClick={() => toggleLog(habit.id, d)}
                            className={`flex h-5 w-5 items-center justify-center rounded-full transition-all sm:h-6 sm:w-6 ${
                              isChecked
                                ? "bg-emerald-500 text-white dark:bg-emerald-500"
                                : isToday
                                  ? "border-[1.5px] border-[#007AFF]/30 text-[#007AFF]/30 hover:border-[#007AFF]/50 hover:text-[#007AFF]/50"
                                  : "border-[1.5px] border-black/[0.08] text-transparent hover:border-black/[0.15] dark:border-white/[0.1] dark:hover:border-white/[0.2]"
                            }`}
                          >
                            {isChecked && (
                              <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Streak */}
                    <div className="flex w-6 flex-shrink-0 items-center justify-end sm:w-10">
                      {streak > 0 && (
                        <span className="text-[9px] font-semibold tabular-nums text-amber-500">
                          {streak}
                        </span>
                      )}
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="ml-0.5 hidden rounded p-0.5 text-secondary hover:text-red-500 group-hover:inline-flex"
                      >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Time info (subtle, clickable) */}
                  {(hasTime || isEditing) && !isEditing && (
                    <button
                      onClick={() => startEdit(habit)}
                      className="mb-0.5 ml-[76px] truncate text-[9px] text-violet-500 hover:text-violet-700 sm:ml-[104px] dark:text-violet-400"
                    >
                      {formatTimeRange(habit.time_start, habit.time_end)}{" "}
                      {formatDaysShort(habit.days_of_week)}
                    </button>
                  )}

                  {/* Edit time inline */}
                  {isEditing && (
                    <div className="mb-1 ml-[72px] rounded-md border border-violet-200 bg-violet-50/50 p-1.5 sm:ml-[100px] dark:border-violet-800 dark:bg-violet-900/10">
                      <div className="flex items-center gap-1.5">
                        <TimePicker
                          value={editTimeStart}
                          onChange={setEditTimeStart}
                          onClear={() => setEditTimeStart("")}
                          compact
                          placeholder="시작"
                        />
                        <span className="text-[9px] text-secondary">~</span>
                        <TimePicker
                          value={editTimeEnd}
                          onChange={setEditTimeEnd}
                          onClear={() => setEditTimeEnd("")}
                          compact
                          placeholder="종료"
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-0.5">
                        {DAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            onClick={() => setEditDays(toggleDay(editDays, i))}
                            className={`h-4 w-5 rounded text-[8px] font-medium transition-colors ${
                              editDays.includes(i)
                                ? "bg-violet-500 text-white"
                                : "bg-black/[0.04] text-secondary dark:bg-white/[0.06]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        <div className="ml-auto flex gap-0.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-1.5 py-0.5 text-[9px] text-secondary hover:bg-black/[0.05]"
                          >
                            취소
                          </button>
                          <button
                            onClick={saveEdit}
                            className="rounded bg-violet-500 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-violet-600"
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
        </div>
      )}
    </div>
  );
}
