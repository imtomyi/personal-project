"use client";

import { useMemo, useState } from "react";
import type { Todo, RecurringTask } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import {
  generateSchedule,
  autoAssignTodos,
  minutesToTime,
  type ScheduleBlock,
} from "@/lib/autoScheduler";
import { todayKST } from "@/lib/date";

type DailyScheduleProps = {
  todos: Todo[];
  recurringTasks: RecurringTask[];
  onUpdate: (
    id: string,
    updates: Partial<Pick<Todo, "is_completed" | "status">>
  ) => Promise<void>;
};

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function getBlockStyle(block: ScheduleBlock) {
  const topPx = ((block.startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const heightPx = ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT;
  return { top: `${topPx}px`, height: `${Math.max(heightPx, 24)}px` };
}

export default function DailySchedule({ todos, recurringTasks, onUpdate }: DailyScheduleProps) {
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);

  const today = todayKST();
  const dayOfWeek = new Date().getDay();

  // Get current time position
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTopPx = ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  // Generate schedule blocks
  const baseBlocks = useMemo(
    () => generateSchedule(recurringTasks, todos, dayOfWeek),
    [recurringTasks, todos, dayOfWeek]
  );

  const blocks = useMemo(() => {
    if (showAutoSchedule) {
      return autoAssignTodos(baseBlocks, todos);
    }
    return baseBlocks;
  }, [baseBlocks, todos, showAutoSchedule]);

  // Unscheduled todos
  const scheduledTodoIds = new Set(
    blocks.filter((b) => b.todoId).map((b) => b.todoId)
  );
  const unscheduledTodos = todos.filter(
    (t) =>
      !t.is_completed &&
      t.description !== SECTION_HEADER_MARKER &&
      !t.parent_id &&
      !scheduledTodoIds.has(t.id)
  );

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground dark:text-white">
            <span>📅</span>
            오늘의 시간표
          </h3>
          <button
            onClick={() => setShowAutoSchedule(!showAutoSchedule)}
            className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors ${
              showAutoSchedule
                ? "bg-[#007AFF] text-white"
                : "bg-black/[0.05] text-secondary hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
            }`}
          >
            {showAutoSchedule ? "✨ 자동 배분 적용됨" : "✨ 자동 배분"}
          </button>
        </div>

        <div className="card-surface relative overflow-hidden p-0">
          <div
            className="relative"
            style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
          >
            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 flex items-start border-t border-black/[0.04] dark:border-white/[0.06]"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              >
                <span className="w-12 flex-shrink-0 pr-2 pt-0.5 text-right text-[10px] text-secondary">
                  {String(START_HOUR + i).padStart(2, "0")}:00
                </span>
                <div className="flex-1" />
              </div>
            ))}

            {/* Current time line */}
            {currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60 && (
              <div
                className="absolute left-12 right-0 z-20 flex items-center"
                style={{ top: `${currentTopPx}px` }}
              >
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="h-[1.5px] flex-1 bg-red-500" />
              </div>
            )}

            {/* Schedule blocks */}
            {blocks.map((block) => {
              const style = getBlockStyle(block);
              const isRecurring = block.type === "recurring";

              return (
                <div
                  key={block.id}
                  className={`absolute left-14 right-2 z-10 flex items-start overflow-hidden rounded-lg border px-2 py-1 ${
                    isRecurring
                      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                      : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                  }`}
                  style={style}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[11px] font-medium ${
                        isRecurring
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isRecurring && "🔁 "}
                      {block.title}
                    </p>
                    <p className="text-[9px] text-secondary">
                      {minutesToTime(block.startMin)} - {minutesToTime(block.endMin)}
                    </p>
                  </div>
                  {block.todoId && (
                    <button
                      onClick={() =>
                        onUpdate(block.todoId!, {
                          is_completed: true,
                          status: "done",
                        })
                      }
                      className="mt-0.5 flex-shrink-0 rounded p-0.5 text-secondary hover:text-emerald-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar: Unscheduled todos */}
      {unscheduledTodos.length > 0 && !showAutoSchedule && (
        <div className="hidden w-56 lg:block">
          <h4 className="mb-3 text-[12px] font-semibold text-secondary">
            미배정 할일 ({unscheduledTodos.length})
          </h4>
          <div className="space-y-1.5">
            {unscheduledTodos.slice(0, 10).map((todo) => (
              <div
                key={todo.id}
                className="rounded-lg border border-black/[0.06] bg-white p-2 dark:border-white/[0.08] dark:bg-[#1c1c1e]"
              >
                <p className="truncate text-[11px] font-medium text-foreground dark:text-[#e5e5e7]">
                  {todo.title}
                </p>
                {todo.due_date && (
                  <p className="mt-0.5 text-[9px] text-secondary">
                    {todo.due_date.slice(5).replace("-", "/")}
                  </p>
                )}
              </div>
            ))}
            {unscheduledTodos.length > 10 && (
              <p className="text-center text-[10px] text-secondary">
                +{unscheduledTodos.length - 10}개 더
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
