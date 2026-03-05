import type { Todo, RecurringTask, Assignment, CanvasCalendarEvent, AssignmentType, Habit, DailyPlan, DdayEntry, ScheduleBlockColor, CourseSchedule } from "@/lib/types";
import { ASSIGNMENT_EFFORT_HOURS } from "@/lib/constants";
import { toDateStr, parseLocalDate, timeToMinutes } from "@/lib/date";

// ============================================
// Types
// ============================================

export type ScheduleBlockType = "recurring" | "todo" | "empty" | "class" | "study" | "habit" | "dday";

export type ScheduleBlock = {
  id: string;
  title: string;
  startMin: number; // minutes from midnight (e.g., 540 = 9:00)
  endMin: number;
  type: ScheduleBlockType;
  color?: ScheduleBlockColor;
  todoId?: string;
  planId?: string; // daily_plans.id → 드래그 시 업데이트 대상 식별
  recurringTaskId?: string;
  assignmentId?: string; // study blocks → assignment 연결
  courseName?: string; // class/study 블록 표시용
  ddayEntryId?: string; // 디데이 항목 연결
  habitId?: string; // 습관 블록 → 완료 토글용
};

/** ICS 피드에서 파싱된 이벤트 (시간표 표시용) */
export type IcsScheduleEvent = {
  uid: string;
  summary: string;
  dtstart: string;     // ISO datetime or date
  dtend: string | null;
  allDay: boolean;
};

type ScheduleOptions = {
  classEvents?: CanvasCalendarEvent[];
  assignments?: Assignment[];
  dateStr?: string; // "YYYY-MM-DD"
  courseNames?: Map<string, string>; // context_code → course name
  habits?: Habit[]; // 시간 설정된 습관 → 시간표 블록
  courseSchedules?: CourseSchedule[]; // 수업 시간표 (course_schedules 테이블)
  icsEvents?: IcsScheduleEvent[]; // ICS 피드 이벤트
};


const SCHEDULE_START = 6 * 60; // 06:00
const SCHEDULE_END = 24 * 60; // 24:00

// ============================================
// 집중 가능 시간대 가중치
// ============================================

/**
 * 시간대별 집중 가능 확률 점수 (0~100).
 * 높을수록 해당 시간에 할 일을 우선 배치.
 *
 * 구간:
 *   06:00-08:00  →  15  (기상/준비, 대부분 수면 중)
 *   08:00-09:00  →  40  (출근/통학, 아침)
 *   09:00-12:00  → 100  (오전 골든타임)
 *   12:00-13:00  →  25  (점심시간)
 *   13:00-14:00  →  55  (점심 후 적응)
 *   14:00-17:00  →  90  (오후 집중시간)
 *   17:00-18:00  →  70  (오후 후반)
 *   18:00-19:30  →  30  (저녁시간)
 *   19:30-22:00  →  75  (야간 집중시간)
 *   22:00-24:00  →  20  (취침 준비)
 */
function getFocusScore(minuteOfDay: number): number {
  const h = minuteOfDay / 60;
  if (h < 8) return 15;
  if (h < 9) return 40;
  if (h < 12) return 100;
  if (h < 13) return 25;
  if (h < 14) return 55;
  if (h < 17) return 90;
  if (h < 18) return 70;
  if (h < 19.5) return 30;
  if (h < 22) return 75;
  return 20;
}

// ============================================
// Free Slots Helper
// ============================================

function findFreeSlots(
  existingBlocks: ScheduleBlock[],
): { start: number; end: number }[] {
  const occupiedSlots = existingBlocks
    .map((b) => ({ start: b.startMin, end: b.endMin }))
    .sort((a, b) => a.start - b.start);

  const freeSlots: { start: number; end: number }[] = [];
  let cursor = SCHEDULE_START;

  for (const occ of occupiedSlots) {
    if (cursor < occ.start) {
      freeSlots.push({ start: cursor, end: occ.start });
    }
    cursor = Math.max(cursor, occ.end);
  }
  if (cursor < SCHEDULE_END) {
    freeSlots.push({ start: cursor, end: SCHEDULE_END });
  }

  return freeSlots;
}

/**
 * 빈 슬롯을 집중 가능 시간대 점수 기준으로 정렬.
 * 같은 점수대면 시간순 유지.
 */
