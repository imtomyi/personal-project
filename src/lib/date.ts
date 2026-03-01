/**
 * KST (한국 표준시) 날짜 유틸리티
 * 사이트 전체에서 일관된 KST 기반 날짜 처리를 위한 헬퍼
 */

import { WEEKDAY_LABELS, DEFAULT_DURATION_HOURS } from "./constants";

const KST_TIMEZONE = "Asia/Seoul";

/** "YYYY-MM-DD" → 로컬 Date (UTC 파싱 방지) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 현재 KST 기준 Date 반환
 * UTC+9 산술 방식 사용 (toLocaleString 파싱보다 안정적)
 * 한국은 DST가 없으므로 항상 UTC+9 고정
 */
export function nowKST(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const kstMs = utcMs + 9 * 3600000;
  return new Date(kstMs);
}

/** 오늘 KST 날짜 "YYYY-MM-DD" */
export function todayKST(): string {
  const d = nowKST();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** KST 기준 "M/D" 포맷 */
export function fmtMD(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** KST 기준 간결한 날짜 포맷: "2/15 (토)" */
export function fmtDateKST(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABELS[d.getDay()]})`;
}

/** 두 Date가 같은 날인지 비교 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** date가 start~end 범위 안에 있는지 (end가 null이면 start와 같은 날인지) */
export function isInRange(date: Date, start: Date, end: Date | null): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  if (!end) return d.getTime() === s.getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

/** "YYYY-MM-DD" 포맷으로 Date→string */
export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * duration_days(시간 단위) → 일수 변환
 * DB의 duration_days 컬럼은 시간 단위 (24 = 1일, 72 = 3일, 168 = 1주)
 */
export function getDurationInDays(durationHours: number | null | undefined): number {
  return Math.max(1, Math.ceil((durationHours || DEFAULT_DURATION_HOURS) / 24));
}

/**
 * 시작일(due_date) + duration → 마감일 Date 계산
 * due_date = 시작일, 마감일 = 시작일 + ceil(duration/24) - 1
 */
export function getDeadlineDate(dueDate: string, durationHours: number | null | undefined): Date {
  const start = parseLocalDate(dueDate);
  const days = getDurationInDays(durationHours);
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + days - 1);
  return deadline;
}

/** 시간 → 한국어 기간 포맷: "3시간", "2일", "1주", "1달" */
export function formatDuration(hours: number): string {
  if (hours <= 0) return "1시간";
  if (hours < 24) return `${hours}시간`;
  if (hours === 24) return "1일";
  if (hours < 168) {
    const days = Math.round(hours / 24);
    return `${days}일`;
  }
  if (hours === 168) return "1주";
  if (hours < 720) {
    const weeks = Math.round(hours / 168);
    return `${weeks}주`;
  }
  if (hours === 720) return "1달";
  const months = Math.round(hours / 720);
  return `${months}달`;
}

/** 시간 → 짧은 영문 기간 포맷: "3h", "2d", "1w", "1mo" */
export function formatDurationShort(hours: number): string {
  if (hours < 24) return `${hours}h`;
  if (hours < 168) return `${Math.round(hours / 24)}d`;
  if (hours < 720) return `${Math.round(hours / 168)}w`;
  return `${Math.round(hours / 720)}mo`;
}

// ============================================
// 자연어 날짜 파싱 (한국어)
// ============================================

/** 요일 이름 → getDay() 인덱스 매핑 (일=0, 월=1, ... 토=6) */
const WEEKDAY_MAP: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};

/** 요일 full names */
const WEEKDAY_FULL: Record<string, number> = {
  일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6,
};

/**
 * 한국어 자연어 날짜 파싱
 *
 * 지원 패턴:
 * - "오늘" → 오늘
 * - "내일" → 내일
 * - "모레" / "모래" → 모레
 * - "N일 후" / "N일후" / "N일 뒤" → N일 후
 * - "다음주" / "다음 주" (요일 없이) → 다음 월요일
 * - "다음주 월요일" / "다음주 월" → 다음주 해당 요일
 * - "이번주 금요일" → 이번주 해당 요일
 * - "금요일" / "금" → 이번 주 해당 요일 (오늘 이후 가장 가까운)
 */
export function parseNaturalDate(text: string): { cleaned: string; date: string | null } {
  const today = parseLocalDate(todayKST());
  const todayDay = today.getDay(); // 0=일, 1=월, ...

  // helper: add days to today
  function addDays(n: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  }

  // helper: get next occurrence of a weekday (>= today)
  function nextWeekday(target: number): string {
    let diff = target - todayDay;
    if (diff <= 0) diff += 7; // if today or past, go to next week
    return addDays(diff);
  }

  // helper: get weekday in next week (7 days from this week's start)
  function nextWeekWeekday(target: number): string {
    // "다음주 X요일" = this coming Monday's week + offset
    let daysUntilNextMonday = 1 - todayDay; // 1 = Monday
    if (daysUntilNextMonday <= 0) daysUntilNextMonday += 7;
    const diff = daysUntilNextMonday + ((target === 0 ? 7 : target) - 1);
    return addDays(diff);
  }

  // helper: get weekday in current week (이번주)
  function thisWeekWeekday(target: number): string {
    // 이번주의 해당 요일 (이미 지났어도 이번주)
    let diff = target - todayDay;
    // 이번주이므로 지났더라도 해당 날짜 반환, 하지만 과거면 다음주로
    if (diff < 0) diff += 7;
    return addDays(diff);
  }

  let cleaned = text;
  let date: string | null = null;

  // 1) "N일 후" / "N일후" / "N일 뒤"
  const nDaysMatch = cleaned.match(/(\d+)\s*일\s*(?:후|뒤)/);
  if (nDaysMatch) {
    const n = parseInt(nDaysMatch[1], 10);
    date = addDays(n);
    cleaned = cleaned.replace(nDaysMatch[0], "").trim();
    return { cleaned: cleaned || text, date };
  }

  // 2) "다음주 X요일" / "다음주 X" / "다음 주 X요일" / "다음 주 X"
  const nextWeekDayFullMatch = cleaned.match(/다음\s*주\s*([월화수목금토일])요일/);
  const nextWeekDayShortMatch = cleaned.match(/다음\s*주\s*([월화수목금토일])(?!요)/);
  const nwMatch = nextWeekDayFullMatch || nextWeekDayShortMatch;
  if (nwMatch) {
    const target = WEEKDAY_MAP[nwMatch[1]];
    if (target !== undefined) {
      date = nextWeekWeekday(target);
      cleaned = cleaned.replace(nwMatch[0], "").trim();
      return { cleaned: cleaned || text, date };
    }
  }

  // 3) "다음주" / "다음 주" (요일 없이) → 다음 월요일
  const nextWeekMatch = cleaned.match(/다음\s*주/);
  if (nextWeekMatch) {
    date = nextWeekWeekday(1); // 월요일
    cleaned = cleaned.replace(nextWeekMatch[0], "").trim();
    return { cleaned: cleaned || text, date };
  }

  // 4) "이번주 X요일" / "이번주 X"
  const thisWeekDayFullMatch = cleaned.match(/이번\s*주\s*([월화수목금토일])요일/);
  const thisWeekDayShortMatch = cleaned.match(/이번\s*주\s*([월화수목금토일])(?!요)/);
  const twMatch = thisWeekDayFullMatch || thisWeekDayShortMatch;
  if (twMatch) {
    const target = WEEKDAY_MAP[twMatch[1]];
    if (target !== undefined) {
      date = thisWeekWeekday(target);
      cleaned = cleaned.replace(twMatch[0], "").trim();
      return { cleaned: cleaned || text, date };
    }
  }

  // 5) "X요일" (full weekday name)
  for (const [name, idx] of Object.entries(WEEKDAY_FULL)) {
    if (cleaned.includes(name)) {
      date = nextWeekday(idx);
      cleaned = cleaned.replace(name, "").trim();
      return { cleaned: cleaned || text, date };
    }
  }

  // 6) standalone single-char weekday "금", "월", etc.
  //    Match only if it looks like a standalone weekday (not part of longer word)
  const singleDayMatch = cleaned.match(/(?:^|[\s])([월화수목금토일])(?:[\s]|$)/);
  if (singleDayMatch) {
    const target = WEEKDAY_MAP[singleDayMatch[1]];
    if (target !== undefined) {
      date = nextWeekday(target);
      cleaned = cleaned.replace(singleDayMatch[0], " ").trim();
      return { cleaned: cleaned || text, date };
    }
  }

  // 7) "모레" / "모래"
  if (cleaned.includes("모레") || cleaned.includes("모래")) {
    date = addDays(2);
    cleaned = cleaned.replace(/모[레래]/, "").trim();
    return { cleaned: cleaned || text, date };
  }

  // 8) "내일"
  if (cleaned.includes("내일")) {
    date = addDays(1);
    cleaned = cleaned.replace("내일", "").trim();
    return { cleaned: cleaned || text, date };
  }

  // 9) "오늘"
  if (cleaned.includes("오늘")) {
    date = toDateStr(today);
    cleaned = cleaned.replace("오늘", "").trim();
    return { cleaned: cleaned || text, date };
  }

  return { cleaned: text, date: null };
}

// ============================================
// 시간 ↔ 분 변환 유틸
// ============================================

/** "HH:MM" → 자정 기준 분 (예: "14:30" → 870) */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 자정 기준 분 → "HH:MM" (예: 870 → "14:30") */
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
