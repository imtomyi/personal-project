"use client";

import type { WidgetId, WidgetMeta } from "@/lib/types";
import { useGenericWidgetConfig } from "./useGenericWidgetConfig";

const STORAGE_KEY = "khu_widget_config";

// 위젯 메타데이터 — 사용 가능한 모든 위젯
export const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: "calendar", label: "학사일정", emoji: "📅", description: "월별 캘린더 + 학사일정" },
  { id: "shuttle", label: "셔틀버스", emoji: "🚌", description: "캠퍼스간 셔틀 시간표" },
  { id: "meals", label: "학식 메뉴", emoji: "🍽️", description: "오늘의 학식 메뉴" },
  { id: "canvas", label: "LearningX", emoji: "🎓", description: "Canvas 과제·수업 연동" },
];

export function useWidgetConfig() {
  return useGenericWidgetConfig<WidgetId>({
    storageKey: STORAGE_KEY,
    registry: WIDGET_REGISTRY,
  });
}
