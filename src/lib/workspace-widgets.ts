// ============================================
// 워크스페이스 위젯 타입 & 설정
// ============================================

export type WsWidgetId = "exercise" | "dday" | "habit" | "goals" | "daily-schedule"; // daily-schedule는 더 이상 위젯으로 사용하지 않지만 호환성 유지

export type WsWidgetConfig = {
  id: WsWidgetId;
  visible: boolean;
  order: number;
};

export type WsWidgetMeta = {
  id: WsWidgetId;
  label: string;
  emoji: string;
  description: string;
};

export const WS_WIDGET_REGISTRY: WsWidgetMeta[] = [
  { id: "exercise", label: "운동 세션", emoji: "💪", description: "오늘의 운동 기록 및 루틴 관리" },
  { id: "dday", label: "디데이", emoji: "📌", description: "중요한 날까지 카운트다운" },
  { id: "habit", label: "루틴 트래커", emoji: "✅", description: "매일 루틴 체크 및 연속 달성 추적" },
  { id: "goals", label: "목표", emoji: "🎯", description: "목표 설정 및 진행도 관리" },
  { id: "daily-schedule", label: "오늘 시간표", emoji: "📅", description: "반복 일정 + 수업 + 자동 공부 배분" },
];

// ============================================
// Exercise types
// ============================================
export type ExerciseType = "cardio" | "strength" | "flexibility" | "sports" | "other";

export type ExerciseEntry = {
  id: string;
  name: string;
  type: ExerciseType;
  durationMin: number;
  caloriesBurned?: number;
  sets?: number;
  reps?: number;
  memo?: string;
  completedAt: string; // ISO date
};

export type ExerciseDay = {
  date: string; // "YYYY-MM-DD"
  entries: ExerciseEntry[];
};

// ============================================
// localStorage keys
// ============================================
export const WS_WIDGET_STORAGE_KEY = "ws_widget_config";
export const EXERCISE_STORAGE_KEY = "ws_exercise_data";
export const DDAY_STORAGE_KEY = "ws_dday_data";
