"use client";

import type { ExpenseCategory } from "@/lib/types";
import { getCategoryMeta } from "@/hooks/useExpenses";

type Props = {
  monthlyTotal: number;
  dailyAverage: number;
  topCategory: ExpenseCategory | null;
  count: number;
};

export default function ExpenseStats({
  monthlyTotal,
  dailyAverage,
  topCategory,
  count,
}: Props) {
  const topCat = topCategory ? getCategoryMeta(topCategory) : null;

  const stats = [
    {
      label: "이번 달 총 지출",
      value: `${monthlyTotal.toLocaleString()}원`,
      color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
      icon: "💰",
    },
    {
      label: "일 평균",
      value: dailyAverage > 0 ? `${dailyAverage.toLocaleString()}원` : "-",
      color: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
      icon: "📊",
    },
    {
      label: "최다 카테고리",
      value: topCat ? `${topCat.emoji} ${topCat.label}` : "-",
      color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
      icon: "🏷️",
    },
    {
      label: "지출 건수",
      value: `${count}건`,
      color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
      icon: "🧾",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl px-3 py-3 ${s.color}`}
        >
          <p className="text-[10px] font-medium opacity-70">
            {s.icon} {s.label}
          </p>
          <p className="mt-0.5 text-base font-bold">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
