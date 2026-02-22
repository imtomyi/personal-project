"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Workspace } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { parseLocalDate, todayKST, toDateStr, nowKST, fmtMD, getDurationInDays, formatDurationShort } from "@/lib/date";
import { WEEKDAY_LABELS, DDAY_COLOR_MAP } from "@/lib/constants";
import type { WorkspaceTodo } from "@/hooks/useAllWorkspaceTodos";
import { getWorkspaceColorByKey } from "@/hooks/useAllWorkspaceTodos";
import type { DdayEntry } from "@/lib/types";

type CanvasCourseInfo = { id: string; name: string };

type WorkspaceCalendarProps = {
  todos: WorkspaceTodo[];
  workspaces: Workspace[];
  loading?: boolean;
  canvasConnected?: boolean;
  canvasCourses?: CanvasCourseInfo[];
  ddayEntries?: DdayEntry[];
  onUpdateTodo?: (id: string, updates: Partial<{ due_date: string | null; duration_days: number }>) => Promise<void>;
};

type SpanEntry = {
  todo: WorkspaceTodo;
  startCol: number;
  spanCols: number;
  isStart: boolean;
  isEnd: boolean;
  row: number;
  colorKey: string;
};

type DdaySpanEntry = {
  dday: DdayEntry;
  col: number;
  row: number;
};

// Canvas (LearningX) 전용 색상
const CANVAS_COLOR = {
  bg: "bg-violet-100 dark:bg-violet-900/30",
  text: "text-violet-700 dark:text-violet-400",
  dot: "bg-violet-500",
};

type PopoverInfo = {
  todo: WorkspaceTodo;
  x: number;
  y: number;
  colorKey: string;
};