function findFreeSlotsRanked(
  existingBlocks: ScheduleBlock[],
): { start: number; end: number }[] {
  const raw = findFreeSlots(existingBlocks);

  // 큰 슬롯을 30분 단위 서브슬롯으로 분할해서 시간대별로 정확하게 점수 매기기
  const subSlots: { start: number; end: number; score: number }[] = [];
  for (const slot of raw) {
    let cursor = slot.start;
    while (cursor < slot.end) {
      // 같은 집중 점수 구간이 이어지는 끝 지점 찾기
      const currentScore = getFocusScore(cursor);
      let segEnd = cursor;
      while (segEnd < slot.end && getFocusScore(segEnd) === currentScore) {
        segEnd += 15;
      }
      segEnd = Math.min(segEnd, slot.end);
      if (segEnd > cursor) {
        subSlots.push({ start: cursor, end: segEnd, score: currentScore });
      }
      cursor = segEnd;
    }
  }

  // 집중 점수 높은 순 → 같으면 시간순
  subSlots.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.start - b.start;
  });

  return subSlots.map(({ start, end }) => ({ start, end }));
}

// ============================================
// 선호 시간 기반 최적 슬롯 탐색 (통합 스코어링)
// ============================================

/** 선호 시간 최대 탐색 범위 (분) — 이 범위 밖은 선호시간 무시하고 집중도 폴백 */
const PREFERRED_MAX_DISTANCE = 180; // 3시간

/**
 * 선호 시간 기반 최적 배치 슬롯 탐색 (통합 스코어링).
 *
 * 평가 기준 (가중 합산):
 *   1) 정확 매칭 보너스 — 선호 시간에 정확히 맞으면 최고점 (+30)
 *   2) 근접도 (proximity, 60%) — 선호 시간에 가까울수록 높은 점수
 *   3) 집중 점수 (focus, 20%) — 집중하기 좋은 시간대면 가산
 *   4) 방향 선호 (+5) — 선호 시간 직후 슬롯에 소폭 가산
 *      (예: 18:30 희망 → 19:00이 18:00보다 자연스러움)
 *
 * PREFERRED_MAX_DISTANCE(3시간) 밖의 슬롯은 후보에서 제외하여
 * 저녁 할일이 아침으로 밀리는 현상 방지.
 *
 * @returns 최적 시작 시점(분) 또는 null(3시간 내 적합 슬롯 없음)
 */
function findBestSlotForPreferred(
  freeSlots: { start: number; end: number }[],
  preferredStart: number,
  neededMin: number,
): number | null {
  let bestStart: number | null = null;
  let bestScore = -Infinity;

  for (const slot of freeSlots) {
    if (slot.end - slot.start < neededMin) continue;

    // 슬롯 내 가능 시작 범위: [slot.start, slot.end - neededMin]
    const latestStart = slot.end - neededMin;

    // 선호 시간에 가장 가까운 시작점 (클램핑)
    const candidateStart = Math.max(
      slot.start,
      Math.min(preferredStart, latestStart),
    );
    const distance = Math.abs(candidateStart - preferredStart);

    // 3시간 이상 떨어진 슬롯은 선호시간 배치 후보에서 제외
    if (distance > PREFERRED_MAX_DISTANCE) continue;

    // ── 스코어링 ──

    // 1. 정확 매칭 보너스: 사용자가 원한 시간 그대로 배치
    const exactBonus = distance === 0 ? 30 : 0;

    // 2. 근접도 점수 (0–100): 가까울수록 높음
    const proximityScore = 100 * (1 - distance / PREFERRED_MAX_DISTANCE);

    // 3. 집중 점수 (0–100): 해당 시간대의 집중도
    const focusScore = getFocusScore(candidateStart);

    // 4. 방향 가산: 선호 시간 이후 → 자연스러운 "뒤로 밀림"
    const afterBonus = candidateStart >= preferredStart ? 5 : 0;

    // 통합 점수: 근접도 60% + 집중도 20% + 보너스
    const score =
      proximityScore * 0.6 + focusScore * 0.2 + exactBonus + afterBonus;

    if (score > bestScore) {
      bestScore = score;
      bestStart = candidateStart;
    }
  }

  return bestStart;
}

// ============================================
// 1. Canvas 수업 블록 생성
// ============================================

