"use client";

import { useMemo } from "react";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useAssignments } from "@/hooks/useAssignments";
import { useCanvasCalendar } from "@/hooks/useCanvasCalendar";
import { useHabits } from "@/hooks/useHabits";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import {
  generateSchedule,
  autoAssignTodos,
  autoAssignDailyPlans,
  type ScheduleBlock,
} from "@/lib/autoScheduler";
import { todayKST, nowKST, parseLocalDate, minutesToTime } from "@/lib/date";

const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 28; // compact

type BlockColor = { border: string; bg: string; text: string };

function getBlockColor(block: ScheduleBlock): BlockColor {
  switch (block.type) {
    case "recurring":
      return {
        border: "border-blue-200 dark:border-blue-800",
        bg: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-300",
      };
    case "class":
      return {
        border: "border-indigo-200 dark:border-indigo-800",
        bg: "bg-indigo-50 dark:bg-indigo-900/20",
        text: "text-indigo-700 dark:text-indigo-300",
      };
    case "study":
      if (block.color === "rose") {
        return {
          border: "border-rose-200 dark:border-rose-800",
          bg: "bg-rose-50 dark:bg-rose-900/20",
          text: "text-rose-700 dark:text-rose-300",
        };
      }
      return {
        border: "border-amber-200 dark:border-amber-800",
        bg: "bg-amber-50 dark:bg-amber-900/20",
        text: "text-amber-700 dark:text-amber-300",
      };
    case "habit":
      return {
        border: "border-violet-200 dark:border-violet-800",
        bg: "bg-violet-50 dark:bg-violet-900/20",
        text: "text-violet-700 dark:text-violet-300",
      };
    case "todo":
      return {
        border: "border-emerald-200 dark:border-emerald-800",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        text: "text-emerald-700 dark:text-emerald-300",
      };
    default:
      return {
        border: "border-gray-200 dark:border-gray-700",
        bg: "bg-gray-50 dark:bg-gray-800/20",
        text: "text-gray-500 dark:text-gray-400",
      };
  }
}

export default function DailyScheduleWidget() {
  const { tasks: recurringTasks, loading: rtLoading } = useRecurringTasks();
  const { assignments } = useAssignments();
  const { classEvents, canvasCourses, isConnected } = useCanvasCalendar();
  const { habitsWithTime } = useHabits();
  const { activePlans, loading: plansLoading } = useDailyPlan();

  const today = todayKST();
  const dayOfWeek = parseLocalDate(today).getDay();

  // Course name mapping
  const courseNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of canvasCourses) {
      map.set(`course_${c.id}`, c.name);
    }
    return map;
  }, [canvasCourses]);

  // Current time (KST)
  const now = nowKST();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTopPx = ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  // Generate blocks: prefer daily plans if available, fallback to legacy auto-assign
  const blocks = useMemo(() => {
    const base = generateSchedule(recurringTasks, [], dayOfWeek, {
      classEvents,
      dateStr: today,
      courseNames,
      habits: habitsWithTime,
    });

    if (activePlans.length > 0) {
      const { blocks: planBlocks } = autoAssignDailyPlans(base, activePlans, []);
      return planBlocks;
    }

    return autoAssignTodos(base, [], assignments, today);
  }, [recurringTasks, dayOfWeek, classEvents, today, courseNames, assignments, habitsWithTime, activePlans]);

  // Summary stats
  const stats = useMemo(() => {
    const classCount = blocks.filter((b) => b.type === "class").length;
    const studyCount = blocks.filter((b) => b.type === "study").length;
    const studyMinutes = blocks
      .filter((b) => b.type === "study")
      .reduce((sum, b) => sum + (b.endMin - b.startMin), 0);
    const recurringCount = blocks.filter((b) => b.type === "recurring").length;
    const habitCount = blocks.filter((b) => b.type === "habit").length;
    return { classCount, studyCount, studyMinutes, recurringCount, habitCount };
  }, [blocks]);

  if (rtLoading) {
    return (
      <div className="card-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-foreground dark:text-white">
          <span>📅</span> 오늘 시간표
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-foreground dark:text-white">
        <span>📅</span> 오늘 시간표
      </h2>

      {/* Summary stats */}
      <div className="mb-3 flex flex-wrap gap-2">
        {stats.classCount > 0 && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            🏫 수업 {stats.classCount}
          </span>
        )}
        {stats.studyCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            📖 공부 {Math.round(stats.studyMinutes / 60 * 10) / 10}h
          </span>
        )}
        {stats.recurringCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            🔁 반복 {stats.recurringCount}
          </span>
        )}
        {stats.habitCount > 0 && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            루틴 {stats.habitCount}
          </span>
        )}
        {!isConnected && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-secondary dark:bg-white/[0.06]">
            Canvas 미연결
          </span>
        )}
      </div>

      {/* Compact timeline */}
      <div className="relative overflow-hidden rounded-lg">
        <div
          className="relative"
          style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
        >
          {/* Hour lines — show every 2 hours for compact */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
            if (i % 2 !== 0 && i !== TOTAL_HOURS) return null;
            return (
              <div
                key={i}
                className="absolute left-0 right-0 flex items-start border-t border-black/[0.04] dark:border-white/[0.06]"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              >
                <span className="w-7 flex-shrink-0 pr-1 pt-px text-right text-[7px] text-secondary">
                  {String(START_HOUR + i).padStart(2, "0")}
                </span>
              </div>
            );
          })}

          {/* Current time line */}
          {currentMinutes >= START_HOUR * 60 &&
            currentMinutes <= END_HOUR * 60 && (
              <div
                className="absolute left-7 right-0 z-20 flex items-center"
                style={{ top: `${currentTopPx}px` }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <div className="h-[1px] flex-1 bg-red-500" />
              </div>
            )}

          {/* Blocks */}
          {blocks.map((block) => {
            const topPx =
              ((block.startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
            const heightPx =
              ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT;
            const color = getBlockColor(block);

            return (
              <div
                key={block.id}
                className={`absolute left-8 right-0.5 z-10 overflow-hidden rounded border px-1 py-px ${color.border} ${color.bg}`}
                style={{
                  top: `${topPx}px`,
                  height: `${Math.max(heightPx, 14)}px`,
                }}
              >
                <p
                  className={`truncate text-[8px] font-medium leading-tight ${color.text}`}
                >
                  {block.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-[12px] text-secondary">
            {isConnected
              ? "오늘 일정이 없습니다"
              : "경희대 탭에서 Canvas를 연동하면 수업/과제가 자동으로 표시됩니다"}
          </p>
        </div>
      )}
    </div>
  );
}
