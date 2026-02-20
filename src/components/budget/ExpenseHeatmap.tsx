"use client";

import { WEEKDAY_LABELS } from "@/lib/constants";

type Props = {
  dailyTotals: Record<string, number>;
  selectedMonth: string;
};

export default function ExpenseHeatmap({ dailyTotals, selectedMonth }: Props) {
  const [year, month] = selectedMonth.split("-").map(Number);

  // 해당 월의 첫째 날, 마지막 날
  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay(); // 0=일, 1=월, ...

  // 최대 금액 (색상 강도 계산용)
  const amounts = Object.values(dailyTotals);
  const maxAmount = Math.max(...amounts, 1);

  // 날짜 셀 배열 생성
  const cells: { date: number; key: string; amount: number }[] = [];
  for (let d = 1; d <= lastDate; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: d, key, amount: dailyTotals[key] ?? 0 });
  }

  function getColor(amount: number) {
    if (amount === 0) return "bg-gray-50 dark:bg-gray-700/30";
    const ratio = amount / maxAmount;
    if (ratio >= 0.75) return "bg-red-400 dark:bg-red-500";
    if (ratio >= 0.5) return "bg-orange-300 dark:bg-orange-400";
    if (ratio >= 0.25) return "bg-amber-200 dark:bg-amber-300";
    return "bg-green-200 dark:bg-green-300";
  }

  const dayLabels = WEEKDAY_LABELS;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
        🗓️ 일별 소비
      </h3>

      {/* 요일 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
        {dayLabels.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[9px] font-medium text-gray-400 dark:text-gray-500"
          >
            {label}
          </div>
        ))}

        {/* 빈 셀 (월 시작 전) */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* 날짜 셀 */}
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`group relative flex aspect-square cursor-default items-center justify-center rounded-md text-[10px] font-medium transition-transform hover:scale-110 ${getColor(cell.amount)} ${
              cell.amount > 0
                ? "text-gray-700 dark:text-gray-100"
                : "text-gray-300 dark:text-gray-600"
            }`}
            title={
              cell.amount > 0
                ? `${cell.date}일: ${cell.amount.toLocaleString()}원`
                : `${cell.date}일`
            }
          >
            {cell.date}

            {/* 툴팁 */}
            {cell.amount > 0 && (
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[9px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-200 dark:text-gray-800">
                {cell.amount.toLocaleString()}원
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="text-[9px] text-gray-400">적음</span>
        <div className="h-2.5 w-2.5 rounded-sm bg-green-200 dark:bg-green-300" />
        <div className="h-2.5 w-2.5 rounded-sm bg-amber-200 dark:bg-amber-300" />
        <div className="h-2.5 w-2.5 rounded-sm bg-orange-300 dark:bg-orange-400" />
        <div className="h-2.5 w-2.5 rounded-sm bg-red-400 dark:bg-red-500" />
        <span className="text-[9px] text-gray-400">많음</span>
      </div>
    </div>
  );
}
