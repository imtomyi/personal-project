"use client";

import { useState, useMemo } from "react";
import type { Todo } from "@/lib/types";
import { SECTION_HEADER_MARKER } from "@/lib/types";
import { SESSION_DURATION_PRESETS } from "@/lib/constants";

type DailyPlanTriageProps = {
  todos: Todo[];
  triagedTodoIds: Set<string>;
  onPlan: (todoId: string, estimatedMinutes: number) => Promise<void>;
  onSkip: (todoId: string) => Promise<void>;
  onComplete: () => void;
  onClose: () => void;
};

// 우선순위 스타일
const PRIORITY_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "P1" },
  2: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", label: "P2" },
  3: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "P3" },
  4: { bg: "bg-gray-100 dark:bg-gray-700/30", text: "text-gray-600 dark:text-gray-400", label: "P4" },
};

export default function DailyPlanTriage({
  todos,
  triagedTodoIds,
  onPlan,
  onSkip,
  onComplete,
  onClose,
}: DailyPlanTriageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [triageResults, setTriageResults] = useState<
    { todoId: string; todoTitle: string; minutes: number }[]
  >([]);
  const [phase, setPhase] = useState<"triage" | "summary">("triage");
  const [slideDir, setSlideDir] = useState<"" | "slide-left" | "slide-right">("");

  // 미계획, 미완료, 실제 할 일 (섹션헤더/하위 제외)
  const unplannedTodos = useMemo(
    () =>
      todos.filter(
        (t) =>
          !t.is_completed &&
          t.description !== SECTION_HEADER_MARKER &&
          !t.parent_id &&
          !triagedTodoIds.has(t.id),
      ),
    [todos, triagedTodoIds],
  );

  const currentTodo = unplannedTodos[currentIndex];
  const total = unplannedTodos.length;

  function advanceOrFinish() {
    if (currentIndex + 1 >= total) {
      setPhase("summary");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedMinutes(null);
    }
  }

  async function handlePlanToday() {
    if (!currentTodo || !selectedMinutes || processing) return;
    setProcessing(true);
    setSlideDir("slide-right");
    try {
      await onPlan(currentTodo.id, selectedMinutes);
      setTriageResults((prev) => [
        ...prev,
        {
          todoId: currentTodo.id,
          todoTitle: currentTodo.title,
          minutes: selectedMinutes,
        },
      ]);
    } catch {
      // ignore
    }
    setTimeout(() => {
      setSlideDir("");
      setProcessing(false);
      advanceOrFinish();
    }, 200);
  }

  async function handleSkip() {
    if (!currentTodo || processing) return;
    setProcessing(true);
    setSlideDir("slide-left");
    try {
      await onSkip(currentTodo.id);
    } catch {
      // ignore
    }
    setTimeout(() => {
      setSlideDir("");
      setProcessing(false);
      advanceOrFinish();
    }, 200);
  }

  function handleFinish() {
    onComplete();
    onClose();
  }

  // 총 소요시간
  const totalMinutes = triageResults.reduce((sum, r) => sum + r.minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  // 할 일이 없는 경우
  if (total === 0 && phase === "triage") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1c1c1e]">
          <div className="text-center">
            <div className="mb-3 text-4xl">✅</div>
            <h2 className="text-[16px] font-semibold text-foreground dark:text-white">
              모든 할 일이 계획되었습니다
            </h2>
            <p className="mt-1 text-[13px] text-secondary">
              오늘의 계획이 이미 완료되었습니다
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-[#007AFF] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#0056b3]"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1c1c1e]">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-foreground dark:text-white">
            <span>📋</span>
            {phase === "triage" ? "오늘 할 일 계획" : "계획 요약"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.1] dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {phase === "triage" && currentTodo ? (
          <>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-secondary">
                <span>{currentIndex + 1} / {total}</span>
                <span>{triageResults.length}개 선택됨</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[#007AFF] transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Todo Card */}
            <div
              className={`mb-5 rounded-xl border border-black/[0.06] bg-[#f9f9f9] p-5 transition-all duration-200 dark:border-white/[0.08] dark:bg-[#2c2c2e] ${
                slideDir === "slide-left"
                  ? "-translate-x-8 opacity-0"
                  : slideDir === "slide-right"
                    ? "translate-x-8 opacity-0"
                    : "translate-x-0 opacity-100"
              }`}
            >
              {/* Title */}
              <h3 className="text-[16px] font-semibold text-foreground dark:text-white">
                {currentTodo.title}
              </h3>

              {/* Meta badges */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {currentTodo.priority && PRIORITY_STYLES[currentTodo.priority] && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[currentTodo.priority].bg} ${PRIORITY_STYLES[currentTodo.priority].text}`}
                  >
                    {PRIORITY_STYLES[currentTodo.priority].label}
                  </span>
                )}
                {currentTodo.due_date && (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    📅 {currentTodo.due_date.slice(5).replace("-", "/")}
                  </span>
                )}
              </div>

              {currentTodo.description &&
                currentTodo.description !== SECTION_HEADER_MARKER && (
                  <p className="mt-2 text-[12px] text-secondary line-clamp-2">
                    {currentTodo.description}
                  </p>
                )}
            </div>

            {/* Duration Selector */}
            <div className="mb-5">
              <p className="mb-2 text-[12px] font-medium text-secondary">
                ⏱️ 예상 소요 시간
              </p>
              <div className="flex flex-wrap gap-2">
                {SESSION_DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedMinutes(preset.value)}
                    className={`rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                      selectedMinutes === preset.value
                        ? "bg-[#007AFF] text-white shadow-sm"
                        : "bg-black/[0.04] text-foreground hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                disabled={processing}
                className="flex-1 rounded-xl bg-black/[0.05] py-3 text-[13px] font-medium text-secondary transition-colors hover:bg-black/[0.08] disabled:opacity-50 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
              >
                오늘 안 함
              </button>
              <button
                onClick={handlePlanToday}
                disabled={!selectedMinutes || processing}
                className="flex-1 rounded-xl bg-[#007AFF] py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#0056b3] disabled:opacity-40"
              >
                오늘 할 일 ✓
              </button>
            </div>
          </>
        ) : (
          /* Summary Phase */
          <>
            {triageResults.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-3 text-4xl">📭</div>
                <p className="text-[14px] font-medium text-foreground dark:text-white">
                  오늘 할 일을 선택하지 않았습니다
                </p>
                <p className="mt-1 text-[12px] text-secondary">
                  할 일을 추가하거나 다시 계획해보세요
                </p>
              </div>
            ) : (
              <>
                {/* Summary header */}
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#007AFF]/[0.08] p-3 dark:bg-[#007AFF]/[0.15]">
                  <div className="text-2xl">⏰</div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground dark:text-white">
                      {triageResults.length}개 할 일 선택
                    </p>
                    <p className="text-[11px] text-secondary">
                      총 {totalHours > 0 ? `${totalHours}시간 ` : ""}
                      {remainingMins > 0 ? `${remainingMins}분` : ""}
                    </p>
                  </div>
                </div>

                {/* Planned items list */}
                <div className="mb-5 max-h-60 space-y-2 overflow-y-auto">
                  {triageResults.map((result, idx) => (
                    <div
                      key={result.todoId}
                      className="flex items-center gap-3 rounded-lg border border-black/[0.06] px-3 py-2 dark:border-white/[0.08]"
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {idx + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground dark:text-white">
                        {result.todoTitle}
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-secondary">
                        {result.minutes >= 60
                          ? `${result.minutes / 60}h`
                          : `${result.minutes}m`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-black/[0.05] py-3 text-[13px] font-medium text-secondary transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
              >
                닫기
              </button>
              {triageResults.length > 0 && (
                <button
                  onClick={handleFinish}
                  className="flex-1 rounded-xl bg-[#007AFF] py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#0056b3]"
                >
                  시간표에 배치 📅
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
