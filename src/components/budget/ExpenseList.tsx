"use client";

import type { Expense } from "@/lib/types";
import { fmtDateKST } from "@/lib/date";
import ExpenseItem from "./ExpenseItem";

type Props = {
  expenses: Expense[];
  onDelete: (id: string) => Promise<void>;
};

export default function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-2xl">📭</p>
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          이번 달 지출 내역이 없습니다
        </p>
        <p className="mt-0.5 text-xs text-gray-300 dark:text-gray-600">
          위에서 지출을 추가해보세요
        </p>
      </div>
    );
  }

  // 날짜별 그룹핑
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = groups.get(e.date) ?? [];
    list.push(e);
    groups.set(e.date, list);
  }

  // 최신 날짜 먼저
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            📋 지출 내역
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {expenses.length}건
          </span>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {sortedDates.map((date) => {
          const items = groups.get(date)!;
          const dayTotal = items.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={date} className="border-b border-gray-50 last:border-0 dark:border-gray-700/50">
              {/* 날짜 헤더 */}
              <div className="flex items-center justify-between bg-gray-50/50 px-4 py-1.5 dark:bg-gray-800/50">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {fmtDateKST(date)}
                </span>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {dayTotal.toLocaleString()}원
                </span>
              </div>

              {/* 항목 */}
              <div className="px-2 py-1">
                {items.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
