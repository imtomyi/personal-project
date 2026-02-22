"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { Todo, RecurringTask, Assignment, CanvasCalendarEvent, Habit, DailyPlan, DdayEntry } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import {
  generateSchedule,
  autoAssignTodos,
  autoAssignDailyPlans,
  placeDdayBlocks,
  minutesToTime,
  type ScheduleBlock,
  type ScheduleBlockType,
} from "@/lib/autoScheduler";
import { todayKST, nowKST, parseLocalDate } from "@/lib/date";

type DailyScheduleProps = {
  todos: Todo[];
  recurringTasks: RecurringTask[];
  onUpdate: (
    id: string,
    updates: Partial<Pick<Todo, "is_completed" | "status">>
  ) => Promise<void>;
  assignments?: Assignment[];
  classEvents?: CanvasCalendarEvent[];
  courseNames?: Map<string, string>;
  habits?: Habit[];
  compact?: boolean;
  // 일일 계획
  dailyPlans?: DailyPlan[];
  onOpenTriage?: () => void;
  onScheduleUpdate?: (planId: string, startMin: number, endMin: number) => Promise<void>;
  onAutoDistributeTodayTasks?: (todos: Todo[]) => Promise<void>;
  onRefreshSchedule?: () => Promise<void>;
  workspaceMap?: Map<string, { name: string; color: string }>;
  ddayEntries?: DdayEntry[];
  onDeleteRecurringTask?: (id: string) => void;
  onOpenRoutineManager?: () => void;
};

// ============================================
// Block color config
// ============================================

type BlockColorConfig = {
  border: string;
  bg: string;
  text: string;
  icon: string;
  label: string;
};

const BLOCK_COLORS: Record<ScheduleBlockType, BlockColorConfig> = {
  recurring: {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    icon: "🔁",
    label: "반복 일정",
  },
  class: {
    border: "border-indigo-200 dark:border-indigo-800",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-300",
    icon: "🏫",
    label: "수업",
  },
  study: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    icon: "📖",
    label: "공부/준비",
  },
  habit: {
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-700 dark:text-violet-300",
    icon: "",
    label: "습관",
  },
  todo: {
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "",
    label: "할 일",
  },
  dday: {
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    text: "text-sky-700 dark:text-sky-300",
    icon: "📌",
    label: "디데이",
  },
  empty: {
    border: "border-gray-200 dark:border-gray-700",
    bg: "bg-gray-50 dark:bg-gray-800/20",
    text: "text-gray-500 dark:text-gray-400",
    icon: "",
    label: "",
  },
};

function getBlockColor(block: ScheduleBlock): BlockColorConfig {
  if (block.type === "study" && block.color === "rose") {
    return {
      border: "border-rose-200 dark:border-rose-800",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      text: "text-rose-700 dark:text-rose-300",
      icon: "📝",
      label: "시험 준비",
    };
  }
  return BLOCK_COLORS[block.type];
}

// ============================================
// Constants
// ============================================

const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SNAP_MINUTES = 15;

/**
 * 블록이 있는 시간대만 보여주는 "스마트 가시 범위" 계산.
 * 블록 근처 시간 + 현재 시각 근처만 표시하고, 빈 구간은 줄여서 보여줌.
 */
function getVisibleRange(
  blocks: ScheduleBlock[],
  currentMinutes: number,
): { startHour: number; endHour: number } {
  if (blocks.length === 0) {
    const h = Math.floor(currentMinutes / 60);
    return {
      startHour: Math.max(6, h - 1),
      endHour: Math.min(24, h + 3),
    };
  }
  const minStart = Math.min(...blocks.map((b) => b.startMin), currentMinutes);
  const maxEnd = Math.max(...blocks.map((b) => b.endMin), currentMinutes + 60);
  // 앞뒤 1시간 여유
  const startHour = Math.max(6, Math.floor(minStart / 60) - 1);
  const endHour = Math.min(24, Math.ceil(maxEnd / 60) + 1);
  // 최소 4시간은 표시
  if (endHour - startHour < 4) {
    const mid = (startHour + endHour) / 2;
    return {
      startHour: Math.max(6, Math.floor(mid - 2)),
      endHour: Math.min(24, Math.ceil(mid + 2)),
    };
  }
  return { startHour, endHour };
}

