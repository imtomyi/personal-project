"use client";

import { useState } from "react";
import type { ExpenseCategory } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenses";
import { todayKST } from "@/lib/date";

type Props = {
  onAdd: (input: {
    amount: number;
    category: ExpenseCategory;
    memo?: string;
    date?: string;
  }) => Promise<void>;
};

export default function AddExpense({ onAdd }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(todayKST());
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount.replace(/,/g, ""), 10);
    if (!num || num <= 0) return;

    setSubmitting(true);
    try {
      await onAdd({ amount: num, category, memo: memo || undefined, date });
      setAmount("");
      setMemo("");
      setDate(todayKST());
    } catch {
      // 에러는 상위에서 처리
    } finally {
      setSubmitting(false);
    }
  }

  // 금액 포맷 (1000단위 콤마)
  function handleAmountChange(val: string) {
    const digits = val.replace(/[^0-9]/g, "");
    if (digits === "") {
      setAmount("");
      return;
    }
    setAmount(Number(digits).toLocaleString());
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
        ➕ 지출 추가
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 금액 입력 */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="금액"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-8 text-lg font-bold text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            원
          </span>
        </div>

        {/* 카테고리 선택 */}
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                category === cat.value
                  ? "text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              }`}
              style={
                category === cat.value
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* 메모 + 날짜 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[130px] rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>

        {/* 추가 버튼 */}
        <button
          type="submit"
          disabled={submitting || !amount}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "추가 중..." : "지출 추가"}
        </button>
      </form>
    </div>
  );
}
