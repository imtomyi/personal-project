"use client";

import { memo, useCallback } from "react";
import type { Expense } from "@/lib/types";
import { getCategoryMeta } from "@/hooks/useExpenses";

type Props = {
  expense: Expense;
  onDelete: (id: string) => Promise<void>;
};

function ExpenseItem({ expense, onDelete }: Props) {
  const cat = getCategoryMeta(expense.category);

  const handleDelete = useCallback(() => {
    onDelete(expense.id);
  }, [onDelete, expense.id]);

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
      {/* 카테고리 이모지 */}
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm"
        style={{ backgroundColor: cat.color + "18" }}
      >
        {cat.emoji}
      </span>

      {/* 정보 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {expense.amount.toLocaleString()}원
          </span>
          <span
            className="rounded px-1 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: cat.color + "20", color: cat.color }}
          >
            {cat.label}
          </span>
        </div>
        {expense.memo && (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {expense.memo}
          </p>
        )}
      </div>

      {/* 삭제 */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        title="삭제"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default memo(ExpenseItem);
