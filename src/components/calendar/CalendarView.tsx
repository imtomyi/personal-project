"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { Todo } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { parseLocalDate, nowKST, todayKST, toDateStr, getDurationInDays, formatDuration } from "@/lib/date";
import { WEEKDAY_LABELS } from "@/lib/constants";
import CalendarTodoPopup from "@/components/todo/CalendarTodoPopup";

type CalendarViewProps = {
  todos: Todo[];
  onTodoClick: (todo: Todo) => void;
  onUpdateTodo: (id: string, updates: Partial<Pick<Todo, "title" | "is_completed" | "due_date" | "duration_days">>) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo?: (title: string, dueDate: string) => void;
};

type SpanEntry = {
  todo: Todo;
  startCol: number;
  spanCols: number;
  isStart: boolean;
  isEnd: boolean;
  row: number;
};

type PopupState = {
  todo: Todo;
  rect: { top: number; left: number; width: number };
} | null;

export default function CalendarView({ todos, onTodoClick, onUpdateTodo, onDeleteTodo, onAddTodo }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => nowKST());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupState>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string } | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString("ko-KR", {
    month: "long",
    year: "numeric",
  });

  const realTodos = useMemo(
    () => todos.filter((t) => t.description !== SECTION_HEADER_MARKER && t.due_date && !t.parent_id),
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

  const weekSpans = useMemo(() => {
    return weeks.map((week) => {
      const spans: SpanEntry[] = [];
      const weekStart = week.find((d) => d !== null);
      const weekEnd = [...week].reverse().find((d) => d !== null);
      if (!weekStart || !weekEnd) return spans;

      const weekStartDate = parseLocalDate(weekStart);
      const weekEndDate = parseLocalDate(weekEnd);

      for (const todo of realTodos) {
        // due_date = 시작일, duration만큼 앞으로 표시
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
        });
      }

      spans.sort((a, b) => a.startCol - b.startCol || b.spanCols - a.spanCols);
      const rowOccupied: number[][] = [];

      const MAX_ROWS = 30;
      for (const span of spans) {
        let assignedRow = 0;
        while (assignedRow < MAX_ROWS) {
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
  }, [weeks, realTodos]);

  // 모든 할 일을 span으로 표시하므로 별도의 single 분류 불필요

  // Count all todos per date (for the dot indicator)
  const todoCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    realTodos.forEach((todo) => {
      if (!todo.due_date) return;
      const start = parseLocalDate(todo.due_date);
      const durDays = getDurationInDays(todo.duration_days);
      for (let i = 0; i < durDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = toDateStr(d);
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [realTodos]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setCurrentDate(nowKST());
  }

  function handleDragStart(e: React.DragEvent, todo: Todo, mode: "move" | "resize" = "move") {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: todo.id, duration_days: todo.duration_days, due_date: todo.due_date, mode }));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    setDragOver(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (!data.id) return;

      if (data.mode === "resize" && data.due_date) {
        // Resize: calculate new duration based on drop date
        const start = parseLocalDate(data.due_date);
        const end = parseLocalDate(dateStr);
        const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        onUpdateTodo(data.id, { duration_days: diffDays * 24 });
      } else {
        // Move: change start date
        onUpdateTodo(data.id, { due_date: dateStr });
      }
    } catch {
      // ignore
    }
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(dateStr);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  const handleTodoPopup = useCallback((todo: Todo, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopup({ todo, rect: { top: rect.top, left: rect.left, width: rect.width } });
  }, []);

  function handleCellClick(dateStr: string, e: React.MouseEvent) {
    // Only trigger quick-add if clicking on empty area (not on a todo)
    if ((e.target as HTMLElement).closest("[data-todo]")) return;
    setPopup(null);
    setQuickAdd({ date: dateStr });
    setQuickAddTitle("");
    // Focus the input after render
    setTimeout(() => quickAddRef.current?.focus(), 0);
  }

  function handleQuickAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAdd || !onAddTodo) return;
    onAddTodo(quickAddTitle.trim(), quickAdd.date);
    setQuickAdd(null);
    setQuickAddTitle("");
  }

  function handleQuickAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setQuickAdd(null);
      setQuickAddTitle("");
    }
  }

  const todayStr = todayKST();
  const days = WEEKDAY_LABELS;

  function getSpanClasses(todo: Todo, isStart: boolean, isEnd: boolean) {
    const base = "absolute text-[7px] leading-none truncate px-1 cursor-pointer transition-all z-10 font-semibold flex items-center";
    const rounded = `${isStart ? "rounded-l-lg" : ""} ${isEnd ? "rounded-r-lg" : ""}`;

    if (todo.is_completed) {
      return `${base} ${rounded} bg-emerald-100 text-emerald-700 line-through dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 hover:shadow-sm`;
    }

    const dueEnd = new Date(parseLocalDate(todo.due_date!));
    dueEnd.setDate(dueEnd.getDate() + getDurationInDays(todo.duration_days) - 1);

    if (dueEnd < nowKST() && toDateStr(dueEnd) !== toDateStr(nowKST())) {
      return `${base} ${rounded} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 hover:shadow-sm`;
    }

    if (toDateStr(parseLocalDate(todo.due_date!)) === todayStr) {
      return `${base} ${rounded} bg-blue-200 text-blue-800 dark:bg-blue-800/50 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-800/70 hover:shadow-sm`;
    }

    return `${base} ${rounded} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:shadow-sm`;
  }

  return (
    <div className="flex min-h-[calc(100vh-220px)] flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {monthName}
          </h3>
          <div className="flex items-center gap-0.5">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <button
          onClick={goToday}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          오늘
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {days.map((day, i) => (
          <div
            key={day}
            className={`py-2.5 text-center text-xs font-semibold ${
              i === 0
                ? "text-red-400 dark:text-red-500"
                : i === 6
                  ? "text-blue-400 dark:text-blue-500"
                  : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-1 flex-col">
      {weeks.map((week, weekIdx) => {
        const spans = weekSpans[weekIdx];
        const MAX_VISIBLE_ROWS = 6;
        const visibleSpans = spans.filter((s) => s.row < MAX_VISIBLE_ROWS);
        const hiddenSpans = spans.filter((s) => s.row >= MAX_VISIBLE_ROWS);
        const spanAreaHeight = MAX_VISIBLE_ROWS * 12 + 2;

        // Count hidden items per column
        const hiddenByCol: Record<number, SpanEntry[]> = {};
        for (const span of hiddenSpans) {
          for (let c = span.startCol; c < span.startCol + span.spanCols; c++) {
            if (!hiddenByCol[c]) hiddenByCol[c] = [];
            hiddenByCol[c].push(span);
          }
        }

        return (
          <div key={weekIdx} className="relative flex-1">
            {/* Day cells */}
            <div className="grid h-full grid-cols-7">
              {week.map((dateStr, colIdx) => {
                if (!dateStr) {
                  return (
                    <div
                      key={`empty-${weekIdx}-${colIdx}`}
                      className="border-b border-r border-gray-100 dark:border-gray-700/50"
                      style={{ minHeight: `${40 + spanAreaHeight}px` }}
                    />
                  );
                }

                const day = parseInt(dateStr.split("-")[2]);
                const isToday = dateStr === todayStr;
                const isDragTarget = dragOver === dateStr;
                const isQuickAdding = quickAdd?.date === dateStr;
                const totalCount = todoCountByDate[dateStr] || 0;
                const colDay = colIdx; // 0=Sun, 6=Sat
                const hiddenItems = hiddenByCol[colIdx];
                const hiddenCount = hiddenItems ? hiddenItems.length : 0;

                return (
                  <div
                    key={dateStr}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    onClick={(e) => handleCellClick(dateStr, e)}
                    className={`group/cell relative cursor-pointer border-b border-r border-gray-100 transition-colors dark:border-gray-700/50 ${
                      isToday ? "bg-blue-50/60 dark:bg-blue-900/15" : "hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                    } ${isDragTarget ? "bg-blue-100/70 dark:bg-blue-900/30 ring-2 ring-inset ring-blue-300 dark:ring-blue-600" : ""}`}
                    style={{ minHeight: `${40 + spanAreaHeight}px` }}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between p-1.5">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
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
                      {/* Todo count badge */}
                      {totalCount > 0 && !isToday && (
                        <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">
                          {totalCount}
                        </span>
                      )}
                      {/* Add button on hover */}
                      {onAddTodo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCellClick(dateStr, e); }}
                          className="hidden rounded p-0.5 text-gray-300 hover:bg-blue-50 hover:text-blue-400 group-hover/cell:inline-flex dark:text-gray-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* +N overflow indicator */}
                    {hiddenCount > 0 && (
                      <div className="group/more absolute bottom-0.5 left-1/2 z-20 -translate-x-1/2" data-todo="true">
                        <button className="rounded px-1.5 py-0.5 text-[9px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                          +{hiddenCount}
                        </button>
                        {/* Hover popup showing hidden items */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden w-48 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl group-hover/more:pointer-events-auto group-hover/more:block dark:border-gray-600 dark:bg-gray-800">
                          <div className="space-y-1">
                            {hiddenItems!.map((span) => (
                              <div
                                key={span.todo.id}
                                data-todo="true"
                                onClick={(e) => handleTodoPopup(span.todo, e)}
                                className={`cursor-pointer truncate rounded px-1.5 py-1 text-[10px] font-medium ${
                                  span.todo.is_completed
                                    ? "bg-emerald-100 text-emerald-700 line-through dark:bg-emerald-900/40 dark:text-emerald-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                }`}
                              >
                                {span.todo.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick add input */}
                    {isQuickAdding && onAddTodo && (
                      <div className="absolute bottom-1 left-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleQuickAddSubmit}>
                          <input
                            ref={quickAddRef}
                            type="text"
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            onKeyDown={handleQuickAddKeyDown}
                            onBlur={() => { if (!quickAddTitle.trim()) setQuickAdd(null); }}
                            placeholder="새 할 일..."
                            className="w-full rounded-md border border-blue-300 bg-white px-1.5 py-0.5 text-[11px] outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-blue-400 dark:border-blue-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
                            autoFocus
                          />
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Span bars overlay — positioned at row level so percentages are relative to full row width */}
            {visibleSpans.length > 0 && (
              <div
                className="pointer-events-none absolute left-0 right-0"
                style={{ top: "38px", height: `${spanAreaHeight}px` }}
              >
                {visibleSpans.map((span) => (
                  <div
                    key={`${span.todo.id}-${weekIdx}`}
                    data-todo="true"
                    className="pointer-events-auto absolute group/span"
                    style={{
                      top: `${span.row * 12}px`,
                      left: `calc(${(span.startCol / 7) * 100}% + 2px)`,
                      width: `calc(${(span.spanCols / 7) * 100}% - 4px)`,
                      height: "10px",
                    }}
                  >
                    <button
                      onClick={(e) => handleTodoPopup(span.todo, e)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, span.todo, "move")}
                      className={`w-full h-full ${getSpanClasses(span.todo, span.isStart, span.isEnd)}`}
                      style={{ position: "static" }}
                      title={`${span.todo.title} (${formatDuration(span.todo.duration_days || 24)})`}
                    >
                      {span.isStart && (
                        <span className="flex items-center gap-1">
                          <span className="truncate">{span.todo.title}</span>
                          {span.spanCols >= 2 && (
                            <span className="flex-shrink-0 opacity-60 text-[9px]">
                              {formatDuration(span.todo.duration_days || 24)}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                    {/* Resize handle on right edge */}
                    {span.isEnd && (
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
                ))}
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* Todo popup */}
      {popup && (
        <CalendarTodoPopup
          todo={popup.todo}
          subtasks={todos.filter((t) => t.parent_id === popup.todo.id)}
          anchorRect={popup.rect}
          onUpdate={(id, updates) => {
            onUpdateTodo(id, updates);
            // Update the popup's todo reference
            setPopup((prev) => prev ? { ...prev, todo: { ...prev.todo, ...updates } } : null);
          }}
          onDelete={(id) => {
            onDeleteTodo(id);
            setPopup(null);
          }}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