export default function WorkspaceCalendar({ todos, workspaces, loading, canvasConnected, canvasCourses = [], ddayEntries = [], onUpdateTodo }: WorkspaceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredTodo, setHoveredTodo] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverInfo | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // 팝오버 외부 클릭 감지
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    }
    if (popover) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [popover]);

  const handleSpanClick = useCallback((e: React.MouseEvent, todo: WorkspaceTodo, colorKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const calRect = calendarRef.current?.getBoundingClientRect();
    if (!calRect) return;
    const x = e.clientX - calRect.left;
    const y = e.clientY - calRect.top;
    setPopover({ todo, x, y, colorKey });
  }, []);

  // Drag handlers for moving/resizing spans
  function handleDragStart(e: React.DragEvent, todo: WorkspaceTodo, mode: "move" | "resize") {
    if (todo.source === "canvas") return; // Can't edit Canvas todos
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: todo.id, duration_days: todo.duration_days, due_date: todo.due_date, mode }));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(dateStr);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    setDragOver(null);
    if (!onUpdateTodo) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (!data.id) return;

      if (data.mode === "resize" && data.due_date) {
        const start = parseLocalDate(data.due_date);
        const end = parseLocalDate(dateStr);
        const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        onUpdateTodo(data.id, { duration_days: diffDays * 24 });
      } else {
        onUpdateTodo(data.id, { due_date: dateStr });
      }
    } catch {
      // ignore
    }
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString("ko-KR", {
    month: "long",
    year: "numeric",
  });

  // Workspace color map
  const wsColorMap = useMemo(() => {
    const map = new Map<string, string>();
    workspaces.forEach((ws) => map.set(ws.id, ws.color));
    return map;
  }, [workspaces]);

  // Filter real todos (no section headers, no subtasks) with due dates
  const realTodos = useMemo(
    () => todos.filter((t) =>
      (t.source === "canvas" || t.description !== SECTION_HEADER_MARKER)
      && t.due_date
      && !t.parent_id
    ),
    [todos]
  );

  const weeks = useMemo(() => {
    const result: (string | null)[][] = [];
    let currentWeek: (string | null)[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      currentWeek.push(dateStr);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      result.push(currentWeek);
    }

    return result;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  // Build unified spans: workspace todos + D-day entries all in same row system
  const weekSpanData = useMemo(() => {
    return weeks.map((week) => {
      const spans: SpanEntry[] = [];
      const ddaySpans: DdaySpanEntry[] = [];
      const weekStart = week.find((d) => d !== null);
      const weekEnd = [...week].reverse().find((d) => d !== null);
      if (!weekStart || !weekEnd) return { spans, ddaySpans, totalRows: 0 };

      const weekStartDate = parseLocalDate(weekStart);
      const weekEndDate = parseLocalDate(weekEnd);

      // 1) Workspace todo spans
      for (const todo of realTodos) {
        const todoStart = parseLocalDate(todo.due_date!);
        const durationDays = getDurationInDays(todo.duration_days);
        const todoEnd = new Date(todoStart);
        todoEnd.setDate(todoEnd.getDate() + durationDays - 1);

        if (todoEnd < weekStartDate || todoStart > weekEndDate) continue;

        const visStart = todoStart < weekStartDate ? weekStartDate : todoStart;
        const visEnd = todoEnd > weekEndDate ? weekEndDate : todoEnd;

        const startCol = week.indexOf(toDateStr(visStart));
        const endCol = week.indexOf(toDateStr(visEnd));

        if (startCol === -1 || endCol === -1) continue;

        spans.push({
          todo,
          startCol,
          spanCols: endCol - startCol + 1,
          isStart: todoStart >= weekStartDate,
          isEnd: todoEnd <= weekEndDate,
          row: 0,
          colorKey: wsColorMap.get(todo.workspace_id) ?? "blue",
        });
      }

      // Sort & assign rows for todo spans
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

      // 2) D-day entries as single-col entries in the same row system
      for (const dday of ddayEntries) {
        const col = week.indexOf(dday.date);
        if (col === -1) continue;

        // Find a row that doesn't conflict at this column
        let assignedRow = 0;
        while (true) {
          if (!rowOccupied[assignedRow]) rowOccupied[assignedRow] = [];
          const conflict = rowOccupied[assignedRow].some((occupied) => {
            const occStart = occupied >> 16;
            const occEnd = occupied & 0xffff;
            return col >= occStart && col <= occEnd;
          });
          if (!conflict) break;
          assignedRow++;
        }
        ddaySpans.push({ dday, col, row: assignedRow });
        if (!rowOccupied[assignedRow]) rowOccupied[assignedRow] = [];
        rowOccupied[assignedRow].push((col << 16) | col);
      }

      const maxRow = Math.max(
        spans.length > 0 ? Math.max(...spans.map((s) => s.row)) : -1,
        ddaySpans.length > 0 ? Math.max(...ddaySpans.map((s) => s.row)) : -1,
      );
      const totalRows = maxRow >= 0 ? maxRow + 1 : 0;

      return { spans, ddaySpans, totalRows };
    });
  }, [weeks, realTodos, wsColorMap, ddayEntries]);

  // Quick stats
  const stats = useMemo(() => {
    const total = realTodos.length;
    const completed = realTodos.filter((t) => t.is_completed).length;
    const active = total - completed;
    const today = todayKST();
    const overdue = realTodos.filter((t) => {
      if (t.is_completed || !t.due_date) return false;
      const s = parseLocalDate(t.due_date);
      const dur = getDurationInDays(t.duration_days);
      const e = new Date(s); e.setDate(e.getDate() + dur - 1);
      return toDateStr(e) < today;
    }).length;
    const dueToday = realTodos.filter((t) => {
      if (t.is_completed || !t.due_date) return false;
      const s = parseLocalDate(t.due_date);
      const dur = getDurationInDays(t.duration_days);
      const e = new Date(s); e.setDate(e.getDate() + dur - 1);
      return toDateStr(e) === today;
    }).length;
    return { total, completed, active, overdue, dueToday };
  }, [realTodos]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  const todayStr = todayKST();
  const days = WEEKDAY_LABELS;

  function getSpanColor(todo: WorkspaceTodo, colorKey: string) {
    const isCanvas = todo.source === "canvas";
    const color = isCanvas ? CANVAS_COLOR : getWorkspaceColorByKey(colorKey);
    const borderClass = !isCanvas ? (getWorkspaceColorByKey(colorKey) as { border?: string }).border ?? "" : "border-l-violet-500";

    if (todo.is_completed) {
      return "bg-gray-100 text-gray-400 line-through dark:bg-gray-700/50 dark:text-gray-500";
    }
    const start = parseLocalDate(todo.due_date!);
    const durDays = getDurationInDays(todo.duration_days);
    const end = new Date(start);
    end.setDate(end.getDate() + durDays - 1);
    const now = nowKST();
    if (end < now && toDateStr(end) !== toDateStr(now)) {
      return `bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-l-2 border-l-red-500`;
    }
    return `${color.bg} ${color.text} border-l-2 ${borderClass}`;
  }

  if (loading) {
    return (
      <div className="card-surface p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 px-5 py-3 backdrop-blur-sm dark:bg-[#1c1c1e]/80">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">⏳</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{stats.active} 진행 중</span>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⚠️</span>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">{stats.overdue} 지연</span>
            </div>
          )}
          {stats.dueToday > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs">📌</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{stats.dueToday} 오늘</span>
            </div>
          )}

          {/* Workspace + Canvas color legend */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canvasConnected && (
              <Link
                href="/khu"
                className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
              >
                <span className={`h-2 w-2 rounded-full ${CANVAS_COLOR.dot}`} />
                LearningX
              </Link>
            )}
            {workspaces.slice(0, 5).map((ws) => {
              const color = getWorkspaceColorByKey(ws.color);
              return (
                <Link
                  key={ws.id}
                  href={`/workspace/${ws.id}`}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                  {ws.name}
                </Link>
              );
            })}
            {workspaces.length > 5 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                +{workspaces.length - 5}개
              </span>
            )}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div ref={calendarRef} className="card-surface relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <h3 className="text-[17px] font-semibold text-foreground dark:text-white">
              {monthName}
            </h3>
            <div className="flex items-center gap-0.5">
              <button
                onClick={prevMonth}
                className="rounded-full p-1.5 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="rounded-full p-1.5 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={goToday}
            className="rounded-full bg-black/[0.05] px-3.5 py-1 text-[13px] font-medium text-foreground hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            오늘
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-black/[0.06] dark:border-white/[0.08]">
          {days.map((day, i) => (
            <div
              key={day}
              className={`py-2.5 text-center text-[12px] font-medium ${
                i === 0
                  ? "text-red-400"
                  : i === 6
                    ? "text-blue-400"
                    : "text-secondary"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIdx) => {
          const { spans, ddaySpans } = weekSpanData[weekIdx];
          const MAX_VISIBLE_ROWS = 5;
          const visibleSpans = spans.filter((s) => s.row < MAX_VISIBLE_ROWS);
          const visibleDdaySpans = ddaySpans.filter((s) => s.row < MAX_VISIBLE_ROWS);
          const spanAreaHeight = MAX_VISIBLE_ROWS * 12 + 2;

          // Count hidden items per column
          const hiddenByCol: Record<number, { todos: SpanEntry[]; ddays: DdaySpanEntry[] }> = {};
          for (const span of spans) {
            if (span.row >= MAX_VISIBLE_ROWS) {
              for (let c = span.startCol; c < span.startCol + span.spanCols; c++) {
                if (!hiddenByCol[c]) hiddenByCol[c] = { todos: [], ddays: [] };
                hiddenByCol[c].todos.push(span);
              }
            }
          }
          for (const ds of ddaySpans) {
            if (ds.row >= MAX_VISIBLE_ROWS) {
              if (!hiddenByCol[ds.col]) hiddenByCol[ds.col] = { todos: [], ddays: [] };
              hiddenByCol[ds.col].ddays.push(ds);
            }
          }

          return (
            <div key={weekIdx} className="relative">
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {week.map((dateStr, colIdx) => {
                  if (!dateStr) {
                    return (
                      <div
                        key={`empty-${weekIdx}-${colIdx}`}
                        className="border-b border-r border-black/[0.04] dark:border-white/[0.04]"
                        style={{ minHeight: `${38 + spanAreaHeight}px` }}
                      />
                    );
                  }

                  const day = parseInt(dateStr.split("-")[2]);
                  const isToday = dateStr === todayStr;
                  const colDay = colIdx;
                  const hidden = hiddenByCol[colIdx];
                  const hiddenCount = hidden ? hidden.todos.length + hidden.ddays.length : 0;

                  const isDragTarget = dragOver === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      className={`group/cell relative border-b border-r border-black/[0.04] dark:border-white/[0.04] ${
                        isToday ? "bg-blue-500/[0.04] dark:bg-blue-500/[0.08]" : ""
                      } ${isDragTarget ? "bg-blue-100/50 dark:bg-blue-900/30 ring-1 ring-inset ring-blue-300 dark:ring-blue-600" : ""}`}
                      style={{ minHeight: `${38 + spanAreaHeight}px` }}
                    >
                      {/* Day number */}
                      <div className="flex items-center justify-between p-1.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isToday
                              ? "bg-blue-500 font-bold text-white shadow-sm shadow-blue-500/30"
                              : colDay === 0
                                ? "text-red-400 dark:text-red-500"
                                : colDay === 6
                                  ? "text-blue-400 dark:text-blue-500"
                                  : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {day}
                        </span>
                      </div>

                      {/* +N overflow indicator */}
                      {hiddenCount > 0 && (
                        <div className="group/more absolute bottom-0.5 left-1/2 z-20 -translate-x-1/2">
                          <button className="rounded px-1.5 py-0.5 text-[9px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                            +{hiddenCount}
                          </button>
                          {/* Hover popup showing hidden items */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-48 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl group-hover/more:pointer-events-auto group-hover/more:block dark:border-gray-600 dark:bg-gray-800">
                            <div className="space-y-1">
                              {hidden!.todos.map((span) => {
                                const isCanvas = span.todo.source === "canvas";
                                return (
                                  <div
                                    key={span.todo.id}
                                    onClick={(e) => handleSpanClick(e, span.todo, span.colorKey)}
                                    className={`cursor-pointer truncate rounded px-1.5 py-1 text-[10px] font-medium ${getSpanColor(span.todo, span.colorKey)}`}
                                  >
                                    {isCanvas ? "📚 " : `${span.todo.workspace_name.charAt(0)} `}{span.todo.title}
                                  </div>
                                );
                              })}
                              {hidden!.ddays.map((ds) => {
                                const ddayColor = DDAY_COLOR_MAP[ds.dday.color] || DDAY_COLOR_MAP.blue;
                                return (
                                  <div
                                    key={ds.dday.id}
                                    className={`truncate rounded px-1.5 py-1 text-[10px] font-medium ${ddayColor.bg} ${ddayColor.text}`}
                                  >
                                    {ds.dday.emoji} {ds.dday.title}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unified span bar overlay (todos + D-day in same row system) */}
              {(visibleSpans.length > 0 || visibleDdaySpans.length > 0) && (
                <div
                  className="pointer-events-none absolute left-0 right-0"
                  style={{ top: "34px", height: `${spanAreaHeight}px` }}
                >
                  {/* Workspace todo spans */}
                  {visibleSpans.map((span) => {
                    const isCanvas = span.todo.source === "canvas";
                    const canDrag = !isCanvas && !!onUpdateTodo;
                    const titleText = isCanvas
                      ? `📚 ${span.todo.title}`
                      : `${span.todo.title} (${formatDurationShort(span.todo.duration_days || 24)})`;

                    return (
                      <div
                        key={`${span.todo.id}-${weekIdx}`}
                        className="pointer-events-auto absolute group/span"
                        style={{
                          top: `${span.row * 12}px`,
                          left: `calc(${(span.startCol / 7) * 100}% + 2px)`,
                          width: `calc(${(span.spanCols / 7) * 100}% - 4px)`,
                          height: "10px",
                        }}
                      >
                        <div
                          onClick={(e) => handleSpanClick(e, span.todo, span.colorKey)}
                          onMouseEnter={() => setHoveredTodo(span.todo.id)}
                          onMouseLeave={() => setHoveredTodo(null)}
                          draggable={canDrag}
                          onDragStart={canDrag ? (e) => handleDragStart(e, span.todo, "move") : undefined}
                          className={`h-full w-full truncate px-1 text-[7px] leading-none font-semibold transition-all z-10 cursor-pointer hover:shadow-sm flex items-center ${
                            span.isStart ? "rounded-l-lg" : ""
                          } ${span.isEnd ? "rounded-r-lg" : ""} ${getSpanColor(span.todo, span.colorKey)} ${
                            hoveredTodo === span.todo.id || popover?.todo.id === span.todo.id ? "ring-1 ring-gray-400/50 shadow-sm" : ""
                          }`}
                          title={titleText}
                        >
                          {span.isStart && (
                            <span className="flex items-center gap-0.5">
                              {isCanvas && <span className="flex-shrink-0 text-[8px]">📚</span>}
                              {!isCanvas && <span className="flex-shrink-0 opacity-60">{span.todo.workspace_name.charAt(0)}</span>}
                              <span className="truncate">{span.todo.title}</span>
                            </span>
                          )}
                        </div>
                        {/* Resize handle on right edge */}
                        {span.isEnd && canDrag && (
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, span.todo, "resize");
                            }}
                            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 hover:opacity-100 group-hover/span:opacity-60"
                            style={{ background: "rgba(0,0,0,0.15)", borderRadius: "0 4px 4px 0" }}
                            title="드래그하여 기간 조정"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* D-day spans (same row system, no overlap) */}
                  {visibleDdaySpans.map((ds) => {
                    const ddayColor = DDAY_COLOR_MAP[ds.dday.color] || DDAY_COLOR_MAP.blue;
                    return (
                      <div
                        key={`dday-${ds.dday.id}-${weekIdx}`}
                        className={`pointer-events-auto absolute flex items-center gap-0.5 truncate rounded-lg px-1 text-[7px] font-semibold leading-none z-10 ${ddayColor.bg} ${ddayColor.text}`}
                        style={{
                          top: `${ds.row * 12}px`,
                          left: `calc(${(ds.col / 7) * 100}% + 2px)`,
                          width: `calc(${(1 / 7) * 100}% - 4px)`,
                          height: "10px",
                        }}
                        title={`${ds.dday.emoji} ${ds.dday.title}`}
                      >
                        <span className="flex-shrink-0 text-[7px]">{ds.dday.emoji}</span>
                        <span className="truncate">{ds.dday.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Inline detail popover */}
        {popover && (() => {
          const t = popover.todo;
          const isCanvas = t.source === "canvas";
          const color = isCanvas ? CANVAS_COLOR : getWorkspaceColorByKey(popover.colorKey);
          const linkHref = isCanvas ? "/khu" : `/workspace/${t.workspace_id}`;

          const dueStart = parseLocalDate(t.due_date!);
          const durDays = getDurationInDays(t.duration_days);
          const dueEnd = new Date(dueStart);
          dueEnd.setDate(dueEnd.getDate() + durDays - 1);
          const now = nowKST();
          const isOverdue = !t.is_completed && dueEnd < now && toDateStr(dueEnd) !== toDateStr(now);

          const calW = calendarRef.current?.offsetWidth || 600;
          const popW = 280;
          const adjustedX = popover.x + popW > calW ? calW - popW - 12 : popover.x;

          return (
            <div
              ref={popoverRef}
              className="absolute z-50 w-[280px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800"
              style={{
                left: `${Math.max(8, adjustedX)}px`,
                top: `${popover.y + 8}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-semibold leading-tight ${
                    t.is_completed ? "text-gray-400 line-through dark:text-gray-500" : "text-gray-900 dark:text-white"
                  }`}>
                    {isCanvas && "📚 "}{t.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t.workspace_name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPopover(null)}
                  className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {fmtMD(t.due_date!)}
                    {durDays > 1 && ` ~ ${fmtMD(toDateStr(dueEnd))}`}
                    {!isCanvas && ` (${formatDurationShort(t.duration_days || 24)})`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {t.is_completed ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      완료
                    </span>
                  ) : isOverdue ? (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      지연됨
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      진행 중
                    </span>
                  )}
                </div>

                {!isCanvas && t.description && t.description !== SECTION_HEADER_MARKER && (
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {t.description}
                  </p>
                )}

                {/* Subtask mini gantt chart */}
                {!isCanvas && (() => {
                  const subs = todos.filter((s) => s.parent_id === t.id && !s.is_completed);
                  if (subs.length === 0) return null;
                  const parentStart = t.due_date ? parseLocalDate(t.due_date) : null;
                  const parentDays = getDurationInDays(t.duration_days);
                  const MAX_SHOW = 5;
                  const visibleSubs = subs.slice(0, MAX_SHOW);
                  const hiddenCount = subs.length - MAX_SHOW;

                  return (
                    <div className="rounded-lg border border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-700/30">
                      <div className="flex items-center justify-between px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                          남은 하위작업
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {subs.length}개
                        </span>
                      </div>
                      <div className="space-y-1 px-1.5 pb-2">
                        {visibleSubs.map((sub) => {
                          let leftPct = 0;
                          let widthPct = 100;
                          let hasDate = false;

                          if (parentStart && sub.due_date) {
                            hasDate = true;
                            const subStart = parseLocalDate(sub.due_date);
                            const subDays = getDurationInDays(sub.duration_days);
                            const daysDiff = Math.round((subStart.getTime() - parentStart.getTime()) / (1000 * 60 * 60 * 24));
                            leftPct = Math.max(0, Math.min(100, (daysDiff / parentDays) * 100));
                            widthPct = Math.max(5, Math.min(100 - leftPct, (subDays / parentDays) * 100));
                          }

                          return (
                            <div key={sub.id} className="rounded px-1 py-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border border-gray-300 dark:border-gray-500" />
                                <span className="truncate text-[10px] leading-tight text-gray-700 dark:text-gray-300">
                                  {sub.title}
                                </span>
                                {hasDate ? (
                                  <span className="ml-auto flex-shrink-0 text-[9px] tabular-nums text-gray-400 dark:text-gray-500">
                                    {fmtMD(sub.due_date!)}
                                  </span>
                                ) : (
                                  <span className="ml-auto flex-shrink-0 text-[9px] italic text-gray-300 dark:text-gray-600">
                                    날짜 미설정
                                  </span>
                                )}
                              </div>
                              {hasDate && (
                                <div className="ml-5 mt-0.5 relative h-[5px] rounded-full bg-gray-200 dark:bg-gray-600">
                                  <div
                                    className="absolute top-0 h-full rounded-full bg-blue-400 dark:bg-blue-500"
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <div className="px-1 pt-0.5 text-center text-[9px] text-gray-400 dark:text-gray-500">
                            +{hiddenCount}개 더
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Link
                href={linkHref}
                onClick={() => setPopover(null)}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${color.bg} ${color.text} hover:opacity-80`}
              >
                {isCanvas ? "📚 LearningX에서 보기" : "워크스페이스로 이동"}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          );
        })()}
      </div>

      {/* Empty state */}
      {realTodos.length === 0 && workspaces.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-12 dark:border-gray-700">
          <div className="mb-2 text-3xl opacity-50">📅</div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            할 일이 없습니다
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            워크스페이스에서 할 일을 추가해보세요
          </p>
        </div>
      )}
    </div>
  );
}
