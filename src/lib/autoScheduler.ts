import type { Todo, RecurringTask } from "@/lib/types";

export type ScheduleBlock = {
  id: string;
  title: string;
  startMin: number; // minutes from midnight (e.g., 540 = 9:00)
  endMin: number;
  type: "recurring" | "todo" | "empty";
  color?: string;
  todoId?: string;
  recurringTaskId?: string;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateSchedule(
  recurringTasks: RecurringTask[],
  todos: Todo[],
  dayOfWeek: number // 0=Sun..6=Sat
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  const SCHEDULE_START = 6 * 60; // 06:00
  const SCHEDULE_END = 24 * 60; // 24:00
  const SLOT_DURATION = 60; // 1 hour blocks for auto-assign

  // 1. Place recurring tasks with time slots
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

  // Sort blocks by start time
  blocks.sort((a, b) => a.startMin - b.startMin);

  return blocks;
}

export function autoAssignTodos(
  existingBlocks: ScheduleBlock[],
  todos: Todo[]
): ScheduleBlock[] {
  const SCHEDULE_START = 6 * 60;
  const SCHEDULE_END = 24 * 60;
  const SLOT_DURATION = 60;

  // Find free slots
  const occupiedSlots = existingBlocks.map((b) => ({
    start: b.startMin,
    end: b.endMin,
  }));
  occupiedSlots.sort((a, b) => a.start - b.start);

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

  // Sort todos by priority: due date closeness, then priority level
  const uncompletedTodos = todos
    .filter((t) => !t.is_completed && t.description !== "__section_header__" && !t.parent_id)
    .sort((a, b) => {
      // Priority first (1 = highest)
      const pa = a.priority ?? 5;
      const pb = b.priority ?? 5;
      if (pa !== pb) return pa - pb;
      // Then by due date
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

  const newBlocks: ScheduleBlock[] = [...existingBlocks];
  let todoIdx = 0;

  for (const slot of freeSlots) {
    let slotCursor = slot.start;
    while (slotCursor + SLOT_DURATION <= slot.end && todoIdx < uncompletedTodos.length) {
      const todo = uncompletedTodos[todoIdx];
      newBlocks.push({
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

  newBlocks.sort((a, b) => a.startMin - b.startMin);
  return newBlocks;
}

export { minutesToTime, timeToMinutes };
