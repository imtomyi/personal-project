/**
 * 한국 공휴일 데이터 (2025–2027)
 * 음력 기반 공휴일은 연도별로 하드코딩
 */

type HolidayEntry = { date: string; name: string };

// ── 고정 공휴일 ──
const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: "신정" },
  { month: 3, day: 1, name: "삼일절" },
  { month: 5, day: 5, name: "어린이날" },
  { month: 6, day: 6, name: "현충일" },
  { month: 8, day: 15, name: "광복절" },
  { month: 10, day: 3, name: "개천절" },
  { month: 10, day: 9, name: "한글날" },
  { month: 12, day: 25, name: "크리스마스" },
];

// ── 음력 기반 공휴일 (연도별) ──
const LUNAR_HOLIDAYS: Record<number, HolidayEntry[]> = {
  2025: [
    { date: "2025-01-28", name: "설날 연휴" },
    { date: "2025-01-29", name: "설날" },
    { date: "2025-01-30", name: "설날 연휴" },
    { date: "2025-05-05", name: "부처님오신날" }, // 어린이날과 겹침
    { date: "2025-10-05", name: "추석 연휴" },
    { date: "2025-10-06", name: "추석" },
    { date: "2025-10-07", name: "추석 연휴" },
  ],
  2026: [
    { date: "2026-02-16", name: "설날 연휴" },
    { date: "2026-02-17", name: "설날" },
    { date: "2026-02-18", name: "설날 연휴" },
    { date: "2026-05-24", name: "부처님오신날" },
    { date: "2026-09-24", name: "추석 연휴" },
    { date: "2026-09-25", name: "추석" },
    { date: "2026-09-26", name: "추석 연휴" },
  ],
  2027: [
    { date: "2027-02-06", name: "설날 연휴" },
    { date: "2027-02-07", name: "설날" },
    { date: "2027-02-08", name: "설날 연휴" },
    { date: "2027-05-13", name: "부처님오신날" },
    { date: "2027-10-14", name: "추석 연휴" },
    { date: "2027-10-15", name: "추석" },
    { date: "2027-10-16", name: "추석 연휴" },
  ],
};

// ── 대체공휴일 (연도별 확정분) ──
const SUBSTITUTE_HOLIDAYS: Record<number, HolidayEntry[]> = {
  2025: [
    { date: "2025-03-03", name: "대체공휴일 (삼일절)" },
    { date: "2025-05-06", name: "대체공휴일 (어린이날/부처님오신날)" },
    { date: "2025-10-08", name: "대체공휴일 (추석)" },
  ],
  2026: [
    { date: "2026-02-19", name: "대체공휴일 (설날)" },
    { date: "2026-08-17", name: "대체공휴일 (광복절)" },
    { date: "2026-09-27", name: "대체공휴일 (추석)" },
    { date: "2026-10-05", name: "대체공휴일 (개천절)" },
  ],
  2027: [
    { date: "2027-02-09", name: "대체공휴일 (설날)" },
    { date: "2027-05-14", name: "대체공휴일 (부처님오신날)" },
    { date: "2027-10-11", name: "대체공휴일 (한글날)" },
    { date: "2027-10-17", name: "대체공휴일 (추석)" },
  ],
};

/** 특정 연도의 공휴일 Map 생성 (date → name) */
function buildHolidayMap(year: number): Map<string, string> {
  const map = new Map<string, string>();

  // 고정 공휴일
  for (const h of FIXED_HOLIDAYS) {
    const m = String(h.month).padStart(2, "0");
    const d = String(h.day).padStart(2, "0");
    map.set(`${year}-${m}-${d}`, h.name);
  }

  // 음력 공휴일
  for (const h of LUNAR_HOLIDAYS[year] ?? []) {
    map.set(h.date, h.name);
  }

  // 대체공휴일
  for (const h of SUBSTITUTE_HOLIDAYS[year] ?? []) {
    map.set(h.date, h.name);
  }

  return map;
}

// ── 캐시 ──
const cache = new Map<number, Map<string, string>>();

/** 특정 날짜가 공휴일인지 확인. 공휴일이면 이름 반환, 아니면 null */
export function getHolidayName(dateStr: string): string | null {
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (!cache.has(year)) {
    cache.set(year, buildHolidayMap(year));
  }
  return cache.get(year)!.get(dateStr) ?? null;
}

/** 특정 날짜가 공휴일인지 boolean */
export function isHoliday(dateStr: string): boolean {
  return getHolidayName(dateStr) !== null;
}