function generateClassBlocks(
  classEvents: CanvasCalendarEvent[],
  dateStr: string,
  courseNames: Map<string, string>,
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];

  for (const event of classEvents) {
    if (!event.start_at || !event.end_at) continue;

    const eventStart = new Date(event.start_at);
    const eventDateStr = toDateStr(eventStart);
    if (eventDateStr !== dateStr) continue;

    const eventEnd = new Date(event.end_at);
    const startMin = eventStart.getHours() * 60 + eventStart.getMinutes();
    let endMin = eventEnd.getHours() * 60 + eventEnd.getMinutes();
    if (endMin <= startMin) endMin = startMin + 75; // default 75min class

    const courseName =
      courseNames.get(event.context_code) || event.title;

    blocks.push({
      id: `class-${event.id}`,
      title: courseName,
      startMin,
      endMin,
      type: "class",
      color: "indigo",
      courseName,
    });
  }

  return blocks;
}

// ============================================
// 1b. course_schedules 테이블 기반 수업 블록
// ============================================

function generateCourseScheduleBlocks(
  courseSchedules: CourseSchedule[],
  dayOfWeek: number,
): ScheduleBlock[] {
  return courseSchedules
    .filter((cs) => cs.day_of_week === dayOfWeek)
    .map((cs) => {
      const [sh, sm] = cs.time_start.split(":").map(Number);
      const [eh, em] = cs.time_end.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      return {
        id: `course-${cs.id}`,
        title: cs.course_name,
        startMin,
        endMin: endMin > startMin ? endMin : startMin + 75,
        type: "class" as const,
        color: "indigo" as const,
        courseName: cs.course_name,
      };
    });
}

// ============================================
// 1c. ICS 피드 이벤트 → 시간표 블록
// ============================================

/** Canvas 등에서 자정(T00:00:00)으로 내보내는 이벤트는 사실상 all-day */
function isEffectivelyAllDay(ev: IcsScheduleEvent): boolean {
  if (ev.allDay) return true;
  if (!ev.dtstart.includes("T")) return true;
  // T00:00:00 또는 T00:00:00Z → 자정 = 사실상 all-day (과제 마감일 등)
  return /T00:00:00Z?$/.test(ev.dtstart);
}

function generateIcsBlocks(
  icsEvents: IcsScheduleEvent[],
  dateStr: string,
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];

  for (const ev of icsEvents) {
    // all-day 또는 자정 이벤트는 시간표 블록 대신 배너로 표시
    if (isEffectivelyAllDay(ev)) continue;

    const start = new Date(ev.dtstart);
    const eventDateStr = toDateStr(start);
    if (eventDateStr !== dateStr) continue;

    const startMin = start.getHours() * 60 + start.getMinutes();
    let endMin = startMin + 60; // 기본 1시간
    if (ev.dtend) {
      const end = new Date(ev.dtend);
      endMin = end.getHours() * 60 + end.getMinutes();
      if (endMin <= startMin) endMin = startMin + 60;
    }

    blocks.push({
      id: `ics-${ev.uid}`,
      title: ev.summary,
      startMin,
      endMin,
      type: "class",
      color: "sky",
      courseName: ev.summary,
    });
  }

  return blocks;
}

/** ICS all-day 이벤트 (과제 마감, 시험 등) 중 특정 날짜 이벤트 반환 */
export type IcsAllDayEvent = {
  uid: string;
  summary: string;
  date: string; // YYYY-MM-DD
};

export function getIcsAllDayEvents(
  icsEvents: IcsScheduleEvent[],
  dateStr: string,
): IcsAllDayEvent[] {
  const results: IcsAllDayEvent[] = [];

  for (const ev of icsEvents) {
    // all-day 또는 자정 이벤트만 대상
    if (!isEffectivelyAllDay(ev)) continue;

    const eventDate = ev.dtstart.slice(0, 10); // "YYYY-MM-DD"
    if (eventDate === dateStr) {
      results.push({
        uid: ev.uid,
        summary: ev.summary,
        date: eventDate,
      });
    }
  }

  return results;
}

// ============================================
// 2. 과제/시험 공부 계획 산출
// ============================================

type StudyPlan = {
  assignmentId: string;
  assignmentTitle: string;
  courseName: string;
  totalHours: number;
  daysUntilDue: number;
  hoursPerDay: number;
  assignmentType: AssignmentType;
};

