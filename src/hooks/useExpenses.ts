"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { Expense, ExpenseCategory, MonthlyBudget } from "@/lib/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { todayKST } from "@/lib/date";

// ============================================
// 카테고리 메타데이터
// ============================================
export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { value: "food", label: "식비", emoji: "🍚", color: "#EF4444" },
  { value: "transport", label: "교통", emoji: "🚌", color: "#F59E0B" },
  { value: "shopping", label: "쇼핑", emoji: "🛍️", color: "#8B5CF6" },
  { value: "cafe", label: "카페", emoji: "☕", color: "#6366F1" },
  { value: "entertainment", label: "여가", emoji: "🎮", color: "#EC4899" },
  { value: "education", label: "교육", emoji: "📚", color: "#3B82F6" },
  { value: "health", label: "건강", emoji: "💊", color: "#10B981" },
  { value: "other", label: "기타", emoji: "📦", color: "#6B7280" },
];

export function getCategoryMeta(category: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.value === category) ?? EXPENSE_CATEGORIES[7];
}

// ============================================
// Hook
// ============================================
export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => todayKST().slice(0, 7)); // "YYYY-MM"
  const supabase = createClient();

  // ── Fetch ──
  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setExpenses(data ?? []);
    setLoading(false);
  }, []);

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase
      .from("monthly_budgets")
      .select("*")
      .order("year_month", { ascending: false });

    setBudgets(data ?? []);
  }, []);

  useRealtimeSubscription({
    channelName: "expenses:all",
    table: "expenses",
    onChanged: fetchExpenses,
  });

  useRealtimeSubscription({
    channelName: "budgets:all",
    table: "monthly_budgets",
    onChanged: fetchBudgets,
  });

  // ── CRUD: Expense ──
  async function addExpense(input: {
    amount: number;
    category: ExpenseCategory;
    memo?: string;
    date?: string;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    const expenseDate = input.date || todayKST();

    // 낙관적 업데이트
    const optimistic: Expense = {
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: input.amount,
      category: input.category,
      memo: input.memo || null,
      date: expenseDate,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [optimistic, ...prev]);

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      amount: input.amount,
      category: input.category,
      memo: input.memo || null,
      date: expenseDate,
    });

    if (error) {
      setExpenses((prev) => prev.filter((e) => e.id !== optimistic.id));
      throw error;
    }

    await fetchExpenses();
  }

  async function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      await fetchExpenses();
      throw error;
    }
  }

  // ── CRUD: Budget ──
  async function setBudget(yearMonth: string, amount: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다");

    // upsert
    const { error } = await supabase.from("monthly_budgets").upsert(
      {
        user_id: user.id,
        year_month: yearMonth,
        budget_amount: amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year_month" }
    );

    if (error) throw error;
    await fetchBudgets();
  }

  // ── 파생 데이터 ──
  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const monthlyTotal = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthlyExpenses]
  );

  const currentBudget = useMemo(
    () => budgets.find((b) => b.year_month === selectedMonth) ?? null,
    [budgets, selectedMonth]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthlyExpenses) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return map as Record<ExpenseCategory, number>;
  }, [monthlyExpenses]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthlyExpenses) {
      map[e.date] = (map[e.date] || 0) + e.amount;
    }
    return map;
  }, [monthlyExpenses]);

  // 최근 6개월 추이
  const monthlyTrend = useMemo(() => {
    const months: { month: string; total: number }[] = [];
    const [curY, curM] = selectedMonth.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      let y = curY;
      let m = curM - i;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const total = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((sum, e) => sum + e.amount, 0);
      months.push({ month: key, total });
    }
    return months;
  }, [expenses, selectedMonth]);

  const dailyAverage = useMemo(() => {
    if (monthlyExpenses.length === 0) return 0;
    const uniqueDays = new Set(monthlyExpenses.map((e) => e.date)).size;
    return uniqueDays > 0 ? Math.round(monthlyTotal / uniqueDays) : 0;
  }, [monthlyExpenses, monthlyTotal]);

  const topCategory = useMemo((): ExpenseCategory | null => {
    let max = 0;
    let top: ExpenseCategory | null = null;
    for (const [cat, amount] of Object.entries(categoryBreakdown)) {
      if (amount > max) {
        max = amount;
        top = cat as ExpenseCategory;
      }
    }
    return top;
  }, [categoryBreakdown]);

  return {
    expenses,
    budgets,
    loading,
    selectedMonth,
    setSelectedMonth,
    addExpense,
    deleteExpense,
    setBudget,
    // 파생 데이터
    monthlyExpenses,
    monthlyTotal,
    currentBudget,
    categoryBreakdown,
    dailyTotals,
    monthlyTrend,
    dailyAverage,
    topCategory,
  };
}
