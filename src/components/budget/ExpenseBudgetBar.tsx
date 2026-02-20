"use client";

import { useState } from "react";
import type { MonthlyBudget } from "@/lib/types";

type Props = {
  monthlyTotal: number;
  currentBudget: MonthlyBudget | null;
  selectedMonth: string;
  onSetBudget: (yearMonth: string, amount: number) => Promise<void>;
};

export default function ExpenseBudgetBar({
  monthlyTotal,
  currentBudget,
  selectedMonth,
  onSetBudget,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const budget = currentBudget?.budget_amount ?? 0;
  const percent = budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0;
  const remaining = budget - monthlyTotal;

  // 색상 코딩
  let barColor = "bg-green-500";
  let textColor = "text-green-600 dark:text-green-400";
  if (percent >= 90) {
    barColor = "bg-red-500";
    textColor = "text-red-600 dark:text-red-400";
  } else if (percent >= 70) {
    barColor = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
  }

  async function handleSave() {
    const num = parseInt(budgetInput.replace(/,/g, ""), 10);
    if (!num || num <= 0) return;
    await onSetBudget(selectedMonth, num);
    setEditing(false);
    setBudgetInput("");
  }

  function handleBudgetInputChange(val: string) {
    const digits = val.replace(/[^0-9]/g, "");
    if (digits === "") {
      setBudgetInput("");
      return;
    }
    setBudgetInput(Number(digits).toLocaleString());
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          🎯 예산
        </h3>
        <button
          onClick={() => {
            setEditing(!editing);
            setBudgetInput(budget > 0 ? budget.toLocaleString() : "");
          }}
          className="text-[10px] text-blue-500 hover:text-blue-600"
        >
          {editing ? "취소" : budget > 0 ? "수정" : "설정"}
        </button>
      </div>

      {editing ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="월 예산 금액"
              value={budgetInput}
              onChange={(e) => handleBudgetInputChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              원
            </span>
          </div>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      ) : budget > 0 ? (
        <div>
          {/* 진행률 바 */}
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* 정보 */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textColor}`}>
              {percent.toFixed(0)}% 사용
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {monthlyTotal.toLocaleString()} / {budget.toLocaleString()}원
            </span>
          </div>

          {remaining > 0 ? (
            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
              남은 예산: {remaining.toLocaleString()}원
            </p>
          ) : (
            <p className="mt-1 text-[10px] font-bold text-red-500">
              예산 초과: {Math.abs(remaining).toLocaleString()}원
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 py-4 text-center dark:bg-gray-700/50">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            월 예산을 설정하면 진행률을 확인할 수 있어요
          </p>
        </div>
      )}
    </div>
  );
}
