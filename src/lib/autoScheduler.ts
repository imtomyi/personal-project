import type { Todo, RecurringTask, Assignment, CanvasCalendarEvent, AssignmentType, Habit, DailyPlan } from "@/lib/types";
import { ASSIGNMENT_EFFORT_HOURS } from "@/lib/constants";
import { toDateStr } from "@/lib/date";

// ============================================
// Types
// ============================================

export type ScheduleBlockType = "recurring" | "todo" | "empty" | "class" | "study" | "habit";

export type ScheduleBlock = {
  id: string;
  title: string;
  startMin: number; // minutes from midnight (e.g., 540 = 9:00)
  endMin: number;
  type: ScheduleBlockType;
  color?: string;
  todoId?: string;
  planId?: string; // daily_plans.id → 드래그 시 업데이트 대상 식별
  recurringTaskId?: string;
  assignmentId?: string; // study blocks → assignment 연결
  courseName?: string; // class/study 블록 표시용
};

type ScheduleOptions = {
  classEvents?: CanvasCalendarEvent[];
  assignments?: Assignment[];
  dateStr?: string; // "YYYY-MM-DD"
  courseNames?: Map<string, string>; // context_code → course name
  habits?: Habit[]; // 시간 설정된 습관 → 시간표 블록
};

// ============================================
// Utilities
// ============================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const SCHEDULE_START = 6 * 60; // 06:00
const SCHEDULE_END = 24 * 60; // 24:00

// ============================================
// Free Slots Helper
// ============================================

