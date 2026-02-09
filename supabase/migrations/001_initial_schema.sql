-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- WORKSPACES
-- ============================================
create table public.workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.workspaces enable row level security;

-- ============================================
-- MEMBERS (workspace membership)
-- ============================================
create type member_role as enum ('owner', 'admin', 'member');

create table public.members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role member_role default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(workspace_id, user_id)
);

alter table public.members enable row level security;

-- ============================================
-- TODOS
-- ============================================
create table public.todos (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  description text,
  is_completed boolean default false not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.todos enable row level security;

-- ============================================
-- COMMENTS (on todos)
-- ============================================
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  todo_id uuid references public.todos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

alter table public.comments enable row level security;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Workspaces: visible to members
create policy "Workspace members can view workspaces"
  on public.workspaces for select
  using (
    id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() = created_by);

create policy "Workspace owners can update workspaces"
  on public.workspaces for update
  using (
    id in (
      select workspace_id from public.members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Workspace owners can delete workspaces"
  on public.workspaces for delete
  using (
    id in (
      select workspace_id from public.members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Members: visible to workspace members
create policy "Members can view other members in same workspace"
  on public.members for select
  using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "Users can insert themselves as members"
  on public.members for insert
  with check (user_id = auth.uid());

create policy "Admins can manage members"
  on public.members for delete
  using (
    workspace_id in (
      select workspace_id from public.members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Todos: accessible to workspace members
create policy "Workspace members can view todos"
  on public.todos for select
  using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "Workspace members can create todos"
  on public.todos for insert
  with check (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "Workspace members can update todos"
  on public.todos for update
  using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "Workspace members can delete todos"
  on public.todos for delete
  using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

-- Comments: accessible to workspace members (through todo)
create policy "Workspace members can view comments"
  on public.comments for select
  using (
    todo_id in (
      select id from public.todos
      where workspace_id in (select workspace_id from public.members where user_id = auth.uid())
    )
  );

create policy "Workspace members can create comments"
  on public.comments for insert
  with check (
    user_id = auth.uid() and
    todo_id in (
      select id from public.todos
      where workspace_id in (select workspace_id from public.members where user_id = auth.uid())
    )
  );

create policy "Users can delete own comments"
  on public.comments for delete
  using (user_id = auth.uid());

-- ============================================
-- UPDATED_AT TRIGGER FOR TODOS
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_todo_updated
  before update on public.todos
  for each row execute function public.handle_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.members;