// ============================================
// Drag state type
// ============================================

type DragState = {
  blockId: string;
  planId: string;
  mode: "move" | "resize";
  initialMouseY: number;
  initialStartMin: number;
  initialEndMin: number;
  currentStartMin: number;
  currentEndMin: number;
};

export default function DailySchedule({
  todos,
  recurringTasks,
  onUpdate,
  assignments,
  classEvents,
  courseNames,
  habits,
  compact = false,
  dailyPlans,
  onOpenTriage,
  onScheduleUpdate,
  onAutoDistributeTodayTasks,
  onRefreshSchedule,
  workspaceMap,
  ddayEntries,
  onDeleteRecurringTask,
  onOpenRoutineManager,
}: DailyScheduleProps) {
  const [refreshing, setRefreshing] = useState(false);
  const HOUR_HEIGHT = compact ? 30 : 48;

  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hasPersisted = useRef(false);

  const today = todayKST();
  const dayOfWeek = parseLocalDate(today).getDay();

  // 오늘 기한이지만 아직 daily plan에 없는 할일
  const todayDueTodos = useMemo(() => {
    const scheduledIds = new Set(
      (dailyPlans ?? []).map((p) => p.todo_id),
    );
    return todos.filter(
      (t) =>
        !t.is_completed &&
        t.description !== SECTION_HEADER_MARKER &&
        !t.parent_id &&
        t.due_date === today &&
        !scheduledIds.has(t.id),
    );
  }, [todos, dailyPlans, today]);

  // Current time position (KST)
  const now = nowKST();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 일일 계획 활성 여부
  const hasActivePlans = dailyPlans && dailyPlans.some((p) => !p.is_skipped && p.estimated_minutes > 0);

  // Block positioning — visStartHour 기준 (가시 범위만 표시)
  // NOTE: visStartHour는 blocks 이후에 결정되므로 이 함수는 렌더 시에만 호출
  function getBlockStyle(block: ScheduleBlock, refStartHour: number) {
    // 드래그 중인 블록은 dragState의 좌표 사용
    if (dragState && dragState.blockId === block.id) {
      const topPx = ((dragState.currentStartMin - refStartHour * 60) / 60) * HOUR_HEIGHT;
      const heightPx = ((dragState.currentEndMin - dragState.currentStartMin) / 60) * HOUR_HEIGHT;
      return { top: `${topPx}px`, height: `${Math.max(heightPx, compact ? 18 : 24)}px` };
    }
    const topPx = ((block.startMin - refStartHour * 60) / 60) * HOUR_HEIGHT;
    const heightPx = ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT;
    return { top: `${topPx}px`, height: `${Math.max(heightPx, compact ? 18 : 24)}px` };
  }

  // Generate schedule blocks
  const baseBlocks = useMemo(
    () =>
      generateSchedule(recurringTasks, todos, dayOfWeek, {
        classEvents,
        dateStr: today,
        courseNames,
        habits,
      }),
    [recurringTasks, todos, dayOfWeek, classEvents, today, courseNames, habits]
  );

  // 일일 계획 자동 배치 결과
  const dailyPlanResult = useMemo(() => {
    if (!hasActivePlans || !dailyPlans) return null;
    return autoAssignDailyPlans(baseBlocks, dailyPlans, todos);
  }, [baseBlocks, dailyPlans, todos, hasActivePlans]);

  // 자동 배치 후 DB에 저장 (한 번만)
  const batchUpdate = useCallback(async () => {
    if (!dailyPlanResult || dailyPlanResult.scheduleUpdates.length === 0) return;
    if (hasPersisted.current) return;
    hasPersisted.current = true;
    if (onScheduleUpdate) {
      for (const upd of dailyPlanResult.scheduleUpdates) {
        await onScheduleUpdate(upd.id, upd.startMin, upd.endMin);
      }
    }
  }, [dailyPlanResult, onScheduleUpdate]);

  useEffect(() => {
    batchUpdate();
  }, [batchUpdate]);

  // dailyPlans 변경 시 persist 플래그 리셋
  useEffect(() => {
    hasPersisted.current = false;
  }, [dailyPlans]);

  const blocks = useMemo(() => {
    let result: ScheduleBlock[];
    // 일일 계획이 있으면 그것 사용
    if (dailyPlanResult) {
      result = dailyPlanResult.blocks;
    } else if (showAutoSchedule) {
      // 기존 자동 배분
      result = autoAssignTodos(baseBlocks, todos, assignments, today);
    } else {
      result = baseBlocks;
    }
    // D-Day 블록은 모든 블록 확정 후 남은 빈 슬롯에 배치
    if (ddayEntries && ddayEntries.length > 0) {
      result = placeDdayBlocks(result, ddayEntries);
    }
    return result;
  }, [dailyPlanResult, baseBlocks, todos, showAutoSchedule, assignments, today, ddayEntries]);

  // 가시 범위 계산 (블록이 있는 시간대 + 현재 시각 기준)
  const visibleRange = useMemo(
    () => getVisibleRange(blocks, currentMinutes),
    [blocks, currentMinutes],
  );
  const visStartHour = compact ? START_HOUR : visibleRange.startHour;
  const visEndHour = compact ? END_HOUR : visibleRange.endHour;
  const visTotalHours = visEndHour - visStartHour;
  const currentTopPx = ((currentMinutes - visStartHour * 60) / 60) * HOUR_HEIGHT;

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

  // ============================================
  // Drag & Resize handlers
  // ============================================

  function snapToGrid(min: number): number {
    return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES;
  }

  function handlePointerDown(
    e: React.PointerEvent,
    block: ScheduleBlock,
    mode: "move" | "resize",
  ) {
    if (!block.planId || compact) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      blockId: block.id,
      planId: block.planId,
      mode,
      initialMouseY: e.clientY,
      initialStartMin: block.startMin,
      initialEndMin: block.endMin,
      currentStartMin: block.startMin,
      currentEndMin: block.endMin,
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState) return;
    const deltaY = e.clientY - dragState.initialMouseY;
    const deltaMin = (deltaY / HOUR_HEIGHT) * 60;

    if (dragState.mode === "move") {
      const duration = dragState.initialEndMin - dragState.initialStartMin;
      let newStart = snapToGrid(dragState.initialStartMin + deltaMin);
      newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - duration, newStart));
      setDragState((prev) =>
        prev ? { ...prev, currentStartMin: newStart, currentEndMin: newStart + duration } : null,
      );
    } else {
      // resize: endMin만 변경
      let newEnd = snapToGrid(dragState.initialEndMin + deltaMin);
      newEnd = Math.max(dragState.initialStartMin + SNAP_MINUTES, Math.min(END_HOUR * 60, newEnd));
      setDragState((prev) =>
        prev ? { ...prev, currentEndMin: newEnd } : null,
      );
    }
  }

  async function handlePointerUp() {
    if (!dragState || !onScheduleUpdate) return;
    const { planId, currentStartMin, currentEndMin } = dragState;
    setDragState(null);
    // 변경사항이 있을 때만 업데이트
    if (
      currentStartMin !== dragState.initialStartMin ||
      currentEndMin !== dragState.initialEndMin
    ) {
      await onScheduleUpdate(planId, currentStartMin, currentEndMin);
    }
  }

  // ============================================
  // Legend
  // ============================================

  const activeTypes = useMemo(() => {
    const types = new Set(blocks.map((b) => b.type));
    const hasExamStudy = blocks.some(
      (b) => b.type === "study" && b.color === "rose"
    );
    const hasRegularStudy = blocks.some(
      (b) => b.type === "study" && b.color !== "rose"
    );
    return { types, hasExamStudy, hasRegularStudy };
  }, [blocks]);

  const legendItems = useMemo(() => {
    const items: { color: BlockColorConfig; key: string }[] = [];
    if (activeTypes.types.has("recurring"))
      items.push({ color: BLOCK_COLORS.recurring, key: "recurring" });
    if (activeTypes.types.has("habit"))
      items.push({ color: BLOCK_COLORS.habit, key: "habit" });
    if (activeTypes.types.has("class"))
      items.push({ color: BLOCK_COLORS.class, key: "class" });
    if (activeTypes.hasRegularStudy)
      items.push({ color: BLOCK_COLORS.study, key: "study" });
    if (activeTypes.hasExamStudy)
      items.push({
        color: {
          border: "border-rose-200 dark:border-rose-800",
          bg: "bg-rose-50 dark:bg-rose-900/20",
          text: "text-rose-700 dark:text-rose-300",
          icon: "📝",
          label: "시험 준비",
        },
        key: "exam",
      });
    if (activeTypes.types.has("todo"))
      items.push({ color: BLOCK_COLORS.todo, key: "todo" });
    if (activeTypes.types.has("dday"))
      items.push({ color: BLOCK_COLORS.dday, key: "dday" });
    return items;
  }, [activeTypes]);

  return (
    <div className={compact ? "" : "flex gap-4"}>
      {/* Timeline */}
      <div className="flex-1">
        {/* Toolbar */}
        {!compact && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground dark:text-white">
              <span>📅</span>
              오늘의 시간표
            </h3>
            <div className="flex items-center gap-2">
              {onOpenTriage && (
                <button
                  onClick={onOpenTriage}
                  className="rounded-xl bg-[#007AFF] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0056b3]"
                >
                  📋 오늘 계획
                </button>
              )}
              {todayDueTodos.length > 0 && onAutoDistributeTodayTasks && (
                <button
                  onClick={() => onAutoDistributeTodayTasks(todayDueTodos)}
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-600"
                >
                  📅 오늘 할 일 배치 ({todayDueTodos.length})
                </button>
              )}
              {hasActivePlans && onRefreshSchedule && (
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      await onRefreshSchedule();
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                  className="rounded-xl bg-amber-500 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                  title="시간표를 재배치합니다"
                >
                  {refreshing ? (
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      재배치 중...
                    </span>
                  ) : (
                    "🔄 시간표 새로고침"
                  )}
                </button>
              )}
              {onOpenRoutineManager && (
                <button
                  onClick={onOpenRoutineManager}
                  className="rounded-xl bg-black/[0.05] px-3 py-1.5 text-[12px] font-medium text-secondary transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                >
                  🔁 루틴 관리
                </button>
              )}
              {!hasActivePlans && (
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
              )}
            </div>
          </div>
        )}

        {/* Compact toolbar */}
        {compact && (
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setShowAutoSchedule(!showAutoSchedule)}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                showAutoSchedule
                  ? "bg-[#007AFF] text-white"
                  : "bg-black/[0.05] text-secondary dark:bg-white/[0.08]"
              }`}
            >
              {showAutoSchedule ? "✨ 자동 배분" : "✨ 자동 배분"}
            </button>
          </div>
        )}

        {/* Legend */}
        {legendItems.length > 1 && (
          <div
            className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 ${
              compact ? "gap-x-2" : ""
            }`}
          >
            {legendItems.map((item) => (
              <div key={item.key} className="flex items-center gap-1">
                <span
                  className={`inline-block rounded ${
                    compact ? "h-2 w-2" : "h-2.5 w-2.5"
                  } ${item.color.bg} border ${item.color.border}`}
                />
                <span
                  className={`${
                    compact ? "text-[9px]" : "text-[10px]"
                  } text-secondary`}
                >
                  {item.color.icon && `${item.color.icon} `}
                  {item.color.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          className={`relative ${
            compact ? "overflow-hidden rounded-lg" : "card-surface overflow-hidden p-0"
          }`}
        >
          <div
            ref={timelineRef}
            className="relative select-none"
            style={{
              height: `${visTotalHours * HOUR_HEIGHT}px`,
              touchAction: dragState ? "none" : "auto",
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Hour lines */}
            {Array.from({ length: visTotalHours + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 flex items-start border-t border-black/[0.04] dark:border-white/[0.06]"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              >
                <span
                  className={`flex-shrink-0 pr-2 pt-0.5 text-right text-secondary ${
                    compact
                      ? "w-8 text-[8px]"
                      : "w-12 text-[10px]"
                  }`}
                >
                  {String(visStartHour + i).padStart(2, "0")}:00
                </span>
                <div className="flex-1" />
              </div>
            ))}

            {/* Current time line */}
            {currentMinutes >= visStartHour * 60 &&
              currentMinutes <= visEndHour * 60 && (
                <div
                  className={`absolute right-0 z-20 flex items-center ${
                    compact ? "left-8" : "left-12"
                  }`}
                  style={{ top: `${currentTopPx}px` }}
                >
                  <div
                    className={`rounded-full bg-red-500 ${
                      compact ? "h-1.5 w-1.5" : "h-2 w-2"
                    }`}
                  />
                  <div className="h-[1.5px] flex-1 bg-red-500" />
                </div>
              )}

            {/* Ghost block (original position during drag) */}
            {dragState && (() => {
              const ghostTop = ((dragState.initialStartMin - visStartHour * 60) / 60) * HOUR_HEIGHT;
              const ghostHeight = ((dragState.initialEndMin - dragState.initialStartMin) / 60) * HOUR_HEIGHT;
              return (
                <div
                  className="absolute left-14 right-2 z-[5] rounded-lg border-2 border-dashed border-emerald-300/50 dark:border-emerald-600/30"
                  style={{ top: `${ghostTop}px`, height: `${Math.max(ghostHeight, 24)}px` }}
                />
              );
            })()}

            {/* Schedule blocks */}
            {blocks.filter(b => b.endMin > visStartHour * 60 && b.startMin < visEndHour * 60).map((block) => {
              const style = getBlockStyle(block, visStartHour);
              const colorCfg = getBlockColor(block);
              const isDragging = dragState?.blockId === block.id;
              const isDraggable = !!block.planId && !compact;

              return (
                <div
                  key={block.id}
                  className={`group absolute z-10 flex items-start overflow-hidden rounded-lg border px-2 py-1 ${
                    compact ? "left-9 right-1" : "left-14 right-2"
                  } ${colorCfg.border} ${colorCfg.bg} ${
                    isDragging ? "z-30 shadow-lg opacity-90 ring-2 ring-[#007AFF]/30" : ""
                  } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
                  style={style}
                  onPointerDown={
                    isDraggable
                      ? (e) => handlePointerDown(e, block, "move")
                      : undefined
                  }
                >
                  {/* Drag grip icon for draggable blocks */}
                  {isDraggable && (
                    <span className="mr-1 mt-0.5 flex-shrink-0 text-[9px] text-secondary/50 select-none">
                      ⠿
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-medium ${colorCfg.text} ${
                        compact ? "text-[9px]" : "text-[11px]"
                      }`}
                    >
                      {colorCfg.icon && `${colorCfg.icon} `}
                      {block.title}
                      {block.courseName &&
                        block.type === "study" &&
                        ` · ${block.courseName}`}
                    </p>
                    {!compact && (
                      <p className="text-[9px] text-secondary">
                        {isDragging
                          ? `${minutesToTime(dragState!.currentStartMin)} - ${minutesToTime(dragState!.currentEndMin)}`
                          : `${minutesToTime(block.startMin)} - ${minutesToTime(block.endMin)}`}
                        {block.todoId && workspaceMap && (() => {
                          const todo = todos.find((t) => t.id === block.todoId);
                          const wsInfo = todo ? workspaceMap.get(todo.workspace_id) : null;
                          return wsInfo ? ` · ${wsInfo.name}` : "";
                        })()}
                      </p>
                    )}
                  </div>
                  {!compact && block.todoId && !isDragging && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(block.todoId!, {
                          is_completed: true,
                          status: "done",
                        });
                      }}
                      className="mt-0.5 flex-shrink-0 rounded p-0.5 text-secondary hover:text-emerald-600"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                  )}
                  {/* 반복일정 삭제 버튼 */}
                  {!compact && block.type === "recurring" && block.recurringTaskId && onDeleteRecurringTask && !isDragging && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("이 반복일정을 삭제하시겠습니까?")) {
                          onDeleteRecurringTask(block.recurringTaskId!);
                        }
                      }}
                      className="mt-0.5 flex-shrink-0 rounded p-0.5 text-secondary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {/* Resize handle at bottom */}
                  {isDraggable && !isDragging && (
                    <div
                      className="absolute bottom-0 left-0 right-0 flex cursor-s-resize justify-center py-0.5"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e, block, "resize");
                      }}
                    >
                      <div className="h-1 w-8 rounded-full bg-current opacity-20" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar: Unscheduled todos */}
      {!compact && unscheduledTodos.length > 0 && !showAutoSchedule && !hasActivePlans && (
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
