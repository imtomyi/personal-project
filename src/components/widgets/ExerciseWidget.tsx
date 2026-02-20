"use client";

import { useState, useEffect, useCallback } from "react";
import type { ExerciseEntry, ExerciseType } from "@/lib/workspace-widgets";
import { todayKST, nowKST } from "@/lib/date";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

const EXERCISE_TYPES: { type: ExerciseType; label: string; emoji: string }[] = [
  { type: "cardio", label: "유산소", emoji: "🏃" },
  { type: "strength", label: "근력", emoji: "🏋️" },
  { type: "flexibility", label: "유연성", emoji: "🧘" },
  { type: "sports", label: "스포츠", emoji: "⚽" },
  { type: "other", label: "기타", emoji: "🎯" },
];

const QUICK_EXERCISES: { name: string; type: ExerciseType; durationMin: number; calories: number }[] = [
  { name: "러닝 30분", type: "cardio", durationMin: 30, calories: 300 },
  { name: "웨이트 60분", type: "strength", durationMin: 60, calories: 400 },
  { name: "요가 45분", type: "flexibility", durationMin: 45, calories: 200 },
  { name: "수영 40분", type: "cardio", durationMin: 40, calories: 350 },
  { name: "자전거 30분", type: "cardio", durationMin: 30, calories: 250 },
  { name: "스트레칭 15분", type: "flexibility", durationMin: 15, calories: 50 },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

type DayData = Record<string, ExerciseEntry[]>;

function kstDateKey(daysAgo: number): string {
  const now = nowKST();
  now.setDate(now.getDate() - daysAgo);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function fmtShort(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

export default function ExerciseWidget() {
  const [data, setData] = useState<DayData>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<ExerciseType>("cardio");
  const [customDuration, setCustomDuration] = useState(30);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  const today = todayKST();
  const viewingDay = selectedDay || today;
  const isToday = viewingDay === today;
  const viewEntries = data[viewingDay] || [];
  const todayEntries = data[today] || [];
  const totalMin = todayEntries.reduce((s, e) => s + e.durationMin, 0);
  const totalCal = todayEntries.reduce((s, e) => s + (e.caloriesBurned || 0), 0);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from("exercise_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: true });

    if (!rows) return;

    const grouped: DayData = {};
    for (const row of rows) {
      const entry: ExerciseEntry = {
        id: row.id,
        name: row.name,
        type: row.type,
        durationMin: row.duration_min,
        caloriesBurned: row.calories_burned ?? undefined,
        sets: row.sets ?? undefined,
        reps: row.reps ?? undefined,
        memo: row.memo ?? undefined,
        completedAt: row.completed_at,
      };
      if (!grouped[row.date]) grouped[row.date] = [];
      grouped[row.date].push(entry);
    }
    setData(grouped);
  }, [user, supabase]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useRealtimeSubscription({
    channelName: user ? `exercise:${user.id}` : "exercise:noop",
    table: "exercise_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChanged: fetchSessions,
    skip: !user,
  });

  const addEntry = useCallback(async (entry: Omit<ExerciseEntry, "id" | "completedAt">, targetDay?: string) => {
    if (!user) return;
    const dateKey = targetDay || today;
    const newEntry: ExerciseEntry = {
      ...entry,
      id: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newEntry],
    }));
    await supabase.from("exercise_sessions").insert({
      id: newEntry.id,
      user_id: user.id,
      date: dateKey,
      name: entry.name,
      type: entry.type,
      duration_min: entry.durationMin,
      calories_burned: entry.caloriesBurned || null,
      sets: entry.sets || null,
      reps: entry.reps || null,
      memo: entry.memo || null,
    });
  }, [user, today, supabase]);

  const removeEntry = useCallback(async (id: string, dateKey: string) => {
    setData((prev) => {
      const updated = { ...prev, [dateKey]: (prev[dateKey] || []).filter((e) => e.id !== id) };
      if (updated[dateKey]?.length === 0) delete updated[dateKey];
      return updated;
    });
    await supabase.from("exercise_sessions").delete().eq("id", id);
  }, [supabase]);

  const handleQuickAdd = (ex: typeof QUICK_EXERCISES[0]) => {
    addEntry({ name: ex.name, type: ex.type, durationMin: ex.durationMin, caloriesBurned: ex.calories }, viewingDay);
  };

  const handleCustomAdd = () => {
    if (!customName.trim()) return;
    addEntry({ name: customName.trim(), type: customType, durationMin: customDuration }, viewingDay);
    setCustomName("");
    setCustomDuration(30);
    setShowAdd(false);
  };

  const weekData: { key: string; min: number; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = kstDateKey(i);
    const dayEntries = data[key] || [];
    const min = dayEntries.reduce((s, e) => s + e.durationMin, 0);
    const d = nowKST();
    d.setDate(d.getDate() - i);
    weekData.push({ key, min, label: DAY_LABELS[d.getDay()] });
  }
  const maxWeekMin = Math.max(...weekData.map((d) => d.min), 60);

  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          💪 운동 세션
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          {totalMin > 0 && (
            <>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {totalMin}분
              </span>
              {totalCal > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {totalCal}kcal
                </span>
              )}
            </>
          )}
          <button
            onClick={() => setShowIntegration(!showIntegration)}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="앱 연동"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>
      </div>

      {showIntegration && (
        <div className="mb-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 dark:border-gray-600 dark:bg-gray-700/30">
          <div className="mb-2 flex items-center gap-2">
            <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">앱 연동</span>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "Strava", emoji: "🟠", desc: "나이키런, 가민 등 연동 가능" },
              { name: "Apple 피트니스", emoji: "🍎", desc: "Apple Watch 운동 데이터" },
              { name: "삼성 헬스", emoji: "💙", desc: "Galaxy Watch 운동 데이터" },
            ].map((app) => (
              <div key={app.name} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 dark:bg-gray-700/50">
                <span className="text-sm">{app.emoji}</span>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{app.name}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500">{app.desc}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-400 dark:bg-gray-600 dark:text-gray-500">준비 중</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[9px] text-gray-400 dark:text-gray-500">
            Strava 연동 후 나이키런 / Apple / 삼성 데이터를 자동으로 가져올 수 있습니다
          </p>
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-end gap-1.5">
          {weekData.map((day, i) => {
            const isSelected = day.key === viewingDay;
            const isTodayBar = i === 6;
            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(isTodayBar ? null : day.key)}
                className="flex flex-1 flex-col items-center gap-0.5 group"
                title={`${fmtShort(day.key)} — ${day.min}분`}
              >
                {day.min > 0 && (
                  <span className="text-[8px] font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">{day.min}분</span>
                )}
                <div
                  className={`w-full rounded-t transition-all ${
                    isSelected ? "bg-orange-500 ring-2 ring-orange-300 dark:ring-orange-600"
                      : isTodayBar ? "bg-orange-500"
                        : day.min > 0 ? "bg-orange-200 dark:bg-orange-800/40 group-hover:bg-orange-300 dark:group-hover:bg-orange-700/50"
                          : "bg-gray-100 dark:bg-gray-700/50 group-hover:bg-gray-200 dark:group-hover:bg-gray-600/50"
                  }`}
                  style={{ height: `${Math.max(4, (day.min / maxWeekMin) * 48)}px` }}
                />
                <span className={`text-[9px] ${
                  isSelected ? "font-bold text-orange-600 dark:text-orange-400"
                    : isTodayBar ? "font-bold text-orange-600 dark:text-orange-400"
                      : "text-gray-400 dark:text-gray-500"
                }`}>{day.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewEntries.length > 0 && (
        <div className="mb-3">
          {!isToday && (
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">📅 {fmtShort(viewingDay)} 기록</span>
              <button onClick={() => setSelectedDay(null)} className="text-[10px] text-orange-500 hover:text-orange-700 dark:text-orange-400">오늘로 돌아가기</button>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {viewEntries.map((entry) => {
              const typeInfo = EXERCISE_TYPES.find((t) => t.type === entry.type);
              return (
                <div key={entry.id} className="group flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-gray-700/50">
                  <span className="text-sm">{typeInfo?.emoji || "🎯"}</span>
                  <span className="flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">{entry.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{entry.durationMin}분</span>
                  {entry.caloriesBurned ? <span className="text-[10px] text-orange-500">{entry.caloriesBurned}kcal</span> : null}
                  <button
                    onClick={() => removeEntry(entry.id, viewingDay)}
                    className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {!isToday && (
              <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                합계: {viewEntries.reduce((s, e) => s + e.durationMin, 0)}분
                {viewEntries.reduce((s, e) => s + (e.caloriesBurned || 0), 0) > 0 && ` · ${viewEntries.reduce((s, e) => s + (e.caloriesBurned || 0), 0)}kcal`}
              </div>
            )}
          </div>
        </div>
      )}

      {!isToday && viewEntries.length === 0 && (
        <div className="mb-3 rounded-lg bg-gray-50 py-3 text-center dark:bg-gray-700/50">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{fmtShort(viewingDay)}에 기록된 운동이 없습니다</p>
          <button onClick={() => setSelectedDay(null)} className="mt-1 text-[10px] text-orange-500 hover:text-orange-700 dark:text-orange-400">오늘로 돌아가기</button>
        </div>
      )}

      <div className="mb-2 flex flex-wrap gap-1">
        {QUICK_EXERCISES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => handleQuickAdd(ex)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
          >
            {ex.name}
          </button>
        ))}
      </div>

      {showAdd ? (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-600 dark:bg-gray-700/50">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="운동 이름"
            className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-orange-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); if (e.key === "Escape") setShowAdd(false); }}
          />
          <div className="flex items-center gap-2">
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as ExerciseType)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {EXERCISE_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.emoji} {t.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setCustomDuration(Math.max(15, customDuration - 15))} className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-[10px] font-bold text-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600">−</button>
              <input type="number" value={customDuration} onChange={(e) => setCustomDuration(Number(e.target.value))} className="w-12 rounded-lg border border-gray-200 bg-white px-1 py-1 text-center text-[10px] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300" min={15} step={15} />
              <button type="button" onClick={() => setCustomDuration(customDuration + 15)} className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-[10px] font-bold text-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600">+</button>
              <span className="text-[10px] text-gray-400">분</span>
            </div>
            <div className="flex-1" />
            <button onClick={() => setShowAdd(false)} className="px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600">취소</button>
            <button onClick={handleCustomAdd} className="rounded-lg bg-orange-500 px-3 py-1 text-[10px] font-medium text-white hover:bg-orange-600">추가</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 py-1.5 text-[10px] font-medium text-gray-400 transition-colors hover:border-orange-300 hover:text-orange-500 dark:border-gray-600 dark:hover:border-orange-600 dark:hover:text-orange-400"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isToday ? "직접 입력" : `${fmtShort(viewingDay)}에 추가`}
        </button>
      )}
    </div>
  );
}
