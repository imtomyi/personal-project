"use client";

import type { ExpenseCategory } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenses";

type Props = {
  categoryBreakdown: Record<string, number>;
  monthlyTotal: number;
};

export default function ExpenseCategoryChart({
  categoryBreakdown,
  monthlyTotal,
}: Props) {
  if (monthlyTotal === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
          🍩 카테고리별
        </h3>
        <div className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  // conic-gradient 데이터 만들기
  const entries = EXPENSE_CATEGORIES.filter(
    (c) => (categoryBreakdown[c.value] ?? 0) > 0
  ).map((c) => ({
    ...c,
    amount: categoryBreakdown[c.value as ExpenseCategory] ?? 0,
    percent: ((categoryBreakdown[c.value as ExpenseCategory] ?? 0) / monthlyTotal) * 100,
  }));

  // conic-gradient 문자열 생성
  let currentDeg = 0;
  const gradientStops: string[] = [];
  for (const entry of entries) {
    const nextDeg = currentDeg + (entry.percent / 100) * 360;
    gradientStops.push(`${entry.color} ${currentDeg}deg ${nextDeg}deg`);
    currentDeg = nextDeg;
  }

  const gradientStr = `conic-gradient(${gradientStops.join(", ")})`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
        🍩 카테고리별
      </h3>

      <div className="flex items-center gap-4">
        {/* 도넛 차트 */}
        <div className="relative flex-shrink-0">
          <div
            className="h-28 w-28 rounded-full"
            style={{ background: gradientStr }}
          />
          {/* 중앙 흰 원 (도넛 효과) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white dark:bg-gray-800">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {(monthlyTotal / 10000).toFixed(monthlyTotal >= 100000 ? 0 : 1)}
              </span>
              <span className="text-[9px] text-gray-400">만원</span>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {entries.map((entry) => (
            <div key={entry.value} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-400">
                {entry.emoji} {entry.label}
              </span>
              <span className="flex-shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {entry.percent.toFixed(0)}%
              </span>
              <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                {entry.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
