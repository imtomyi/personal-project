export const SECTION_HEADER_MARKER = "__section_header__";

/** 섹션 헤더를 제외한 실제 할일만 필터링 */
export function filterRealTodos(todos: Todo[]): Todo[] {
  return todos.filter((t) => t.description !== SECTION_HEADER_MARKER);
}

// ============================================
// 스케줄 블록 색상
// ============================================
export type ScheduleBlockColor = "blue" | "indigo" | "amber" | "violet" | "emerald" | "sky" | "gray" | "rose";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string | null;
  created_at: string;
  color: string;
  is_archived?: boolean;
  archived_at?: string | null;
};

export type MemberRole = "owner" | "admin" | "member";

export type Member = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profiles?: Profile;
};

export type TodoStatus = "todo" | "in_progress" | "done";

export type Todo = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  status: TodoStatus;
  priority: number | null;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  due_time: string | null; // "HH:MM" 선호 시간, e.g. "14:30"
  duration_days: number;
  sort_order: number;
  parent_id: string | null;
  recurring_task_id: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
  assigned_profile?: Profile | null;
};

export type Comment = {
  id: string;
  todo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
};

// ============================================
// KHU (경희대) 관련 타입
// ============================================
export type AssignmentType = "assignment" | "exam" | "quiz" | "project" | "other";

export type Course = {
  id: string;
  user_id: string;
  name: string;
  professor: string | null;
  color: string;
  semester: string | null;
  created_at: string;
  canvas_course_id: number | null;
  workspace_id: string | null;
};

export type Assignment = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  due_date: string | null;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  course?: Course;
  canvas_assignment_id: number | null;
};

// Canvas Calendar Event (수업 시간표)
export type CanvasCalendarEvent = {
  id: number;
  title: string;
  start_at: string; // ISO datetime
  end_at: string; // ISO datetime
  context_code: string; // e.g., "course_12345"
  location_name?: string;
  description?: string;
};

export type KhuNotice = {
  id: string;
  title: string;
  url: string;
  author: string | null;
  date: string | null;
  category: string | null;
  isImportant: boolean;
  isRecent: boolean;
};

// ============================================
// 수업 시간표 (course_schedules) 타입
// ============================================
export type CourseSchedule = {
  id: string;
  user_id: string;
  canvas_course_id: number | null;
  course_name: string;
  day_of_week: number; // 0=일..6=토
  time_start: string;  // "HH:MM"
  time_end: string;    // "HH:MM"
  location: string | null;
  color: string;       // 기본 '#4F46E5'
  created_at: string;
};

// ============================================
// 가계부 (소비 트래커) 타입
// ============================================
export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "cafe"
  | "entertainment"
  | "education"
  | "health"
  | "other";

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  memo: string | null;
  date: string; // "YYYY-MM-DD"
  created_at: string;
};

export type MonthlyBudget = {
  id: string;
  user_id: string;
  year_month: string; // "YYYY-MM"
  budget_amount: number;
  created_at: string;
  updated_at: string;
};

// ============================================
// 습관 트래커 타입
// ============================================
export type Habit = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  frequency: "daily" | "weekdays" | "weekly";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  // 시간표 연동 (선택)
  time_start: string | null;      // "HH:MM"
  time_end: string | null;        // "HH:MM"
  days_of_week: number[] | null;  // [0..6], null이면 frequency 기반
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // "YYYY-MM-DD"
  created_at: string;
};

// ============================================
// 시간 추적 타입
// ============================================
export type TimeEntry = {
  id: string;
  user_id: string;
  todo_id: string;
  workspace_id: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  created_at: string;
};

// ============================================
// 목표 시스템 타입
// ============================================
export type GoalStatus = "active" | "completed" | "archived";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  target_date: string | null;
  progress: number;
  status: GoalStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ============================================
// 반복 할일 타입
// ============================================
export type RecurrenceType = "daily" | "weekdays" | "weekly" | "custom";

export type RecurringTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  workspace_id: string | null;
  priority: number | null;
  recurrence: RecurrenceType;
  days_of_week: number[];
  time_start: string | null;
  time_end: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

// ============================================
// 일일 계획 (Daily Planning) 타입
// ============================================
export type DailyPlan = {
  id: string;
  user_id: string;
  todo_id: string;
  date: string;                          // "YYYY-MM-DD"
  estimated_minutes: number;             // 30, 60, 90, 120, 150, 180
  scheduled_start_min: number | null;    // 자정 기준 분 (540 = 09:00)
  scheduled_end_min: number | null;
  is_skipped: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ============================================
// D-Day 타입
// ============================================
export type DdayEntry = {
  id: string;
  user_id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  emoji: string;
  color: string;
  sort_order: number;
  estimated_minutes: number; // 시간표 배치용 소요 시간 (기본 30분)
  is_archived: boolean;
  created_at: string;
};

// ============================================
// 루틴 통합 타입 (습관 + 반복일정 가상 레이어)
// ============================================
export type RoutineMode = "habit" | "task";

export type Routine = {
  id: string;
  name: string;
  emoji: string;
  mode: RoutineMode;
  recurrence: RecurrenceType;
  days_of_week: number[];
  time_start: string | null;
  time_end: string | null;
  is_active: boolean;
  sort_order: number;
  // task 전용
  workspace_id: string | null;
  priority: number | null;
  description: string | null;
  // 내부 소스 추적
  _source: "habits" | "recurring_tasks";
};

// ============================================
// 위젯 대시보드 타입
// ============================================
export type WidgetId = "calendar" | "shuttle" | "meals" | "canvas";

export type WidgetConfig = {
  id: WidgetId;
  visible: boolean;
  order: number;
};

export type WidgetMeta = {
  id: WidgetId;
  label: string;
  emoji: string;
  description: string;
};
