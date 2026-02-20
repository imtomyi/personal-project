"use client";

type Props = {
  monthlyTrend: { month: string; total: number }[];
  selectedMonth: string;
};

export default function ExpenseMonthlyChart({
  monthlyTrend,
  selectedMonth,
}: Props) {
  const maxTotal = Math.max(...monthlyTrend.map((m) => m.total), 1);

  // "YYYY-MM" → "M월"
  function fmtMonth(ym: string) {
    const m = parseInt(ym.split("-")[1], 10);
    return `${m}월`;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
        📈 월별 추이
      </h3>

      <svg viewBox="0 0 300 140" className="w-full">
        {/* 배경 가이드라인 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="30"
            y1={10 + (1 - ratio) * 100}
            x2="290"
            y2={10 + (1 - ratio) * 100}
            stroke="currentColor"
            className="text-gray-100 dark:text-gray-700"
            strokeWidth="0.5"
          />
        ))}

        {/* Y축 레이블 */}
        {[0, 0.5, 1].map((ratio) => (
          <text
            key={ratio}
            x="28"
            y={10 + (1 - ratio) * 100 + 3}
            textAnchor="end"
            className="fill-gray-300 text-[8px] dark:fill-gray-600"
          >
            {((maxTotal * ratio) / 10000).toFixed(0)}만
          </text>
        ))}

        {/* 바 + 라벨 */}
        {monthlyTrend.map((item, i) => {
          const barWidth = 30;
          const gap = (260 - barWidth * 6) / 7;
          const x = 30 + gap + i * (barWidth + gap);
          const barHeight = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
          const y = 110 - barHeight;
          const isCurrent = item.month === selectedMonth;

          return (
            <g key={item.month}>
              {/* 바 */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                className={
                  isCurrent
                    ? "fill-blue-500"
                    : "fill-gray-200 dark:fill-gray-600"
                }
              />

              {/* 금액 (바 위) */}
              {item.total > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className={`text-[7px] font-semibold ${
                    isCurrent
                      ? "fill-blue-500 dark:fill-blue-400"
                      : "fill-gray-400 dark:fill-gray-500"
                  }`}
                >
                  {(item.total / 10000).toFixed(item.total >= 100000 ? 0 : 1)}만
                </text>
              )}

              {/* 월 라벨 (바 아래) */}
              <text
                x={x + barWidth / 2}
                y="125"
                textAnchor="middle"
                className={`text-[8px] ${
                  isCurrent
                    ? "fill-blue-500 font-bold dark:fill-blue-400"
                    : "fill-gray-400 dark:fill-gray-500"
                }`}
              >
                {fmtMonth(item.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
