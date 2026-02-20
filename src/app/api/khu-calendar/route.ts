import { NextResponse } from "next/server";

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  month: number;
};

// 2025학년도 경희대학교 공식 학사일정
// 출처: https://cls.khu.ac.kr/cls/user/contents/view.do?menuNo=11600124 (1학기)
//       https://cls.khu.ac.kr/cls/user/contents/view.do?menuNo=11600125 (2학기)
const ACADEMIC_EVENTS: CalendarEvent[] = [
  // ── 1학기 (2025년 3월 ~ 8월) ──
  { id: "s1-01", title: "삼일절 / 학기 개시일", startDate: "2025-03-01", endDate: null, month: 3 },
  { id: "s1-02", title: "삼일절 대체휴일", startDate: "2025-03-03", endDate: null, month: 3 },
  { id: "s1-03", title: "1학기 개강", startDate: "2025-03-04", endDate: null, month: 3 },
  { id: "s1-04", title: "수강신청 확인 및 정정", startDate: "2025-03-04", endDate: "2025-03-10", month: 3 },
  { id: "s1-05", title: "학점포기 신청", startDate: "2025-03-18", endDate: "2025-03-24", month: 3 },
  { id: "s1-06", title: "휴학신청 마감", startDate: "2025-03-21", endDate: null, month: 3 },
  { id: "s1-07", title: "수강학점철회 신청", startDate: "2025-03-25", endDate: "2025-03-31", month: 3 },
  { id: "s1-08", title: "전공 및 트랙 신청", startDate: "2025-04-07", endDate: "2025-04-11", month: 4 },
  { id: "s1-09", title: "1학기 중간시험", startDate: "2025-04-22", endDate: "2025-04-28", month: 4 },
  { id: "s1-10", title: "1학기 중간 강의평가", startDate: "2025-04-29", endDate: "2025-05-05", month: 4 },
  { id: "s1-11", title: "어린이날 / 부처님오신날", startDate: "2025-05-05", endDate: null, month: 5 },
  { id: "s1-12", title: "어린이날·석탄일 대체휴일", startDate: "2025-05-06", endDate: null, month: 5 },
  { id: "s1-13", title: "개교기념일 (76주년)", startDate: "2025-05-18", endDate: null, month: 5 },
  { id: "s1-14", title: "1학기 기말 강의평가", startDate: "2025-06-03", endDate: "2025-06-23", month: 6 },
  { id: "s1-15", title: "현충일", startDate: "2025-06-06", endDate: null, month: 6 },
  { id: "s1-16", title: "1학기 기말시험", startDate: "2025-06-17", endDate: "2025-06-23", month: 6 },
  { id: "s1-17", title: "여름방학", startDate: "2025-06-24", endDate: "2025-08-31", month: 6 },
  { id: "s1-18", title: "1학기 성적 공시 및 정정", startDate: "2025-07-02", endDate: "2025-07-04", month: 7 },
  { id: "s1-19", title: "하계 계절학기", startDate: "2025-06-24", endDate: "2025-07-14", month: 6 },
  { id: "s1-20", title: "2학기 수강희망과목담기", startDate: "2025-07-14", endDate: "2025-07-18", month: 7 },
  { id: "s1-21", title: "2학기 복학 신청", startDate: "2025-07-15", endDate: "2025-07-24", month: 7 },
  { id: "s1-22", title: "하계 집중휴무", startDate: "2025-07-28", endDate: "2025-08-01", month: 7 },
  { id: "s1-23", title: "2학기 수강신청", startDate: "2025-08-05", endDate: "2025-08-12", month: 8 },
  { id: "s1-24", title: "2학기 휴학 신청", startDate: "2025-08-05", endDate: "2025-08-18", month: 8 },
  { id: "s1-25", title: "광복절", startDate: "2025-08-15", endDate: null, month: 8 },
  { id: "s1-26", title: "2학기 등록", startDate: "2025-08-19", endDate: "2025-08-26", month: 8 },

  // ── 2학기 (2025년 9월 ~ 2026년 2월) ──
  { id: "s2-01", title: "2학기 개강", startDate: "2025-09-01", endDate: null, month: 9 },
  { id: "s2-02", title: "수강신청 확인 및 정정", startDate: "2025-09-01", endDate: "2025-09-05", month: 9 },
  { id: "s2-03", title: "학점포기 신청", startDate: "2025-09-18", endDate: "2025-09-24", month: 9 },
  { id: "s2-04", title: "휴학신청 마감", startDate: "2025-09-22", endDate: null, month: 9 },
  { id: "s2-05", title: "수강학점철회 신청", startDate: "2025-09-22", endDate: "2025-09-26", month: 9 },
  { id: "s2-06", title: "개천절", startDate: "2025-10-03", endDate: null, month: 10 },
  { id: "s2-07", title: "추석 연휴", startDate: "2025-10-05", endDate: "2025-10-08", month: 10 },
  { id: "s2-08", title: "한글날", startDate: "2025-10-09", endDate: null, month: 10 },
  { id: "s2-09", title: "전공 및 트랙 신청", startDate: "2025-10-13", endDate: "2025-10-17", month: 10 },
  { id: "s2-10", title: "2학기 중간시험", startDate: "2025-10-20", endDate: "2025-10-24", month: 10 },
  { id: "s2-11", title: "2학기 중간 강의평가", startDate: "2025-10-27", endDate: "2025-10-31", month: 10 },
  { id: "s2-12", title: "2학기 기말 강의평가", startDate: "2025-12-01", endDate: "2025-12-19", month: 12 },
  { id: "s2-13", title: "2학기 기말시험", startDate: "2025-12-15", endDate: "2025-12-19", month: 12 },
  { id: "s2-14", title: "동계 계절학기", startDate: "2025-12-22", endDate: "2026-01-13", month: 12 },
  { id: "s2-15", title: "겨울방학", startDate: "2025-12-22", endDate: "2026-02-28", month: 12 },
  { id: "s2-16", title: "성탄절", startDate: "2025-12-25", endDate: null, month: 12 },
  { id: "s2-17", title: "2학기 성적 공시 및 정정", startDate: "2025-12-30", endDate: "2026-01-02", month: 12 },
  { id: "s2-18", title: "신정", startDate: "2026-01-01", endDate: null, month: 1 },
  { id: "s2-19", title: "1학기 전과 신청", startDate: "2026-01-06", endDate: "2026-01-12", month: 1 },
  { id: "s2-20", title: "1학기 수강희망과목담기", startDate: "2026-01-12", endDate: "2026-01-16", month: 1 },
  { id: "s2-21", title: "1학기 복학 신청", startDate: "2026-01-12", endDate: "2026-01-21", month: 1 },
  { id: "s2-22", title: "동계 집중휴무", startDate: "2026-01-26", endDate: "2026-01-30", month: 1 },
  { id: "s2-23", title: "1학기 휴학 신청", startDate: "2026-02-02", endDate: "2026-02-13", month: 2 },
  { id: "s2-24a", title: "수강신청 (4학년)", startDate: "2026-02-03", endDate: null, month: 2 },
  { id: "s2-24b", title: "수강신청 (3학년)", startDate: "2026-02-04", endDate: null, month: 2 },
  { id: "s2-24c", title: "수강신청 (2학년)", startDate: "2026-02-05", endDate: null, month: 2 },
  { id: "s2-24d", title: "수강신청 (1학년)", startDate: "2026-02-06", endDate: null, month: 2 },
  { id: "s2-24e", title: "수강신청 (다전공)", startDate: "2026-02-09", endDate: null, month: 2 },
  { id: "s2-25", title: "1학기 등록", startDate: "2026-02-13", endDate: "2026-02-24", month: 2 },
  { id: "s2-26", title: "설 연휴", startDate: "2026-02-16", endDate: "2026-02-18", month: 2 },
  { id: "s2-27", title: "학위수여식", startDate: "2026-02-25", endDate: null, month: 2 },

  // ══════════════════════════════════════════════
  // 2026학년도 경희대학교 공식 학사일정
  // 출처: https://com.khu.ac.kr/khsma/user/bbs/BMSR00040/view.do?boardId=524809
  // ══════════════════════════════════════════════

  // ── 2026학년도 1학기 (2026년 3월 ~ 8월) ──
  { id: "n1-01", title: "삼일절 / 학기 개시일", startDate: "2026-03-01", endDate: null, month: 3 },
  { id: "n1-02", title: "삼일절 대체휴일", startDate: "2026-03-02", endDate: null, month: 3 },
  { id: "n1-03", title: "1학기 개강", startDate: "2026-03-03", endDate: null, month: 3 },
  { id: "n1-04", title: "수강신청 확인 및 정정", startDate: "2026-03-03", endDate: "2026-03-09", month: 3 },
  { id: "n1-05", title: "1학기 중간시험", startDate: "2026-04-21", endDate: "2026-04-27", month: 4 },
  { id: "n1-06", title: "1학기 중간 강의평가", startDate: "2026-04-28", endDate: "2026-05-04", month: 4 },
  { id: "n1-07", title: "어린이날", startDate: "2026-05-05", endDate: null, month: 5 },
  { id: "n1-08", title: "개교기념일 (77주년)", startDate: "2026-05-18", endDate: null, month: 5 },
  { id: "n1-09", title: "부처님오신날", startDate: "2026-05-24", endDate: null, month: 5 },
  { id: "n1-10", title: "부처님오신날 대체휴일", startDate: "2026-05-25", endDate: null, month: 5 },
  { id: "n1-11", title: "1학기 기말 강의평가", startDate: "2026-06-02", endDate: "2026-06-22", month: 6 },
  { id: "n1-11b", title: "지방선거일", startDate: "2026-06-03", endDate: null, month: 6 },
  { id: "n1-12", title: "현충일", startDate: "2026-06-06", endDate: null, month: 6 },
  { id: "n1-13", title: "1학기 기말시험", startDate: "2026-06-16", endDate: "2026-06-22", month: 6 },
  { id: "n1-14", title: "여름방학", startDate: "2026-06-23", endDate: "2026-08-31", month: 6 },
  { id: "n1-14b", title: "제헌절", startDate: "2026-07-17", endDate: null, month: 7 },
  { id: "n1-15", title: "하계 집중휴무", startDate: "2026-07-27", endDate: "2026-07-31", month: 7 },
  { id: "n1-16", title: "2학기 수강신청", startDate: "2026-08-05", endDate: "2026-08-12", month: 8 },
  { id: "n1-17", title: "광복절", startDate: "2026-08-15", endDate: null, month: 8 },
  { id: "n1-18", title: "광복절 대체휴일", startDate: "2026-08-17", endDate: null, month: 8 },
  { id: "n1-19", title: "학위수여식", startDate: "2026-08-19", endDate: null, month: 8 },

  // ── 2026학년도 2학기 (2026년 9월 ~ 2027년 2월) ──
  { id: "n2-01", title: "2학기 개강", startDate: "2026-09-01", endDate: null, month: 9 },
  { id: "n2-02", title: "수강신청 확인 및 정정", startDate: "2026-09-01", endDate: "2026-09-07", month: 9 },
  { id: "n2-03", title: "추석 연휴", startDate: "2026-09-24", endDate: "2026-09-26", month: 9 },
  { id: "n2-04", title: "개천절", startDate: "2026-10-03", endDate: null, month: 10 },
  { id: "n2-05", title: "개천절 대체휴일", startDate: "2026-10-05", endDate: null, month: 10 },
  { id: "n2-06", title: "한글날", startDate: "2026-10-09", endDate: null, month: 10 },
  { id: "n2-07", title: "2학기 중간시험", startDate: "2026-10-20", endDate: "2026-10-26", month: 10 },
  { id: "n2-08", title: "2학기 중간 강의평가", startDate: "2026-10-27", endDate: "2026-11-02", month: 10 },
  { id: "n2-09", title: "2학기 기말 강의평가", startDate: "2026-12-01", endDate: "2026-12-21", month: 12 },
  { id: "n2-10", title: "2학기 기말시험", startDate: "2026-12-15", endDate: "2026-12-21", month: 12 },
  { id: "n2-11", title: "겨울방학", startDate: "2026-12-22", endDate: "2027-02-28", month: 12 },
  { id: "n2-12", title: "성탄절", startDate: "2026-12-25", endDate: null, month: 12 },
  { id: "n2-13", title: "1학기 수강신청", startDate: "2027-02-03", endDate: "2027-02-11", month: 2 },
  { id: "n2-14", title: "학위수여식", startDate: "2027-02-17", endDate: null, month: 2 },
];

export async function GET() {
  return NextResponse.json({ events: ACADEMIC_EVENTS, source: "verified" });
}
