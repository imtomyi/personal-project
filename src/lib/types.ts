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
  assigned_to: string | null;
  created_by: string | null;
  sort_order: number;
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
