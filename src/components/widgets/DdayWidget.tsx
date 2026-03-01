"use client";

import { useState, useMemo } from "react";
import { useDdayEntries } from "@/hooks/useDdayEntries";
import { todayKST, parseLocalDate } from "@/lib/date";
import { DDAY_COLOR_OPTIONS, DDAY_EMOJI_OPTIONS, WEEKDAY_LABELS, SESSION_DURATION_PRESETS } from "@/lib/constants";

const COLOR_OPTIONS = DDAY_COLOR_OPTIONS;
const EMOJI_OPTIONS = DDAY_EMOJI_OPTIONS;

function getDaysUntil(targetDate: string): number {
  const today = parseLocalDate(todayKST());
  const target = parseLocalDate(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDday(days: number): string {
  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

/* ==========================================
   미니 캘린더 (날짜 선택용)
   ========================================== */
function MiniCalendar({
  selected,
  onSelect,
  accentColor,
}: {
  selected: string;
  onSelect: (dateStr: string) => void;
  accentColor: string;
}) {
  const todayStr = todayKST();
  const initial = selected || todayStr;
  const [viewYear, setViewYear] = useState(() => parseInt(initial.split("-")[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(initial.split("-")[1]) - 1);

  const colorInfo = COLOR_OPTIONS.find((c) => c.value === accentColor) || COLOR_OPTIONS[0];

  const weeks = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const result: (string | null)[][] = [];
    let week: (string | null)[] = [];

    for (let i = 0; i < firstDay; i++) week.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      week.push(ds);
      if (week.length === 7) { result.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [viewYear, viewMonth]);

  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  function prev() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function next() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-700">
      <div className="mb-1.5 flex items-center justify-between">
        <button onClick={prev} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{monthLabel}</span>
        <button onClick={next} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mb-0.5 grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((d, i) => (
          <span
            key={d}
            className={`text-[9px] font-medium ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((ds, di) => {
            if (!ds) return <div key={`e-${wi}-${di}`} className="h-6" />;
            const day = parseInt(ds.split("-")[2]);
            const isToday = ds === todayStr;
            const isSelected = ds === selected;
            const colIdx = di;

            return (
              <button
                key={ds}
                type="button"
                onClick={() => onSelect(ds)}
                className={`flex h-6 w-full items-center justify-center rounded-md text-[10px] font-medium transition-all ${
                  isSelected
                    ? `${colorInfo.bg} text-white font-bold`
                    : isToday
                      ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : colIdx === 0
                        ? "text-red-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                        : colIdx === 6
                          ? "text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ==========================================
   DdayWidget 메인
   ========================================== */
export default function DdayWidget() {
  const { entries, loading, addEntry, updateEntry, removeEntry, archiveEntry, restoreEntry } = useDdayEntries();
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newEmoji, setNewEmoji] = useState("📌");
  const [newColor, setNewColor] = useState("blue");
  const [newMinutes, setNewMinutes] = useState(30);

  async function handleAdd() {
    if (!newTitle.trim() || !newDate) return;
    try {
      await addEntry(newTitle.trim(), newDate, newEmoji, newColor, newMinutes);
      setNewTitle("");
      setNewDate("");
      setNewEmoji("📌");
      setNewColor("blue");
      setNewMinutes(30);
      setShowAdd(false);
    } catch {
      // ignore
    }
  }

  // Active / Archived 분리
  const activeEntries = useMemo(() => entries.filter((e) => !e.is_archived), [entries]);
  const archivedEntries = useMemo(() => entries.filter((e) => e.is_archived), [entries]);

  // Sort entries: upcoming first, then past
  const sortedEntries = [...activeEntries].sort((a, b) => {
    const da = getDaysUntil(a.date);
    const db = getDaysUntil(b.date);
    if (da >= 0 && db >= 0) return da - db;
    if (da < 0 && db < 0) return db - da;
    return da >= 0 ? -1 : 1;
  });

  if (loading) {
    return (
      <div className="card-surface flex items-center justify-center p-5 py-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          📌 디데이
        </h3>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {activeEntries.length}개
        </span>
      </div>

      {/* D-day entries — 1열 리스트 */}
      {sortedEntries.length > 0 ? (
        <div className="mb-3 space-y-2">
          {sortedEntries.map((entry) => {
            const days = getDaysUntil(entry.date);
            const colorInfo = COLOR_OPTIONS.find((c) => c.value === entry.color) || COLOR_OPTIONS[0];
            const isPast = days < 0;
            const isToday = days === 0;

            return (
              <div
                key={entry.id}
                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${colorInfo.light}`}
              >
                <span className="flex-shrink-0 text-base">{entry.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-semibold ${colorInfo.text}`}>
                    {entry.title}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {entry.date.replace(/-/g, ".")}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                    <select
                      value={entry.estimated_minutes}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateEntry(entry.id, { estimated_minutes: Number(e.target.value) }).catch(() => {});
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="appearance-none bg-transparent text-[10px] text-gray-400 outline-none hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {SESSION_DURATION_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <span className={`flex-shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                  isToday
                    ? `${colorInfo.bg} text-white`
                    : isPast
                      ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      : `${colorInfo.text} font-bold`
                }`}>
                  {formatDday(days)}
                </span>
                <button
                  onClick={() => archiveEntry(entry.id)}
                  title="아카이브"
                  className="flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-amber-500 group-hover:opacity-100 dark:text-gray-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </button>
                <button
                  onClick={() => removeEntry(entry.id)}
                  title="삭제"
                  className="flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-3 flex flex-col items-center py-4 text-center">
          <span className="mb-1 text-2xl opacity-40">📌</span>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            중요한 날을 추가해보세요
          </p>
        </div>
      )}

      {/* Archived section */}
      {archivedEntries.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700/50"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showArchived ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            아카이브 ({archivedEntries.length}개)
          </button>
          {showArchived && (
            <div className="mt-1.5 space-y-1.5">
              {archivedEntries.map((entry) => {
                const days = getDaysUntil(entry.date);
                return (
                  <div
                    key={entry.id}
                    className="group flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-700/30"
                  >
                    <span className="flex-shrink-0 text-base opacity-50">{entry.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-400 dark:text-gray-500">
                        {entry.title}
                      </p>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">
                        {entry.date.replace(/-/g, ".")} · {formatDday(days)}
                      </span>
                    </div>
                    <button
                      onClick={() => restoreEntry(entry.id)}
                      title="복원"
                      className="flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-blue-500 group-hover:opacity-100 dark:text-gray-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      title="영구 삭제"
                      className="flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="제목 (예: 기말고사, 졸업식)"
            className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Escape") setShowAdd(false); }}
          />

          <div className="mb-2">
            {newDate && (
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  선택: {newDate.replace(/-/g, ".")}
                </span>
                <button
                  type="button"
                  onClick={() => setNewDate("")}
                  className="text-[10px] text-gray-400 hover:text-red-500"
                >
                  초기화
                </button>
              </div>
            )}
            <MiniCalendar
              selected={newDate}
              onSelect={setNewDate}
              accentColor={newColor}
            />
          </div>

          <div className="mb-2 flex flex-wrap gap-1">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setNewEmoji(e)}
                className={`rounded-md px-1.5 py-0.5 text-sm transition-colors ${
                  newEmoji === e
                    ? "bg-blue-100 ring-1 ring-blue-400 dark:bg-blue-900/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="mb-2 flex gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNewColor(c.value)}
                className={`h-5 w-5 rounded-full ${c.bg} transition-transform ${
                  newColor === c.value ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"
                }`}
                title={c.label}
              />
            ))}
          </div>

          {/* 소요 시간 — 간결한 select */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              ⏱ 소요 시간
            </span>
            <select
              value={newMinutes}
              onChange={(e) => setNewMinutes(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {SESSION_DURATION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1 text-[11px] text-gray-400 hover:text-gray-600">취소</button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || !newDate}
              className="rounded-lg bg-blue-500 px-4 py-1 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 py-1.5 text-[10px] font-medium text-gray-400 transition-colors hover:border-blue-300 hover:text-blue-500 dark:border-gray-600 dark:hover:border-blue-600"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          디데이 추가
        </button>
      )}
    </div>
  );
}