function computeStudyPlans(
  assignments: Assignment[],
  todayStr: string,
): StudyPlan[] {
  if (!assignments || assignments.length === 0) return [];

  const todayMs = parseLocalDate(todayStr).getTime();

  return assignments
    .filter((a) => !a.is_completed && a.due_date)
    .map((a) => {
      const dueMs = new Date(a.due_date + "T23:59:59").getTime();
      const daysUntilDue = Math.max(
        1,
        Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24)),
      );
      const totalHours =
        ASSIGNMENT_EFFORT_HOURS[a.type] ??
        ASSIGNMENT_EFFORT_HOURS.other ??
        1;
      const hoursPerDay = Math.min(
        Math.max(0.5, totalHours / daysUntilDue),
        3, // 일일 최대 3시간/과제 캡
      );

      return {
        assignmentId: a.id,
        assignmentTitle: a.title,
        courseName: a.course?.name ?? "",
        totalHours,
        daysUntilDue,
        hoursPerDay,
        assignmentType: a.type,
      };
    })
    .filter((p) => p.daysUntilDue > 0 && p.daysUntilDue <= 14) // 2주 이내만
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue); // 마감 임박 순
}

// ============================================
// 3. 공부 블록 자동 배치
// ============================================

function generateStudyBlocks(
  studyPlans: StudyPlan[],
  existingBlocks: ScheduleBlock[],
): ScheduleBlock[] {
  const MIN_BLOCK_MINUTES = 30;
  const MAX_BLOCK_MINUTES = 90;

  const studyBlocks: ScheduleBlock[] = [];
  const tempBlocks = [...existingBlocks];

  for (const plan of studyPlans) {
    let remainingMin = Math.round(plan.hoursPerDay * 60);

    while (remainingMin >= MIN_BLOCK_MINUTES) {
      // 매번 현재 블록 상태 기준으로 집중 시간대 우선 빈 슬롯 탐색
      tempBlocks.sort((a, b) => a.startMin - b.startMin);
      const rankedSlots = findFreeSlotsRanked(tempBlocks);

      let placed = false;
      for (const slot of rankedSlots) {
        const availableMin = slot.end - slot.start;
        if (availableMin < MIN_BLOCK_MINUTES) continue;

        const blockMin = Math.min(
          remainingMin,
          availableMin,
          MAX_BLOCK_MINUTES,
        );

        const block: ScheduleBlock = {
          id: `study-${plan.assignmentId}-${slot.start}`,
          title: plan.assignmentTitle,
          startMin: slot.start,
          endMin: slot.start + blockMin,
          type: "study",
          color: plan.assignmentType === "exam" ? "rose" : "amber",
          assignmentId: plan.assignmentId,
          courseName: plan.courseName,
        };

        studyBlocks.push(block);
        tempBlocks.push(block);
        remainingMin -= blockMin;
        placed = true;
        break;
      }

      if (!placed) break; // 더 이상 빈 공간 없음
    }
  }

  return studyBlocks;
}

// ============================================
// 4a. 습관 → 시간표 블록
// ============================================

/** 오늘 해당하는 습관인지 (요일 매칭) */
function isHabitForToday(h: Habit, dayOfWeek: number): boolean {
  if (!h.is_active) return false;
  if (h.days_of_week && h.days_of_week.length > 0) {
    return h.days_of_week.includes(dayOfWeek);
  }
  // days_of_week 미설정 시 frequency 기반, frequency도 없으면 매일(daily) 기본
  switch (h.frequency) {
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekly":
      return dayOfWeek === 1; // 기본: 월요일
    case "daily":
    default:
      return true; // frequency 미설정 또는 "daily" → 매일
  }
}

const DEFAULT_HABIT_DURATION = 30; // 시간 미설정 습관 기본 30분

function generateHabitBlocks(
  habits: Habit[],
  dayOfWeek: number,
): { fixed: ScheduleBlock[]; unscheduled: Habit[] } {
  const todayHabits = habits.filter((h) => isHabitForToday(h, dayOfWeek));
  const fixed: ScheduleBlock[] = [];
  const unscheduled: Habit[] = [];

  for (const h of todayHabits) {
    if (h.time_start) {
      const startMin = timeToMinutes(h.time_start);
      const endMin = h.time_end ? timeToMinutes(h.time_end) : startMin + 60;
      fixed.push({
        id: `habit-${h.id}`,
        title: `${h.emoji} ${h.name}`,
        startMin,
        endMin,
        type: "habit" as const,
        color: "violet",
        habitId: h.id,
      });
    } else {
      unscheduled.push(h);
    }
  }

  return { fixed, unscheduled };
}

// ============================================
// 4b. 메인: 기본 스케줄 생성 (반복 + 습관 + 수업)
// ============================================

