"use client";

import { useState } from "react";
import { useGoals, type GoalTodoStats } from "@/hooks/useGoals";
import type { Todo } from "@/lib/types";

const EMOJI_OPTIONS = ["🎯", "📈", "💡", "🏆", "⭐", "🚀", "📖", "💪", "🎓", "💰"];

type GoalWidgetProps = {
  /** 전체 할일 목록 (goal_id로 연결 통계 계산) */
  allTodos?: Todo[];
};

export default function GoalWidget({ allTodos }: GoalWidgetProps) {
  const { goals, loading, addGoal, updateGoal, deleteGoal, goalTodoStatsMap } = useGoals(allTodos);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  async function handleAdd() {
    if (!newTitle.trim()) return;
    try {
      await addGoal(newTitle.trim(), newEmoji);
      setNewTitle("");
      setNewEmoji("🎯");
      setShowAdd(false);
    } catch {
      // Error
    }
  }

  async function handleProgressChange(id: string, progress: number) {
    const updates: { progress: number; status?: "active" | "completed" } = { progress };
    if (progress >= 100) {
      updates.status = "completed";
    }
    await updateGoal(id, updates);
  }

  /** 연결된 할일이 있으면 자동 진행률, 없으면 수동 슬라이더 */
  function getEffectiveProgress(goalId: string, manualProgress: number): { progress: number; stats: GoalTodoStats | null } {
    const stats = goalTodoStatsMap.get(goalId);
    if (stats && stats.total > 0) {
      return { progress: stats.progress, stats };
    }
    return { progress: manualProgress, stats: null };
  }

  if (loading) {
    return (
      <div className="card-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">목표</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">목표</h3>
          {activeGoals.length > 0 && (
            <span className="rounded-full bg-[#007AFF]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#007AFF]">
              {activeGoals.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg p-1 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-xl border border-black/[0.06] bg-[#f5f5f7] p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <div className="mb-2 flex flex-wrap gap-1">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setNewEmoji(e)}
                className={`rounded-md p-1 text-sm ${
                  newEmoji === e
                    ? "bg-[#007AFF]/10 ring-1 ring-[#007AFF]"
                    : "hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="목표 제목..."
              className="flex-1 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#007AFF] dark:border-white/[0.1] dark:bg-[#1c1c1e] dark:text-white"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="rounded-lg bg-[#007AFF] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0056b3] disabled:opacity-40"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[12px] text-secondary">목표를 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const { progress, stats } = getEffectiveProgress(goal.id, goal.progress);
            const hasLinkedTodos = stats !== null;

            return (
              <div key={goal.id} className="group">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{goal.emoji}</span>
                    <span className="text-[13px] font-medium text-foreground dark:text-[#e5e5e7]">
                      {goal.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasLinkedTodos && (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {stats.completed}/{stats.total}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-[#007AFF]">{progress}%</span>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="rounded p-0.5 text-secondary opacity-0 hover:text-red-500 group-hover:opacity-100"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        hasLinkedTodos
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          : "bg-gradient-to-r from-[#007AFF] to-[#5856D6]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* 연결된 할일이 없을 때만 수동 슬라이더 */}
                  {!hasLinkedTodos && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={goal.progress}
                      onChange={(e) => handleProgressChange(goal.id, Number(e.target.value))}
                      className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
                    />
                  )}
                </div>

                {goal.target_date && (
                  <p className="mt-1 text-[10px] text-secondary">
                    목표일: {goal.target_date.slice(5).replace("-", "/")}
                  </p>
                )}
              </div>
            );
          })}

          {/* Completed goals (collapsed) */}
          {completedGoals.length > 0 && (
            <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
              <p className="mb-1 text-[11px] font-medium text-secondary">완료됨</p>
              {completedGoals.slice(0, 3).map((goal) => (
                <div key={goal.id} className="flex items-center gap-1.5 py-0.5">
                  <span className="text-xs">{goal.emoji}</span>
                  <span className="text-[11px] text-secondary line-through">{goal.title}</span>
                  <span className="text-[10px] text-emerald-500">100%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
