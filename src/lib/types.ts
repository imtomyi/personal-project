export const SECTION_HEADER_MARKER = "__section_header__";

/** 섹션 헤더를 제외한 실제 할일만 필터링 */
export function filterRealTodos(todos: Todo[]): Todo[] {
  return todos.filter((t) => t.description !== SECTION_HEADER_MARKER);
}

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

export type Todo = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: number | null;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  duration_days: number;
  sort_order: number;
  parent_id: string | null;
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