export function generateSchedule(
  recurringTasks: RecurringTask[],
  todos: Todo[],
  dayOfWeek: number, // 0=Sun..6=Sat
  options?: ScheduleOptions,
): ScheduleBlock[] {
  try {
    const blocks: ScheduleBlock[] = [];

    // 1. 반복 일정 배치 (고정 + 미설정 분리)
    const allTodayRecurring = (recurringTasks || []).filter((t) => {
      if (!t.is_active) return false;
      switch (t.recurrence) {
        case "daily":
          return true;
        case "weekdays":
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        case "weekly":
        case "custom":
          return t.days_of_week.includes(dayOfWeek);
        default:
          return false;
      }
    });

    const unscheduledRecurring: RecurringTask[] = [];
    for (const rt of allTodayRecurring) {
      if (rt.time_start) {
        const startMin = timeToMinutes(rt.time_start);
        const endMin = rt.time_end ? timeToMinutes(rt.time_end) : startMin + 60;
        blocks.push({
          id: `recurring-${rt.id}`,
          title: rt.title,
          startMin,
          endMin,
          type: "recurring",
          color: "blue",
          recurringTaskId: rt.id,
        });
      } else {
        unscheduledRecurring.push(rt);
      }
    }

    // 2. 습관 블록 배치 (고정 시간)
    let unscheduledHabits: Habit[] = [];
    if (options?.habits) {
      const { fixed, unscheduled } = generateHabitBlocks(options.habits, dayOfWeek);
      blocks.push(...fixed);
      unscheduledHabits = unscheduled;
    }

    // 3. Canvas 수업 블록 배치 (고정)
    if (options?.classEvents && options.dateStr && options.courseNames) {
      const classBlocks = generateClassBlocks(
        options.classEvents,
        options.dateStr,
        options.courseNames,
      );
      blocks.push(...classBlocks);
    }

    // 3b. course_schedules 테이블 기반 수업 블록 배치
    if (options?.courseSchedules && options.courseSchedules.length > 0) {
      const csBlocks = generateCourseScheduleBlocks(options.courseSchedules, dayOfWeek);
      blocks.push(...csBlocks);
    }

    // 3c. ICS 피드 이벤트 블록 배치
    if (options?.icsEvents && options.icsEvents.length > 0 && options.dateStr) {
      const icsBlocks = generateIcsBlocks(options.icsEvents, options.dateStr);
      blocks.push(...icsBlocks);
    }

    // 4. 시간 미설정 습관 → 빈 슬롯에 자동 배치
    if (unscheduledHabits.length > 0) {
      const freeSlots = findFreeSlots(blocks);
      for (const h of unscheduledHabits) {
        for (const slot of freeSlots) {
          if (slot.end - slot.start >= DEFAULT_HABIT_DURATION) {
            blocks.push({
              id: `habit-${h.id}`,
              title: `${h.emoji} ${h.name}`,
              startMin: slot.start,
              endMin: slot.start + DEFAULT_HABIT_DURATION,
              type: "habit" as const,
              color: "violet",
              habitId: h.id,
            });
            slot.start += DEFAULT_HABIT_DURATION;
            break;
          }
        }
      }
    }

    // 4b. 시간 미설정 반복 할일 → 빈 슬롯에 자동 배치
    const DEFAULT_RECURRING_DURATION = 60; // 반복 할일 기본 60분
    if (unscheduledRecurring.length > 0) {
      const freeSlots = findFreeSlots(blocks);
      for (const rt of unscheduledRecurring) {
        for (const slot of freeSlots) {
          if (slot.end - slot.start >= DEFAULT_RECURRING_DURATION) {
            blocks.push({
              id: `recurring-${rt.id}`,
              title: `🔁 ${rt.title}`,
              startMin: slot.start,
              endMin: slot.start + DEFAULT_RECURRING_DURATION,
              type: "recurring",
              color: "blue",
              recurringTaskId: rt.id,
            });
            slot.start += DEFAULT_RECURRING_DURATION;
            break;
          }
        }
      }
    }

    // Sort blocks by start time
    blocks.sort((a, b) => a.startMin - b.startMin);

    return blocks;
  } catch (error) {
    console.error("[Schedule] generateSchedule error:", error);
    return [];
  }
}

// ============================================
// 4b. D-Day 블록 배치 (모든 블록 확정 후 빈 슬롯에 배치)
// ============================================

