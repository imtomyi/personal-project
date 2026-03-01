"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useExpenses } from "@/hooks/useExpenses";
import Header from "@/components/layout/Header";
import AddExpense from "@/components/budget/AddExpense";
import ExpenseList from "@/components/budget/ExpenseList";
import ExpenseStats from "@/components/budget/ExpenseStats";
import ExpenseCategoryChart from "@/components/budget/ExpenseCategoryChart";
import ExpenseMonthlyChart from "@/components/budget/ExpenseMonthlyChart";
import ExpenseBudgetBar from "@/components/budget/ExpenseBudgetBar";
import ExpenseHeatmap from "@/components/budget/ExpenseHeatmap";

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const {
    loading,
    selectedMonth,
    setSelectedMonth,
    addExpense,
    deleteExpense,
    setBudget,
    monthlyExpenses,
    monthlyTotal,
    currentBudget,
    categoryBreakdown,
    dailyTotals,
    monthlyTrend,
    dailyAverage,
    topCategory,
  } = useExpenses();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // 월 이동
  function changeMonth(offset: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    let newY = y;
    let newM = m + offset;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, "0")}`);
  }

  function goToCurrentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${y}-${m}`);
  }

  // 라벨: "2026년 2월"
  function fmtMonthLabel(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    return `${y}년 ${m}월`;
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* 서브 헤더 */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  가계부
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  소비 패턴을 한눈에
                </p>
              </div>
            </div>

            {/* 월 네비게이션 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="min-w-[100px] text-center text-sm font-bold text-gray-900 dark:text-white">
                {fmtMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={goToCurrentMonth}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                이번 달
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠: 6:4 레이아웃 */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* 왼쪽: 차트/통계 (60%) */}
            <main className="min-w-0 flex-1 space-y-4 lg:w-[60%]">
              <ExpenseStats
                monthlyTotal={monthlyTotal}
                dailyAverage={dailyAverage}
                topCategory={topCategory}
                count={monthlyExpenses.length}
              />

              <ExpenseBudgetBar
                monthlyTotal={monthlyTotal}
                currentBudget={currentBudget}
                selectedMonth={selectedMonth}
                onSetBudget={setBudget}
              />

              <ExpenseCategoryChart
                categoryBreakdown={categoryBreakdown}
                monthlyTotal={monthlyTotal}
              />

              <ExpenseMonthlyChart
                monthlyTrend={monthlyTrend}
                selectedMonth={selectedMonth}
              />

              <ExpenseHeatmap
                dailyTotals={dailyTotals}
                selectedMonth={selectedMonth}
              />
            </main>

            {/* 오른쪽: 입력 + 목록 (40%) */}
            <aside className="w-full flex-shrink-0 lg:w-[40%]">
              <div className="space-y-4 lg:sticky lg:top-[120px]" style={{ maxHeight: "calc(100vh - 150px)" }}>
                <AddExpense onAdd={addExpense} />
                <ExpenseList
                  expenses={monthlyExpenses}
                  onDelete={deleteExpense}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
