"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { parseLocalDate, isSameDay, isInRange, fmtMD, nowKST, toDateStr } from "@/lib/date";
import { createClient } from "@/lib/supabase";
import type { Workspace } from "@/lib/types";
import { getWorkspaceColorByKey } from "@/hooks/useAllWorkspaceTodos";
import { WEEKDAY_LABELS } from "@/lib/constants";

type CalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  month: number;
};

const DAY_LABELS = WEEKDAY_LABELS;

// 이벤트 카테고리 & 색상
type EventCategory = { color: string; label: string; bgClass: string; textClass: string; barClass: string };

function getEventCategory(title: string): EventCategory {
  if (title.includes("시험"))
    return { color: "#ef4444", label: "시험", bgClass: "bg-red-100 dark:bg-red-900/30", textClass: "text-red-700 dark:text-red-400", barClass: "bg-red-400 dark:bg-red-500" };
  if (title.includes("방학") || title.includes("휴무"))
    return { color: "#22c55e", label: "방학", bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-700 dark:text-emerald-400", barClass: "bg-emerald-400 dark:bg-emerald-500" };
  if (title.includes("수강") || title.includes("정정") || title.includes("등록"))
    return { color: "#f97316", label: "수강", bgClass: "bg-orange-100 dark:bg-orange-900/30", textClass: "text-orange-700 dark:text-orange-400", barClass: "bg-orange-400 dark:bg-orange-500" };
  if (title.includes("개강"))
    return { color: "#3b82f6", label: "개강", bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-700 dark:text-blue-400", barClass: "bg-blue-400 dark:bg-blue-500" };
  if (title.includes("학위") || title.includes("졸업"))
    return { color: "#a855f7", label: "졸업", bgClass: "bg-purple-100 dark:bg-purple-900/30", textClass: "text-purple-700 dark:text-purple-400", barClass: "bg-purple-400 dark:bg-purple-500" };
  if (title.includes("연휴") || title.includes("설") || title.includes("추석") || title.includes("삼일절") || title.includes("대체휴일") || title.includes("어린이날") || title.includes("부처님") || title.includes("현충일") || title.includes("광복절") || title.includes("개천절") || title.includes("한글날") || title.includes("성탄절") || title.includes("신정") || title.includes("제헌절") || title.includes("선거") || title.includes("개시"))
    return { color: "#ec4899", label: "공휴일", bgClass: "bg-pink-100 dark:bg-pink-900/30", textClass: "text-pink-700 dark:text-pink-400", barClass: "bg-pink-400 dark:bg-pink-500" };
  if (title.includes("평가") || title.includes("성적"))
    return { color: "#f59e0b", label: "평가", bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-700 dark:text-amber-400", barClass: "bg-amber-400 dark:bg-amber-500" };
  if (title.includes("신청") || title.includes("휴학") || title.includes("복학") || title.includes("전과") || title.includes("전공") || title.includes("트랙"))
    return { color: "#8b5cf6", label: "신청", bgClass: "bg-violet-100 dark:bg-violet-900/30", textClass: "text-violet-700 dark:text-violet-400", barClass: "bg-violet-400 dark:bg-violet-500" };
  if (title.includes("계절학기"))
    return { color: "#06b6d4", label: "계절", bgClass: "bg-cyan-100 dark:bg-cyan-900/30", textClass: "text-cyan-700 dark:text-cyan-400", barClass: "bg-cyan-400 dark:bg-cyan-500" };
  return { color: "#94a3b8", label: "기타", bgClass: "bg-gray-100 dark:bg-gray-700/50", textClass: "text-gray-600 dark:text-gray-400", barClass: "bg-gray-400 dark:bg-gray-500" };
}

/** 이벤트 제목을 짧게 줄이기 */
function shortTitle(title: string, maxLen = 6): string {
  const clean = title.replace(/\(.*?\)/g, "").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

const LEGEND_ITEMS = [
  { color: "#ef4444", label: "시험" },
  { color: "#ec4899", label: "공휴일" },
  { color: "#3b82f6", label: "개강" },
  { color: "#f97316", label: "수강" },
  { color: "#22c55e", label: "방학" },
  { color: "#8b5cf6", label: "신청" },
];

/* === 스팬 바 관련 타입 === */
type SpanBar = {
  event: CalendarEvent;
  startCol: number;
  spanCols: number;
  isStart: boolean;
  isEnd: boolean;
  row: number;
  category: EventCategory;
};

/* === 레이아웃 상수 === */
const DATE_ROW_H = 28; // 날짜 숫자 행 고정 높이
const SPAN_AREA_H = 36; // 스팬 바 영역 고정 높이 (모든 주 동일)

type Props = {
  workspaces?: Workspace[];
};

export default function KhuAcademicCalendar({ workspaces = [] }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // 워크스페이스 추가 관련 상태
  const [addingEventId, setAddingEventId] = useState<string | null>(null); // 드롭다운 열린 이벤트
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set()); // 이미 추가 완료된 이벤트
  const [addingInProgress, setAddingInProgress] = useState(false);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/khu-calendar");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const today = nowKST();
  const todayStr = toDateStr(today);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 주 단위로 날짜 배열 구성
  const weeks = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const result: (string | null)[][] = [];
    let week: (string | null)[] = [];

    for (let i = 0; i < firstDay; i++) week.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      week.push(ds);
      if (week.length === 7) { result.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [year, month]);

  // 주별 스팬 바 계산
  const weekSpans = useMemo(() => {
    return weeks.map((week) => {
      const spans: SpanBar[] = [];
      const weekDates = week.filter((d): d is string => d !== null);
      if (weekDates.length === 0) return spans;

      const weekStartDate = parseLocalDate(weekDates[0]);
      const weekEndDate = parseLocalDate(weekDates[weekDates.length - 1]);

      for (const event of events) {
        const evStart = parseLocalDate(event.startDate);
        const evEnd = event.endDate ? parseLocalDate(event.endDate) : evStart;

        if (evEnd < weekStartDate || evStart > weekEndDate) continue;

        const visStart = evStart < weekStartDate ? weekStartDate : evStart;
        const visEnd = evEnd > weekEndDate ? weekEndDate : evEnd;

        const startCol = week.indexOf(toDateStr(visStart));
        const endCol = week.indexOf(toDateStr(visEnd));
        if (startCol === -1 || endCol === -1) continue;

        spans.push({
          event,
          startCol,
          spanCols: endCol - startCol + 1,
          isStart: evStart >= weekStartDate,
          isEnd: evEnd <= weekEndDate,
          row: 0,
          category: getEventCategory(event.title),
        });
      }

      spans.sort((a, b) => a.startCol - b.startCol || b.spanCols - a.spanCols);

      const rowOccupied: number[][] = [];
      for (const span of spans) {
        let assignedRow = 0;
        while (true) {
          if (!rowOccupied[assignedRow]) rowOccupied[assignedRow] = [];
          const conflict = rowOccupied[assignedRow].some((occupied) => {
            const occStart = occupied >> 16;
            const occEnd = occupied & 0xffff;
            return span.startCol <= occEnd && (span.startCol + span.spanCols - 1) >= occStart;
          });
          if (!conflict) break;
          assignedRow++;
        }
        span.row = assignedRow;
        if (!rowOccupied[assignedRow]) rowOccupied[assignedRow] = [];
        rowOccupied[assignedRow].push((span.startCol << 16) | (span.startCol + span.spanCols - 1));
      }

      return spans;
    });
  }, [weeks, events]);

  // 이번 달 전체에서 최대 스팬 행 수 구하기
  const globalMaxRow = useMemo(() => {
    let max = 0;
    for (const spans of weekSpans) {
      for (const s of spans) {
        if (s.row + 1 > max) max = s.row + 1;
      }
    }
    return Math.max(max, 1); // 최소 1행 확보
  }, [weekSpans]);

  // 스팬 바 크기를 고정 영역에 맞춰 계산
  const barLayout = useMemo(() => {
    const gap = 2;
    // 고정 영역 내에서 바 높이 계산: (barH + gap) * rowCount + gap = SPAN_AREA_H
    const barH = Math.max(Math.floor((SPAN_AREA_H - gap) / globalMaxRow - gap), 8);
    // 실제 사용되는 fontSize 계산 (바가 너무 작으면 글씨 줄임)
    const fontSize = barH >= 16 ? 9 : barH >= 12 ? 8 : 7;
    return { barH, gap, fontSize };
  }, [globalMaxRow]);

  // 단일 날짜 이벤트
  const singleDayEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (event.endDate && event.endDate !== event.startDate) continue;
      const existing = map.get(event.startDate) || [];
      existing.push(event);
      map.set(event.startDate, existing);
    }
    return map;
  }, [events]);

  function getEventsForDate(date: Date): CalendarEvent[] {
    return events.filter((e) => {
      const start = parseLocalDate(e.startDate);
      const end = e.endDate ? parseLocalDate(e.endDate) : null;
      return isInRange(date, start, end);
    });
  }

  const activeEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); }
  function goToday() { setCurrentDate(new Date()); setSelectedDate(null); }

  // 학사일정 → 워크스페이스 todo로 추가
  async function addEventToWorkspace(event: CalendarEvent, workspace: Workspace) {
    setAddingInProgress(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // duration 계산: endDate가 있으면 일수 * 24, 없으면 24 (1일)
      let durationDays = 24;
      if (event.endDate && event.endDate !== event.startDate) {
        const start = parseLocalDate(event.startDate);
        const end = parseLocalDate(event.endDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        durationDays = diffDays * 24;
      }

      const { error } = await supabase.from("todos").insert({
        workspace_id: workspace.id,
        title: event.title,
        description: "경희대 학사일정",
        due_date: event.startDate,
        duration_days: durationDays,
        created_by: user.id,
        sort_order: 0,
      });

      if (!error) {
        setAddedEvents((prev) => new Set(prev).add(`${event.id}-${workspace.id}`));
        setAddingEventId(null);
      }
    } catch {
      // silent fail
    } finally {
      setAddingInProgress(false);
    }
  }

  // 전체 셀 높이 (날짜행 + 스팬바 영역) — 모든 주 동일
  const CELL_H = DATE_ROW_H + SPAN_AREA_H;

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="animate-pulse">
          <div className="mb-3 h-5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="rounded bg-gray-100 dark:bg-gray-700" style={{ height: `${CELL_H}px` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {year}년 {month + 1}월
          </h3>
          <button
            onClick={goToday}
            className="rounded border border-[#9B1B30]/20 bg-[#9B1B30]/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[#9B1B30] hover:bg-[#9B1B30]/[0.12] dark:border-[#9B1B30]/30 dark:bg-[#9B1B30]/20 dark:text-[#e8a0ad]"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={prevMonth} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={nextMonth} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className="rounded-sm" style={{ width: "6px", height: "6px", background: item.color }} />
            <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* 캘린더 */}
      <div className="px-2 pb-2">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className={`py-1.5 text-center text-[10px] font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 주별 렌더링 — 모든 주 동일 높이 */}
        {weeks.map((week, weekIdx) => {
          const spans = weekSpans[weekIdx];

          return (
            <div key={weekIdx} className="relative border-b border-gray-200 dark:border-gray-700" style={{ height: `${CELL_H}px` }}>
              {/* 날짜 셀 그리드 */}
              <div className="grid h-full grid-cols-7">
                {week.map((dateStr, colIdx) => {
                  const isLastCol = colIdx === 6;
                  if (!dateStr) {
                    return (
                      <div
                        key={`empty-${weekIdx}-${colIdx}`}
                        className={`${isLastCol ? "" : "border-r border-gray-100 dark:border-gray-700/50"}`}
                      />
                    );
                  }

                  const dayNum = parseInt(dateStr.split("-")[2]);
                  const isToday = dateStr === todayStr;
                  const parsedDate = parseLocalDate(dateStr);
                  const isSelected = selectedDate ? isSameDay(parsedDate, selectedDate) : false;
                  const singleEvts = singleDayEvents.get(dateStr) || [];

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(parsedDate)}
                      className={`flex flex-col text-left transition-colors ${isLastCol ? "" : "border-r border-gray-100 dark:border-gray-700/50"} ${
                        isSelected
                          ? "bg-[#9B1B30]/[0.06] dark:bg-[#9B1B30]/[0.12]"
                          : isToday
                            ? "bg-[#9B1B30]/[0.03] dark:bg-[#9B1B30]/[0.06]"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-0.5 px-1" style={{ height: `${DATE_ROW_H}px` }}>
                        <span
                          className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] leading-none ${
                            isSelected
                              ? "bg-[#9B1B30] font-bold text-white"
                              : isToday
                                ? "bg-[#9B1B30] font-bold text-white shadow-sm shadow-[#9B1B30]/30"
                                : colIdx === 0
                                  ? "font-medium text-red-500 dark:text-red-400"
                                  : colIdx === 6
                                    ? "font-medium text-blue-500 dark:text-blue-400"
                                    : "font-medium text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {singleEvts.length > 0 && (
                          <div className="flex gap-0.5">
                            {singleEvts.slice(0, 3).map((ev, i) => {
                              const cat = getEventCategory(ev.title);
                              return (
                                <span
                                  key={`${ev.id}-${i}`}
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: cat.color }}
                                  title={ev.title}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 스팬 바 오버레이 — 행 전체 기준으로 left/right 계산 */}
              {spans.map((span, si) => {
                const cat = span.category;
                // 행 전체 너비 기준: left = startCol/7*100%, right = (7-endCol-1)/7*100%
                const endCol = span.startCol + span.spanCols - 1;
                const leftPct = (span.startCol / 7) * 100;
                const rightPct = ((7 - endCol - 1) / 7) * 100;

                return (
                  <div
                    key={`${span.event.id}-${weekIdx}-${si}`}
                    className={`pointer-events-none absolute flex items-center truncate px-1 font-semibold leading-none ${cat.bgClass} ${cat.textClass} ${
                      span.isStart ? "rounded-l-md" : ""
                    } ${span.isEnd ? "rounded-r-md" : ""}`}
                    style={{
                      top: `${DATE_ROW_H + span.row * (barLayout.barH + barLayout.gap) + barLayout.gap}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      right: `calc(${rightPct}% + 2px)`,
                      height: `${barLayout.barH}px`,
                      fontSize: `${barLayout.fontSize}px`,
                      borderLeft: span.isStart ? `2.5px solid ${cat.color}` : undefined,
                    }}
                    title={`${span.event.title} (${fmtMD(span.event.startDate)}${span.event.endDate ? ` ~ ${fmtMD(span.event.endDate)}` : ""})`}
                  >
                    {span.isStart && (
                      <span className="truncate">{shortTitle(span.event.title, 8)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 선택한 날짜 일정 상세 */}
      {selectedDate && activeEvents.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
            </span>
            <span className="rounded-full bg-[#9B1B30]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#9B1B30] dark:bg-[#9B1B30]/20 dark:text-[#e8a0ad]">
              {activeEvents.length}건
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {activeEvents.map((e) => {
              const cat = getEventCategory(e.title);
              const isDropdownOpen = addingEventId === e.id;

              return (
                <div key={e.id} className="relative">
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{
                      borderLeft: `3px solid ${cat.color}`,
                      background: `${cat.color}08`,
                    }}
                  >
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{ color: cat.color, background: `${cat.color}15` }}
                    >
                      {cat.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                      {e.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-400">
                      {fmtMD(e.startDate)}{e.endDate && ` ~ ${fmtMD(e.endDate)}`}
                    </span>
                    {/* 워크스페이스 추가 버튼 */}
                    {workspaces.length > 0 && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setAddingEventId(isDropdownOpen ? null : e.id);
                        }}
                        className={`shrink-0 rounded-md p-1 text-[10px] transition-colors ${
                          addedEvents.has(`${e.id}-`)
                            ? "text-emerald-500"
                            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        }`}
                        title="워크스페이스 캘린더에 추가"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* 워크스페이스 선택 드롭다운 */}
                  {isDropdownOpen && workspaces.length > 0 && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                      <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                        추가할 워크스페이스
                      </div>
                      {workspaces.map((ws) => {
                        const wsColor = getWorkspaceColorByKey(ws.color);
                        const alreadyAdded = addedEvents.has(`${e.id}-${ws.id}`);
                        return (
                          <button
                            key={ws.id}
                            disabled={alreadyAdded || addingInProgress}
                            onClick={() => addEventToWorkspace(e, ws)}
                            className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                              alreadyAdded
                                ? "text-gray-400 dark:text-gray-500"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${wsColor.dot}`} />
                            <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                            {alreadyAdded && (
                              <svg className="h-3 w-3 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 선택했는데 이벤트 없을 때 */}
      {selectedDate && activeEvents.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3 text-center dark:border-gray-700">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 — 일정 없음
          </span>
        </div>
      )}
    </div>
  );
}
