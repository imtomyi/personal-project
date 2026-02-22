"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toDateStr, nowKST } from "@/lib/date";

/**
 * 미완료 일일 계획을 오늘로 자동 이월하는 훅.
 *
 * 페이지 로드 시 하루 1회 실행:
 * 1. 과거 daily_plans 중 미완료 + 미스킵인 것 조회
 * 2. 해당 todo가 아직 is_completed=false이고 오늘 계획에 없으면 이월
 * 3. upsert로 UNIQUE(todo_id, date) 제약 안전하게 처리
 */
export function useCarryOverPlans() {
  const { user } = useAuth();
  const supabase = createClient();
  const [carriedOverCount, setCarriedOverCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) {
      setIsProcessing(false);
      return;
    }

    const todayStr = toDateStr(nowKST());
    try {
      if (localStorage.getItem("carry_over_done_date") === todayStr) {
        setIsProcessing(false);
        return;
      }
    } catch {
      setIsProcessing(false);
      return;
    }

    ran.current = true;

    async function run() {
      // 1. 과거 미완료 플랜 조회 (todo inner join으로 is_completed 필터)
      const { data: pastPlans, error: fetchError } = await supabase
        .from("daily_plans")
        .select(
          "todo_id, estimated_minutes, todos!inner(id, is_completed)",
        )
        .eq("user_id", user!.id)
        .lt("date", todayStr)
        .eq("is_skipped", false)
        .gt("estimated_minutes", 0)
        .eq("todos.is_completed", false);

      if (fetchError || !pastPlans || pastPlans.length === 0) {
        try {
          localStorage.setItem("carry_over_done_date", todayStr);
        } catch {
          /* ignore */
        }
        setIsProcessing(false);
        return;
      }

      // 2. 오늘 이미 등록된 플랜 확인
      const { data: todayPlans } = await supabase
        .from("daily_plans")
        .select("todo_id")
        .eq("user_id", user!.id)
        .eq("date", todayStr);

      const todayIds = new Set(
        (todayPlans ?? []).map(
          (p: { todo_id: string }) => p.todo_id,
        ),
      );

      // 3. 이월 대상 필터 (중복 제거: 같은 todo가 여러 날에 있을 수 있음)
      const seen = new Set<string>();
      const toCarry: { todoId: string; minutes: number }[] = [];
      for (const p of pastPlans) {
        const todoId = p.todo_id as string;
        if (todayIds.has(todoId) || seen.has(todoId)) continue;
        seen.add(todoId);
        toCarry.push({
          todoId,
          minutes: p.estimated_minutes as number,
        });
      }

      if (toCarry.length === 0) {
        try {
          localStorage.setItem("carry_over_done_date", todayStr);
        } catch {
          /* ignore */
        }
        setIsProcessing(false);
        return;
      }

      // 4. 오늘로 이월 (upsert)
      const rows = toCarry.map((c, i) => ({
        user_id: user!.id,
        todo_id: c.todoId,
        date: todayStr,
        estimated_minutes: c.minutes,
        sort_order: i,
        is_skipped: false,
      }));

      await supabase
        .from("daily_plans")
        .upsert(rows, { onConflict: "todo_id,date" });

      setCarriedOverCount(toCarry.length);
      try {
        localStorage.setItem("carry_over_done_date", todayStr);
      } catch {
        /* ignore */
      }
      setIsProcessing(false);
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { carriedOverCount, isProcessing };
}