export function findFreeSlots(
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

// ============================================
// 1. Canvas 수업 블록 생성
// ============================================

export function generateClassBlocks(
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

export function computeStudyPlans(
  assignments: Assignment[],
  todayStr: string,
): StudyPlan[] {
  const todayMs = new Date(todayStr + "T00:00:00").getTime();

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

export function generateStudyBlocks(
  studyPlans: StudyPlan[],
  existingBlocks: ScheduleBlock[],
): ScheduleBlock[] {
  const MIN_BLOCK_MINUTES = 30;
  const MAX_BLOCK_MINUTES = 90;

  const freeSlots = findFreeSlots(existingBlocks);
  const studyBlocks: ScheduleBlock[] = [];
  let slotIdx = 0;
  let slotCursor = freeSlots[0]?.start ?? SCHEDULE_END;

  for (const plan of studyPlans) {
    let remainingMin = Math.round(plan.hoursPerDay * 60);

    while (remainingMin >= MIN_BLOCK_MINUTES && slotIdx < freeSlots.length) {
      const slot = freeSlots[slotIdx];
      const availableMin = slot.end - slotCursor;

      if (availableMin < MIN_BLOCK_MINUTES) {
        slotIdx++;
        slotCursor = freeSlots[slotIdx]?.start ?? SCHEDULE_END;
        continue;
      }

      const blockMin = Math.min(
        remainingMin,
        availableMin,
        MAX_BLOCK_MINUTES,
      );

      studyBlocks.push({
        id: `study-${plan.assignmentId}-${slotCursor}`,
        title: plan.assignmentTitle,
        startMin: slotCursor,
        endMin: slotCursor + blockMin,
        type: "study",
        color: plan.assignmentType === "exam" ? "rose" : "amber",
        assignmentId: plan.assignmentId,
        courseName: plan.courseName,
      });

      slotCursor += blockMin;
      remainingMin -= blockMin;

      if (slotCursor >= slot.end) {
        slotIdx++;
        slotCursor = freeSlots[slotIdx]?.start ?? SCHEDULE_END;
      }
    }
  }

  return studyBlocks;
}

// ============================================
// 4a. 습관 → 시간표 블록
// ============================================

function generateHabitBlocks(habits: Habit[], dayOfWeek: number): ScheduleBlock[] {
  return habits
    .filter((h) => {
      if (!h.is_active || !h.time_start) return false;
      // days_of_week가 있으면 그걸로 매칭, 없으면 frequency 기반
      if (h.days_of_week && h.days_of_week.length > 0) {
        return h.days_of_week.includes(dayOfWeek);
      }
      switch (h.frequency) {
        case "daily":
          return true;
        case "weekdays":
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        case "weekly":
          return dayOfWeek === 1; // 기본: 월요일
        default:
          return false;
      }
    })
    .map((h) => {
      const startMin = timeToMinutes(h.time_start!);
      const endMin = h.time_end ? timeToMinutes(h.time_end) : startMin + 60;
      return {
        id: `habit-${h.id}`,
        title: `${h.emoji} ${h.name}`,
        startMin,
        endMin,
        type: "habit" as const,
        color: "violet",
      };
    });
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
  const blocks: ScheduleBlock[] = [];

  // 1. 반복 일정 배치 (고정)
  const todayRecurring = recurringTasks.filter((t) => {
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

  // 2. 습관 블록 배치 (고정)
  if (options?.habits) {
    const habitBlocks = generateHabitBlocks(options.habits, dayOfWeek);
    blocks.push(...habitBlocks);
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

  // Sort blocks by start time
  blocks.sort((a, b) => a.startMin - b.startMin);

  return blocks;
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
  const SLOT_DURATION = 60;
  const allBlocks = [...existingBlocks];

  // Phase 1: 공부 블록 배치 (마감일 기반)
  if (assignments && dateStr) {
    const studyPlans = computeStudyPlans(assignments, dateStr);
    const studyBlocks = generateStudyBlocks(studyPlans, allBlocks);
    allBlocks.push(...studyBlocks);
    allBlocks.sort((a, b) => a.startMin - b.startMin);
  }

  // Phase 2: 남은 빈 시간에 일반 할일 배치 (우선순위 기반)
  const freeSlots = findFreeSlots(allBlocks);

  const uncompletedTodos = todos
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

  let todoIdx = 0;

  for (const slot of freeSlots) {
    let slotCursor = slot.start;
    while (
      slotCursor + SLOT_DURATION <= slot.end &&
      todoIdx < uncompletedTodos.length
    ) {
      const todo = uncompletedTodos[todoIdx];
      allBlocks.push({
        id: `todo-${todo.id}`,
        title: todo.title,
        startMin: slotCursor,
        endMin: slotCursor + SLOT_DURATION,
        type: "todo",
        todoId: todo.id,
      });
      slotCursor += SLOT_DURATION;
      todoIdx++;
    }
  }

  allBlocks.sort((a, b) => a.startMin - b.startMin);
  return allBlocks;
}

// ============================================
// 6. 일일 계획 기반 자동 배치
// ============================================

export function autoAssignDailyPlans(
  existingBlocks: ScheduleBlock[],
  dailyPlans: DailyPlan[],
  todos: Todo[],
): {
  blocks: ScheduleBlock[];
  scheduleUpdates: { id: string; startMin: number; endMin: number }[];
} {
  const allBlocks = [...existingBlocks];
  const scheduleUpdates: { id: string; startMin: number; endMin: number }[] = [];

  // 이미 배치된 계획 (scheduled_start_min 이 있는 것)
  const alreadyScheduled = dailyPlans.filter(
    (p) =>
      !p.is_skipped &&
      p.estimated_minutes > 0 &&
      p.scheduled_start_min != null &&
      p.scheduled_end_min != null,
  );

  // 아직 미배치인 계획
  const unscheduled = dailyPlans.filter(
    (p) =>
      !p.is_skipped &&
      p.estimated_minutes > 0 &&
      p.scheduled_start_min == null,
  );

  // 이미 배치된 블록 먼저 추가
  for (const plan of alreadyScheduled) {
    const todo = todos.find((t) => t.id === plan.todo_id);
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

  // 미배치 계획을 빈 슬롯에 배치
  if (unscheduled.length > 0) {
    allBlocks.sort((a, b) => a.startMin - b.startMin);
    const freeSlots = findFreeSlots(allBlocks);
    let slotIdx = 0;
    let slotCursor = freeSlots[0]?.start ?? SCHEDULE_END;

    for (const plan of unscheduled.sort((a, b) => a.sort_order - b.sort_order)) {
      const todo = todos.find((t) => t.id === plan.todo_id);
      if (!todo) continue;

      const neededMin = plan.estimated_minutes;
      let placed = false;

      while (slotIdx < freeSlots.length) {
        const slot = freeSlots[slotIdx];
        const availableMin = slot.end - slotCursor;

        if (availableMin < neededMin) {
          slotIdx++;
          slotCursor = freeSlots[slotIdx]?.start ?? SCHEDULE_END;
          continue;
        }

        const startMin = slotCursor;
        const endMin = slotCursor + neededMin;

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

        slotCursor = endMin;
        if (slotCursor >= slot.end) {
          slotIdx++;
          slotCursor = freeSlots[slotIdx]?.start ?? SCHEDULE_END;
        }
        placed = true;
        break;
      }

      if (!placed) break; // 더 이상 빈 공간 없음
    }
  }

  allBlocks.sort((a, b) => a.startMin - b.startMin);
  return { blocks: allBlocks, scheduleUpdates };
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
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const dueMs = new Date(todo.due_date + "T00:00:00").getTime();
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

export { minutesToTime, timeToMinutes };
