"use client";

import { useState, useMemo } from "react";
import type { Todo } from "@/lib/types";
import { SESSION_DURATION_PRESETS } from "@/lib/constants";
import { parseLocalDate, todayKST, toDateStr } from "@/lib/date";

type OverdueTodoItem = Todo & {
  workspace_name?: string;
  workspace_color?: string;
};

type OverdueTasksAlertProps = {
  overdueTodos: OverdueTodoItem[];
  onDefer: (todoId: string) => Promise<void>;
  onAddToPlan?: (todoId: string, estimatedMinutes: number) => Promise<void>;
  onComplete?: (todoId: string) => Promise<void>;
  onSkip: (todoId: string) => void;
  onDeferAll: () => Promise<void>;
  onAddAllToPlan?: () => Promise<void>;
  onClose: () => void;
};

const PRIORITY_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "P1" },
  2: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", label: "P2" },
  3: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "P3" },
  4: { bg: "bg-gray-100 dark:bg-gray-700/30", text: "text-gray-600 dark:text-gray-400", label: "P4" },
};

function getDaysOverdue(dueDate: string): number {
  const today = new Date(todayKST() + "T00:00:00");
  const due = parseLocalDate(dueDate);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

export default function OverdueTasksAlert({
  overdueTodos,
  onDefer,
  onAddToPlan,
  onComplete,
  onSkip,
  onDeferAll,
  onAddAllToPlan,
  onClose,
}: OverdueTasksAlertProps) {
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const remaining = useMemo(
    () => overdueTodos.filter((t) => !processedIds.has(t.id)),
    [overdueTodos, processedIds],
  );

  const allProcessed = remaining.length === 0;

  function markProcessed(todoId: string) {
    setProcessedIds((prev) => new Set([...prev, todoId]));
    setExpandedId(null);
  }

  async function handleDefer(todoId: string) {
    if (processing) return;
    setProcessing(true);
    try {
      await onDefer(todoId);
      markProcessed(todoId);
    } catch {
      // ignore
    }
    setProcessing(false);
  }

  async function handleAddToPlan(todoId: string, minutes: number) {
    if (processing) return;
    setProcessing(true);
    try {
      await onAddToPlan?.(todoId, minutes);
      markProcessed(todoId);
    } catch {
      // ignore
    }
    setProcessing(false);
  }

  async function handleComplete(todoId: string) {
    if (processing) return;
    setProcessing(true);
    try {
      await onComplete?.(todoId);
      markProcessed(todoId);
    } catch {
      // ignore
    }
    setProcessing(false);
  }

  function handleSkip(todoId: string) {
    onSkip(todoId);
    markProcessed(todoId);
  }

  async function handleDeferAll() {
    if (bulkProcessing) return;
    setBulkProcessing(true);
    try {
      await onDeferAll();
      const allIds = new Set(overdueTodos.map((t) => t.id));
      setProcessedIds(allIds);
    } catch {
      // ignore
    }
    setBulkProcessing(false);
  }

  async function handleAddAllToPlan() {
    if (bulkProcessing) return;
    setBulkProcessing(true);
    try {
      await onAddAllToPlan?.();
      const allIds = new Set(overdueTodos.map((t) => t.id));
      setProcessedIds(allIds);
    } catch {
      // ignore
    }
    setBulkProcessing(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1c1c1e]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground dark:text-white">
                지연된 할 일
              </h2>
              <p className="text-[11px] text-secondary">
                {overdueTodos.length}개의 할 일이 기한을 지났습니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.1] dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {/* All done state */}
          {allProcessed ? (
            <div className="py-8 text-center">
              <div className="mb-3 text-4xl">✅</div>
              <h3 className="text-[15px] font-semibold text-foreground dark:text-white">
                모두 처리되었습니다!
              </h3>
              <p className="mt-1 text-[12px] text-secondary">
                오늘 하루도 화이팅 💪
              </p>
              <button
                onClick={onClose}
                className="mt-4 rounded-xl bg-[#007AFF] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#0056b3]"
              >
                시작하기
              </button>
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleDeferAll}
                  disabled={bulkProcessing}
                  className="flex-1 rounded-xl bg-amber-50 py-2.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  {bulkProcessing ? "처리 중..." : "📅 모두 오늘로 미루기"}
                </button>
                {onAddAllToPlan && (
                  <button
                    onClick={handleAddAllToPlan}
                    disabled={bulkProcessing}
                    className="flex-1 rounded-xl bg-[#007AFF]/[0.08] py-2.5 text-[12px] font-medium text-[#007AFF] transition-colors hover:bg-[#007AFF]/[0.15] disabled:opacity-50 dark:bg-[#007AFF]/[0.15] dark:hover:bg-[#007AFF]/[0.25]"
                  >
                    {bulkProcessing ? "처리 중..." : "⏱️ 모두 시간표에 배치"}
                  </button>
                )}
              </div>

              {/* Task list */}
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {overdueTodos.map((todo) => {
                  const isProcessed = processedIds.has(todo.id);
                  const isExpanded = expandedId === todo.id;
                  const daysOverdue = todo.due_date ? getDaysOverdue(todo.due_date) : 0;

                  return (
                    <div
                      key={todo.id}
                      className={`rounded-xl border transition-all duration-300 ${
                        isProcessed
                          ? "border-emerald-200 bg-emerald-50/50 opacity-50 dark:border-emerald-800 dark:bg-emerald-900/10"
                          : "border-black/[0.06] bg-[#f9f9f9] dark:border-white/[0.08] dark:bg-[#2c2c2e]"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Processed check */}
                        {isProcessed ? (
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <span className="text-[10px]">!</span>
                          </div>
                        )}

                        {/* Title + badges */}
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[13px] font-medium ${
                            isProcessed
                              ? "text-secondary line-through"
                              : "text-foreground dark:text-white"
                          }`}>
                            {todo.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {daysOverdue > 0 && (
                              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                {daysOverdue}일 지연
                              </span>
                            )}
                            {todo.priority && PRIORITY_STYLES[todo.priority] && (
                              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${PRIORITY_STYLES[todo.priority].bg} ${PRIORITY_STYLES[todo.priority].text}`}>
                                {PRIORITY_STYLES[todo.priority].label}
                              </span>
                            )}
                            {todo.workspace_name && (
                              <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-secondary dark:bg-white/[0.08]">
                                {todo.workspace_name}
                              </span>
                            )}
                            {todo.due_date && (
                              <span className="text-[9px] text-secondary">
                                원래: {todo.due_date.slice(5).replace("-", "/")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {!isProcessed && (
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {onComplete && (
                              <button
                                onClick={() => handleComplete(todo.id)}
                                disabled={processing}
                                className="rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                title="완료 처리"
                              >
                                완료
                              </button>
                            )}
                            <button
                              onClick={() => handleDefer(todo.id)}
                              disabled={processing}
                              className="rounded-lg px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                              title="오늘로 미루기"
                            >
                              미루기
                            </button>
                            {onAddToPlan && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                                  isExpanded
                                    ? "bg-[#007AFF] text-white"
                                    : "text-[#007AFF] hover:bg-[#007AFF]/10"
                                }`}
                              >
                                시간표
                              </button>
                            )}
                            <button
                              onClick={() => handleSkip(todo.id)}
                              className="rounded-lg px-1.5 py-1 text-[11px] text-secondary hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                              title="건너뛰기"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline duration selector */}
                      {isExpanded && !isProcessed && (
                        <div className="border-t border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
                          <p className="mb-2 text-[10px] font-medium text-secondary">
                            ⏱️ 예상 소요 시간을 선택하세요
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {SESSION_DURATION_PRESETS.map((preset) => (
                              <button
                                key={preset.value}
                                onClick={() => handleAddToPlan(todo.id, preset.value)}
                                disabled={processing}
                                className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-[#007AFF] hover:text-white disabled:opacity-50 dark:bg-white/[0.06] dark:text-white dark:hover:bg-[#007AFF]"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-black/[0.05] px-4 py-2 text-[12px] font-medium text-secondary transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                >
                  나중에 처리
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
