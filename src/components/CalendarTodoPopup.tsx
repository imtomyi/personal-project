"use client";

import { useState, useRef, useEffect } from "react";
import type { Todo } from "@/lib/types";
import DurationPicker from "./DurationPicker";
import DatePicker from "./DatePicker";
import { fmtDateKST, toDateStr, parseLocalDate, nowKST, getDurationInDays, todayKST } from "@/lib/date";

type CalendarTodoPopupProps = {
  todo: Todo;
  subtasks?: Todo[];
  anchorRect: { top: number; left: number; width: number };
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "is_completed" | "due_date" | "duration_days">>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function CalendarTodoPopup({
  todo,
  subtasks = [],
  anchorRect,
  onUpdate,
  onDelete,
  onClose,
}: CalendarTodoPopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // Calculate position: try below the anchor, flip up if needed
  const popupStyle: React.CSSProperties = {
    position: "fixed",
    top: anchorRect.top + 24,
    left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 300)),
    zIndex: 100,
  };

  function handleTitleSave() {
    if (title.trim() && title.trim() !== todo.title) {
      onUpdate(todo.id, { title: title.trim() });
    }
    setEditingTitle(false);
  }

  const dueDate = todo.due_date ? parseLocalDate(todo.due_date) : null;
  const isOverdue = dueDate && !todo.is_completed && dueDate < nowKST() && toDateStr(dueDate) !== toDateStr(nowKST());

  return (
    <div ref={ref} style={popupStyle} className="w-72 rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-800">
      {/* Header with completion toggle */}
      <div className="flex items-start gap-2.5 border-b border-gray-100 p-3 dark:border-gray-700">
        <button
          onClick={() => onUpdate(todo.id, { is_completed: !todo.is_completed })}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            todo.is_completed
              ? "border-green-500 bg-green-500 text-white"
              : "border-gray-300 hover:border-blue-400 dark:border-gray-600"
          }`}
        >
          {todo.is_completed && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") { setTitle(todo.title); setEditingTitle(false); }
              }}
              className="w-full rounded border border-blue-300 bg-transparent px-1 py-0.5 text-sm font-medium outline-none dark:text-white"
              autoFocus
            />
          ) : (
            <p
              onClick={() => setEditingTitle(true)}
              className={`cursor-pointer truncate text-sm font-medium hover:text-blue-500 ${
                todo.is_completed
                  ? "text-gray-400 line-through dark:text-gray-500"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {todo.title}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2.5 p-3">
        {/* Due date */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">날짜</span>
          <DatePicker
            value={todo.due_date ? toDateStr(parseLocalDate(todo.due_date)) : todayKST()}
            onChange={(date) => onUpdate(todo.id, { due_date: date })}
            compact
          />
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">기간</span>
          <DurationPicker
            value={todo.duration_days || 24}
            dueDate={todo.due_date}
            onChange={(hours) => onUpdate(todo.id, { duration_days: hours })}
            compact
          />
        </div>

        {/* Date range display */}
        {todo.due_date && (
          <div className={`rounded-lg px-2.5 py-1.5 text-[11px] ${
            isOverdue
              ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              : "bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400"
          }`}>
            {fmtDateKST(todo.due_date)}
            {(todo.duration_days || 24) > 24 && (() => {
              const durationInDays = getDurationInDays(todo.duration_days);
              const end = new Date(parseLocalDate(todo.due_date));
              end.setDate(end.getDate() + durationInDays - 1);
              return ` → ${fmtDateKST(toDateStr(end))}`;
            })()}
          </div>
        )}

        {/* Subtask mini gantt chart */}
        {subtasks.length > 0 && (() => {
          const incompleteSubs = subtasks.filter((s) => !s.is_completed);
          if (incompleteSubs.length === 0) return null;
          const parentStart = todo.due_date ? parseLocalDate(todo.due_date) : null;
          const parentDays = getDurationInDays(todo.duration_days);
          const MAX_SHOW = 5;
          const visibleSubs = incompleteSubs.slice(0, MAX_SHOW);
          const hiddenCount = incompleteSubs.length - MAX_SHOW;

          return (
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-700/30">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  남은 하위작업
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {incompleteSubs.length}개
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
                    <div key={sub.id} className="group/sub rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-600/40">
                      {/* Row 1: checkbox + title */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdate(sub.id, { is_completed: !sub.is_completed })}
                          className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border border-gray-300 transition-colors hover:border-blue-400 dark:border-gray-500"
                        />
                        <span className="truncate text-[10px] leading-tight text-gray-700 dark:text-gray-300">
                          {sub.title}
                        </span>
                        {hasDate ? (
                          <span className="ml-auto flex-shrink-0 text-[9px] tabular-nums text-gray-400 dark:text-gray-500">
                            {fmtDateKST(sub.due_date!)}
                          </span>
                        ) : (
                          <span className="ml-auto flex-shrink-0 text-[9px] italic text-gray-300 dark:text-gray-600">
                            날짜 미설정
                          </span>
                        )}
                      </div>
                      {/* Row 2: gantt bar (only when date is set) */}
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

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-700">
        <button
          onClick={() => { onDelete(todo.id); onClose(); }}
          className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          삭제
        </button>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
