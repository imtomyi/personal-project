import type { Todo, RecurringTask, Assignment, CanvasCalendarEvent, AssignmentType, Habit, DailyPlan, DdayEntry, ScheduleBlockColor } from "@/lib/types";
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
};

type ScheduleOptions = {
  classEvents?: CanvasCalendarEvent[];
  assignments?: Assignment[];
  dateStr?: string; // "YYYY-MM-DD"
  courseNames?: Map<string, string>; // context_code → course name
  habits?: Habit[]; // 시간 설정된 습관 → 시간표 블록
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

    // 1. 반복 일정 배치 (고정)
    const todayRecurring = (recurringTasks || []).filter((t) => {
      if (!t.is_active || !t.time_start) return false;
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

    for (const rt of todayRecurring) {
      if (!rt.time_start) continue;
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
            });
            slot.start += DEFAULT_HABIT_DURATION;
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
    const SLOT_DURATION = 60;
    const allBlocks = [...(existingBlocks || [])];

    // Phase 1: 공부 블록 배치 (마감일 기반)
    if (assignments && dateStr) {
      const studyPlans = computeStudyPlans(assignments, dateStr);
      const studyBlocks = generateStudyBlocks(studyPlans, allBlocks);
      allBlocks.push(...studyBlocks);
      allBlocks.sort((a, b) => a.startMin - b.startMin);
    }

    // Phase 2: 남은 빈 시간에 일반 할일 배치 (집중 시간대 우선)
    const uncompletedTodos = (todos || [])
      .filter(
        (t) =>
          !t.is_completed &&
          t.description !== "__section_header__" &&
          !t.parent_id,
      )
      .sort((a, b) => {
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
      allBlocks.sort((a, b) => a.startMin - b.startMin);
      const rankedSlots = findFreeSlotsRanked(allBlocks);
      let placed = false;
      for (const slot of rankedSlots) {
        if (slot.end - slot.start < SLOT_DURATION) continue;
        allBlocks.push({
          id: `todo-${todo.id}`,
          title: todo.title,
          startMin: slot.start,
          endMin: slot.start + SLOT_DURATION,
          type: "todo",
          todoId: todo.id,
        });
        placed = true;
        break;
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

      // todo가 이미 완료됨 → 스케줄에서 제외
      if (todo.is_completed) {
        stalePlanIds.push(p.id);
        return false;
      }

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

    // 미배치 계획을 집중 가능 시간대 우선으로 배치
    // 선호 시간이 있는 할 일을 먼저 배치 (선점 보장)
    if (unscheduled.length > 0) {
      const sorted = [...unscheduled].sort((a, b) => {
        const todoA = (todos || []).find((t) => t.id === a.todo_id);
        const todoB = (todos || []).find((t) => t.id === b.todo_id);
        const hasTimeA = todoA?.due_time ? 0 : 1;
        const hasTimeB = todoB?.due_time ? 0 : 1;
        if (hasTimeA !== hasTimeB) return hasTimeA - hasTimeB;
        return a.sort_order - b.sort_order;
      });

      for (const plan of sorted) {
        const todo = (todos || []).find((t) => t.id === plan.todo_id);
        if (!todo) continue;

        const neededMin = plan.estimated_minutes;
        let placed = false;

        // 선호 시간이 있으면 해당 시간에 우선 배치 시도
        if (todo.due_time) {
          const preferredStart = timeToMinutes(todo.due_time);
          const preferredEnd = preferredStart + neededMin;

          if (preferredEnd <= SCHEDULE_END && preferredStart >= SCHEDULE_START) {
            allBlocks.sort((a, b) => a.startMin - b.startMin);
            const freeSlots = findFreeSlots(allBlocks);
            const fits = freeSlots.some(
              (slot) => slot.start <= preferredStart && slot.end >= preferredEnd,
            );
            if (fits) {
              allBlocks.push({
                id: `plan-${plan.id}`,
                title: todo.title,
                startMin: preferredStart,
                endMin: preferredEnd,
                type: "todo",
                todoId: todo.id,
                planId: plan.id,
              });
              scheduleUpdates.push({ id: plan.id, startMin: preferredStart, endMin: preferredEnd });
              placed = true;
            }
          }
        }

        // 폴백: 집중 점수 높은 빈 슬롯 탐색 (기존 로직)
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