export function placeDdayBlocks(
  existingBlocks: ScheduleBlock[],
  ddayEntries: DdayEntry[],
): ScheduleBlock[] {
  try {
    if (!ddayEntries || ddayEntries.length === 0) return existingBlocks || [];

    const allBlocks = [...(existingBlocks || [])];

    for (const entry of ddayEntries) {
      allBlocks.sort((a, b) => a.startMin - b.startMin);
      const rankedSlots = findFreeSlotsRanked(allBlocks);

      for (const slot of rankedSlots) {
        if (slot.end - slot.start >= entry.estimated_minutes) {
          allBlocks.push({
            id: `dday-${entry.id}`,
            title: `${entry.emoji} ${entry.title}`,
            startMin: slot.start,
            endMin: slot.start + entry.estimated_minutes,
            type: "dday",
            color: entry.color as ScheduleBlockColor,
            ddayEntryId: entry.id,
          });
          break;
        }
      }
    }

    allBlocks.sort((a, b) => a.startMin - b.startMin);
    return allBlocks;
  } catch (error) {
    console.error("[Schedule] placeDdayBlocks error:", error);
    return existingBlocks || [];
  }
}

// ============================================
// 5. 자동 배분 (공부 + 일반 할일) — @deprecated: autoAssignDailyPlans 사용 권장
// ============================================

/** @deprecated Use autoAssignDailyPlans() instead. Kept as fallback when daily plans are not active. */
export function autoAssignTodos(
  existingBlocks: ScheduleBlock[],
  todos: Todo[],
  assignments?: Assignment[],
  dateStr?: string,
): ScheduleBlock[] {
  try {
    const allBlocks = [...(existingBlocks || [])];

    // Phase 1: 공부 블록 배치 (마감일 기반)
    if (assignments && dateStr) {
      const studyPlans = computeStudyPlans(assignments, dateStr);
      const studyBlocks = generateStudyBlocks(studyPlans, allBlocks);
      allBlocks.push(...studyBlocks);
      allBlocks.sort((a, b) => a.startMin - b.startMin);
    }

    // Phase 2: 남은 빈 시간에 일반 할일 배치
    // 정렬 우선순위:
    //   1) 선호 시간 있는 할일 먼저 (선점 보장)
    //   2) 선호 시간끼리는 시간순 (이른 시간 먼저 → 충돌 최소화)
    //   3) 우선순위 높은 것 먼저
    //   4) 마감일 임박 순
    const uncompletedTodos = (todos || [])
      .filter(
        (t) =>
          !t.is_completed &&
          t.description !== "__section_header__" &&
          !t.parent_id,
      )
      .sort((a, b) => {
        const hasTimeA = a.due_time ? 0 : 1;
        const hasTimeB = b.due_time ? 0 : 1;
        if (hasTimeA !== hasTimeB) return hasTimeA - hasTimeB;
        // 선호 시간끼리는 시간순 (08:00 → 18:30 순서로 배치)
        if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
        const pa = a.priority ?? 5;
        const pb = b.priority ?? 5;
        if (pa !== pb) return pa - pb;
        if (a.due_date && b.due_date)
          return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });

    for (const todo of uncompletedTodos) {
      let placed = false;
      // 우선순위 기반 소요 시간 추정 (P1: 90분, P2: 60분, 기타: 45분)
      const duration = estimateMinutes(todo);

      // ── Step 1: 선호 시간 기반 통합 스코어링 배치 ──
      // 정확 매칭 + 근접도 + 집중도 + 방향 선호를 가중 합산
      // 3시간 이내 최적 슬롯 탐색 (없으면 Step 2로)
      if (todo.due_time) {
        const preferredStart = timeToMinutes(todo.due_time);
        if (preferredStart >= SCHEDULE_START && preferredStart + duration <= SCHEDULE_END) {
          allBlocks.sort((a, b) => a.startMin - b.startMin);
          const freeSlots = findFreeSlots(allBlocks);
          const bestStart = findBestSlotForPreferred(freeSlots, preferredStart, duration);
          if (bestStart !== null) {
            allBlocks.push({
              id: `todo-${todo.id}`,
              title: todo.title,
              startMin: bestStart,
              endMin: bestStart + duration,
              type: "todo",
              todoId: todo.id,
            });
            placed = true;
          }
        }
      }

      // ── Step 2: 집중 점수 기반 폴백 ──
      // 선호 시간 없거나, 3시간 내 슬롯 없을 때 집중도 높은 순서로 배치
      if (!placed) {
        allBlocks.sort((a, b) => a.startMin - b.startMin);
        const rankedSlots = findFreeSlotsRanked(allBlocks);
        for (const slot of rankedSlots) {
          if (slot.end - slot.start < duration) continue;
          allBlocks.push({
            id: `todo-${todo.id}`,
            title: todo.title,
            startMin: slot.start,
            endMin: slot.start + duration,
            type: "todo",
            todoId: todo.id,
          });
          placed = true;
          break;
        }
      }
      if (!placed) break; // 더 이상 빈 공간 없음
    }

    allBlocks.sort((a, b) => a.startMin - b.startMin);
    return allBlocks;
  } catch (error) {
    console.error("[Schedule] autoAssignTodos error:", error);
    return existingBlocks || [];
  }
}

