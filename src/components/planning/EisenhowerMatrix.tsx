"use client";

import { useMemo } from "react";
import type { Todo } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { fmtDateKST } from "@/lib/date";

type EisenhowerMatrixProps = {
  todos: Todo[];
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "is_completed" | "priority">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type QuadrantConfig = {
  priority: number;
  label: string;
  subtitle: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  checkColor: string;
  countBg: string;
  countText: string;
};

const QUADRANTS: QuadrantConfig[] = [
  {
    priority: 1,
    label: "🔥 긴급 & 중요",
    subtitle: "즉시 실행",
    headerBg: "bg-red-50 dark:bg-red-900/20",
    headerText: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800/50",
    checkColor: "border-red-400 hover:border-red-500",
    countBg: "bg-red-100 dark:bg-red-900/30",
    countText: "text-red-600 dark:text-red-400",
  },
  {
    priority: 2,
    label: "📅 중요 & 비긴급",
    subtitle: "계획 수립",
    headerBg: "bg-orange-50 dark:bg-orange-900/20",
    headerText: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800/50",
    checkColor: "border-orange-400 hover:border-orange-500",
    countBg: "bg-orange-100 dark:bg-orange-900/30",
    countText: "text-orange-600 dark:text-orange-400",
  },
  {
    priority: 3,
    label: "⚡ 긴급 & 비중요",
    subtitle: "위임 가능",
    headerBg: "bg-blue-50 dark:bg-blue-900/20",
    headerText: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800/50",
    checkColor: "border-blue-400 hover:border-blue-500",
    countBg: "bg-blue-100 dark:bg-blue-900/30",
    countText: "text-blue-600 dark:text-blue-400",
  },
  {
    priority: 4,
    label: "📦 비긴급 & 비중요",
    subtitle: "나중에 처리",
    headerBg: "bg-gray-50 dark:bg-gray-800/50",
    headerText: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
    checkColor: "border-gray-400 hover:border-gray-500",
    countBg: "bg-gray-100 dark:bg-gray-700",
    countText: "text-gray-600 dark:text-gray-400",
  },
];

export default function EisenhowerMatrix({ todos, onUpdate }: EisenhowerMatrixProps) {
  // Filter out section headers and subtasks
  const realTodos = useMemo(
    () => todos.filter((t) => t.description !== SECTION_HEADER_MARKER && !t.parent_id),
    [todos]
  );

  // Group todos by priority quadrant
  const grouped = useMemo(() => {
    const map: Record<number, Todo[]> = { 1: [], 2: [], 3: [], 4: [] };
    const uncategorized: Todo[] = [];

    for (const todo of realTodos) {
      if (todo.priority && map[todo.priority]) {
        map[todo.priority].push(todo);
      } else {
        uncategorized.push(todo);
      }
    }

    return { map, uncategorized };
  }, [realTodos]);

  return (
    <div className="space-y-6">
      {/* 2x2 Matrix Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => {
          const items = grouped.map[q.priority];
          return (
            <div
              key={q.priority}
              className={`flex flex-col overflow-hidden rounded-2xl border ${q.borderColor} bg-white shadow-sm dark:bg-gray-800`}
            >
              {/* Quadrant header */}
              <div className={`flex items-center justify-between px-4 py-3 ${q.headerBg}`}>
                <div>
                  <h3 className={`text-[13px] font-semibold ${q.headerText}`}>
                    {q.label}
                  </h3>
                  <p className={`text-[11px] ${q.headerText} opacity-70`}>
                    {q.subtitle}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${q.countBg} ${q.countText}`}>
                  {items.length}
                </span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: "260px" }}>
                {items.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-[12px] text-gray-400 dark:text-gray-500">
                    할 일이 없습니다
                  </div>
                ) : (
                  <div className="space-y-1">
                    {items.map((todo) => (
                      <MatrixTodoItem
                        key={todo.id}
                        todo={todo}
                        checkColor={q.checkColor}
                        onToggle={() => onUpdate(todo.id, { is_completed: !todo.is_completed })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Uncategorized section */}
      {grouped.uncategorized.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
            <div>
              <h3 className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">
                📋 미분류
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-500">
                우선순위를 설정해주세요
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {grouped.uncategorized.length}
            </span>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-2">
            <div className="space-y-1">
              {grouped.uncategorized.map((todo) => (
                <MatrixTodoItem
                  key={todo.id}
                  todo={todo}
                  checkColor="border-gray-400 hover:border-gray-500"
                  onToggle={() => onUpdate(todo.id, { is_completed: !todo.is_completed })}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Individual todo item inside a matrix quadrant */
function MatrixTodoItem({
  todo,
  checkColor,
  onToggle,
}: {
  todo: Todo;
  checkColor: string;
  onToggle: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
        todo.is_completed ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          todo.is_completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : checkColor
        }`}
      >
        {todo.is_completed && (
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title + date */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-medium ${
            todo.is_completed
              ? "text-gray-400 line-through dark:text-gray-500"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {todo.title}
        </p>
        {todo.due_date && (
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
            {fmtDateKST(todo.due_date)}
          </p>
        )}
      </div>
    </div>
  );
}
