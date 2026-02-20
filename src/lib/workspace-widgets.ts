// ============================================
// 워크스페이스 위젯 타입 & 설정
// ============================================

export type WsWidgetId = "exercise" | "dday";

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
// D-Day types
// ============================================
export type DdayEntry = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  emoji: string;
  color: string; // tailwind color class
};

// ============================================
// localStorage keys
// ============================================
export const WS_WIDGET_STORAGE_KEY = "ws_widget_config";
export const EXERCISE_STORAGE_KEY = "ws_exercise_data";
export const DDAY_STORAGE_KEY = "ws_dday_data";