// ============================================
// 6. 일일 계획 기반 자동 배치
// ============================================

export function autoAssignDailyPlans(
  existingBlocks: ScheduleBlock[],
  dailyPlans: DailyPlan[],
  todos: Todo[],
  targetDate?: string,
): {
  blocks: ScheduleBlock[];
  scheduleUpdates: { id: string; startMin: number; endMin: number }[];
  stalePlanIds: string[];
} {
  try {
    const allBlocks = [...(existingBlocks || [])];
    const scheduleUpdates: { id: string; startMin: number; endMin: number }[] = [];
    const stalePlanIds: string[] = [];

    // 이미 recurring 블록으로 표시된 반복일정 ID 수집 — 중복 블록 방지
    const existingRecurringIds = new Set(
      (existingBlocks || [])
        .filter((b) => b.type === "recurring" && b.recurringTaskId)
        .map((b) => b.recurringTaskId!),
    );

    // 반복일정에서 자동 생성된 할일은 제외 (이미 recurring 블록으로 표시됨)
    // + 날짜 불일치/완료된 할일의 stale plan 감지
    const filteredPlans = (dailyPlans || []).filter((p) => {
      const todo = (todos || []).find((t) => t.id === p.todo_id);

      // todo가 삭제됨 → stale
      if (!todo) {
        stalePlanIds.push(p.id);
        return false;
      }

      // todo가 이미 완료됨 → 스케줄에는 유지 (완료 표시만 변경)
      // stalePlan으로 제거하지 않음 — UI에서 isCompleted 체크로 시각적 완료 표시

      // todo의 due_date가 다른 날로 변경됨 → stale
      if (targetDate && todo.due_date && todo.due_date !== targetDate) {
        stalePlanIds.push(p.id);
        return false;
      }

      // recurring 블록과 중복 방지
      if (todo.recurring_task_id && existingRecurringIds.has(todo.recurring_task_id)) {
        return false;
      }

      return true;
    });

    // 이미 배치된 계획 (scheduled_start_min 이 있는 것)
    const alreadyScheduled = filteredPlans.filter(
      (p) =>
        !p.is_skipped &&
        p.estimated_minutes > 0 &&
        p.scheduled_start_min != null &&
        p.scheduled_end_min != null,
    );

    // 아직 미배치인 계획
    const unscheduled = filteredPlans.filter(
      (p) =>
        !p.is_skipped &&
        p.estimated_minutes > 0 &&
        p.scheduled_start_min == null,
    );

    // 이미 배치된 블록 먼저 추가
    for (const plan of alreadyScheduled) {
      const todo = (todos || []).find((t) => t.id === plan.todo_id);
      if (!todo) continue;
      allBlocks.push({
        id: `plan-${plan.id}`,
        title: todo.title,
        startMin: plan.scheduled_start_min!,
        endMin: plan.scheduled_end_min!,
        type: "todo",
        todoId: todo.id,
        planId: plan.id,
      });
    }

    // 미배치 계획을 최적 시간대에 배치
    // 정렬 우선순위:
    //   1) 선호 시간 있는 할일 먼저 (선점 보장)
    //   2) 선호 시간끼리는 시간순 (이른 시간 먼저 → 충돌 최소화)
    //   3) 사용자 정렬 순서
    if (unscheduled.length > 0) {
      const sorted = [...unscheduled].sort((a, b) => {
        const todoA = (todos || []).find((t) => t.id === a.todo_id);
        const todoB = (todos || []).find((t) => t.id === b.todo_id);
        const hasTimeA = todoA?.due_time ? 0 : 1;
        const hasTimeB = todoB?.due_time ? 0 : 1;
        if (hasTimeA !== hasTimeB) return hasTimeA - hasTimeB;
        // 선호 시간끼리는 시간순 (08:00 → 18:30 순서로 배치)
        if (todoA?.due_time && todoB?.due_time)
          return todoA.due_time.localeCompare(todoB.due_time);
        return a.sort_order - b.sort_order;
      });

      for (const plan of sorted) {
        const todo = (todos || []).find((t) => t.id === plan.todo_id);
        if (!todo) continue;

        const neededMin = plan.estimated_minutes;
        let placed = false;

        // ── Step 1: 선호 시간 기반 통합 스코어링 배치 ──
        // 정확 매칭 + 근접도 + 집중도 + 방향 선호를 가중 합산
        // 3시간 이내 최적 슬롯 탐색 (없으면 Step 2로)
        if (todo.due_time) {
          const preferredStart = timeToMinutes(todo.due_time);
          if (preferredStart >= SCHEDULE_START && preferredStart + neededMin <= SCHEDULE_END) {
            allBlocks.sort((a, b) => a.startMin - b.startMin);
            const freeSlots = findFreeSlots(allBlocks);
            const bestStart = findBestSlotForPreferred(freeSlots, preferredStart, neededMin);
            if (bestStart !== null) {
              const endMin = bestStart + neededMin;
              allBlocks.push({
                id: `plan-${plan.id}`,
                title: todo.title,
                startMin: bestStart,
                endMin,
                type: "todo",
                todoId: todo.id,
                planId: plan.id,
              });
              scheduleUpdates.push({ id: plan.id, startMin: bestStart, endMin });
              placed = true;
            }
          }
        }

        // ── Step 2: 집중 점수 기반 폴백 ──
        // 선호 시간 없거나, 3시간 내 슬롯 없을 때 집중도 높은 순서로 배치
        if (!placed) {
          allBlocks.sort((a, b) => a.startMin - b.startMin);
          const rankedSlots = findFreeSlotsRanked(allBlocks);

          for (const slot of rankedSlots) {
            const availableMin = slot.end - slot.start;
            if (availableMin < neededMin) continue;

            const startMin = slot.start;
            const endMin = startMin + neededMin;

            allBlocks.push({
              id: `plan-${plan.id}`,
              title: todo.title,
              startMin,
              endMin,
              type: "todo",
              todoId: todo.id,
              planId: plan.id,
            });

            scheduleUpdates.push({ id: plan.id, startMin, endMin });
            placed = true;
            break;
          }
        }

        if (!placed) break; // 더 이상 빈 공간 없음
      }
    }

    allBlocks.sort((a, b) => a.startMin - b.startMin);
    return { blocks: allBlocks, scheduleUpdates, stalePlanIds };
  } catch (error) {
    console.error("[Schedule] autoAssignDailyPlans error:", error);
    return { blocks: existingBlocks || [], scheduleUpdates: [], stalePlanIds: [] };
  }
}

