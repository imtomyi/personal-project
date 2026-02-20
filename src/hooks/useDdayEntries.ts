"use client";

import { useState, useEffect, useCallback } from "react";
import type { DdayEntry } from "@/lib/workspace-widgets";
import { DDAY_STORAGE_KEY } from "@/lib/workspace-widgets";

function loadDdayData(): DdayEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DDAY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * D-Day 데이터를 localStorage에서 읽고, 변경 시 자동 동기화하는 훅.
 * DdayWidget과 WorkspaceCalendar 양쪽에서 같은 데이터를 공유할 수 있게 해줌.
 */
export function useDdayEntries() {
  const [entries, setEntries] = useState<DdayEntry[]>([]);

  const refresh = useCallback(() => {
    setEntries(loadDdayData());
  }, []);

  useEffect(() => {
    // 초기 로드
    refresh();

    // 같은 탭 내 storage 변경 감지 (커스텀 이벤트)
    function handleStorage(e: StorageEvent) {
      if (e.key === DDAY_STORAGE_KEY || e.key === null) {
        refresh();
      }
    }

    // 다른 탭에서의 변경
    window.addEventListener("storage", handleStorage);
    // 같은 탭 내에서의 변경 (커스텀 이벤트)
    window.addEventListener("dday-updated", refresh);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("dday-updated", refresh);
    };
  }, [refresh]);

  return entries;
}
