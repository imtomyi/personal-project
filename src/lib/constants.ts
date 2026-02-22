/**
 * 앱 전역 상수
 * 여러 파일에서 반복되는 값들을 한 곳에서 관리
 */

// ============================================
// 날짜 / 시간
// ============================================

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** DB의 duration_days 컬럼 기본값 (시간 단위, 24 = 1일) */
export const DEFAULT_DURATION_HOURS = 24;

export const DURATION_PRESETS = [
  { label: "1시간", value: 1 },
  { label: "3시간", value: 3 },
  { label: "8시간", value: 8 },
  { label: "1일", value: 24 },
  { label: "3일", value: 72 },
  { label: "1주", value: 168 },
  { label: "1달", value: 720 },
] as const;

// ============================================
// D-Day 색상 / 이모지
// ============================================

export const DDAY_COLOR_OPTIONS = [
  { label: "파랑", value: "blue", bg: "bg-blue-500", light: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  { label: "빨강", value: "red", bg: "bg-red-500", light: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  { label: "보라", value: "purple", bg: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
  { label: "초록", value: "emerald", bg: "bg-emerald-500", light: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  { label: "주황", value: "amber", bg: "bg-amber-500", light: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
  { label: "분홍", value: "rose", bg: "bg-rose-500", light: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400" },
] as const;

/** WorkspaceCalendar에서 D-Day 이벤트 렌더링에 사용 (약간 높은 opacity /40) */
export const DDAY_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400" },
  red: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-400" },
};

export const DDAY_EMOJI_OPTIONS = ["📌", "🎓", "✈️", "💍", "🏆", "🎂", "🎄", "🏠", "💼", "🎯", "⭐", "❤️"] as const;

// ============================================
// KHU 바로가기 링크
// ============================================

export const KHU_QUICK_LINKS = [
  { label: "Info21", url: "https://portal.khu.ac.kr", emoji: "🖥️" },
  { label: "LearningX", url: "https://khcanvas.khu.ac.kr", emoji: "📖" },
  { label: "도서관", url: "https://library.khu.ac.kr", emoji: "📚" },
  { label: "학사공지", url: "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200072", emoji: "📢" },
  { label: "생협", url: "https://khucoop.com", emoji: "🍽️" },
  { label: "셔틀 예매", url: "https://sites.google.com/dongyeongtour.co.kr/khu/main", emoji: "🚌" },
] as const;

// ============================================
// 일일 계획 세션 시간 프리셋 (분 단위)
// ============================================

export const SESSION_DURATION_PRESETS = [
  { label: "10분", value: 10 },
  { label: "20분", value: 20 },
  { label: "30분", value: 30 },
  { label: "45분", value: 45 },
  { label: "1시간", value: 60 },
  { label: "1.5시간", value: 90 },
  { label: "2시간", value: 120 },
] as const;

// ============================================
// 반복 주기 옵션 (루틴 관리 공통)
// ============================================

export const RECURRENCE_OPTIONS = [
  { key: "daily", label: "매일" },
  { key: "weekdays", label: "평일" },
  { key: "weekly", label: "매주" },
  { key: "custom", label: "사용자 지정" },
] as const;

// ============================================
// 과제 유형별 예상 소요시간 (시간 단위)
// ============================================

export const ASSIGNMENT_EFFORT_HOURS: Record<string, number> = {
  exam: 4,
  assignment: 2,
  quiz: 1,
  project: 3,
  other: 1,
};