// ============================================
// 7. 스마트 우선순위 정렬 + 소요 시간 추정
// ============================================

/** 긴급도 점수 (낮을수록 긴급) */
function getUrgencyScore(todo: Todo, todayStr: string): number {
  if (!todo.due_date) return 400; // 마감 없음 = 최저
  if (todo.due_date < todayStr) return 100; // 지연 (최우선)
  if (todo.due_date === todayStr) return 200; // 오늘 마감
  // 3일 이내 임박
  const todayMs = parseLocalDate(todayStr).getTime();
  const dueMs = parseLocalDate(todo.due_date).getTime();
  const daysDiff = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 3) return 300;
  return 400;
}

/** 할일을 시간표 배치 우선순위로 정렬: 긴급도 → 우선순위 → 마감일 */
export function sortTodosBySchedulePriority(
  todos: Todo[],
  todayStr: string,
): Todo[] {
  return [...todos].sort((a, b) => {
    const ua = getUrgencyScore(a, todayStr);
    const ub = getUrgencyScore(b, todayStr);
    if (ua !== ub) return ua - ub;
    const pa = a.priority ?? 5;
    const pb = b.priority ?? 5;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
}

/** 우선순위 기반 소요 시간 추정 */
export function estimateMinutes(todo: Todo): number {
  if (todo.priority === 1) return 90;
  if (todo.priority === 2) return 60;
  return 45;
}

