-- ============================================
-- ADD PRIORITY COLUMN TO TODOS
-- ============================================
-- Values: 1 (P1/urgent), 2 (P2/high), 3 (P3/medium), 4 (P4/low), null (no priority)
alter table public.todos
  add column priority smallint default null;

alter table public.todos
  add constraint todos_priority_check check (priority in (1, 2, 3, 4));

-- Partial index for todos with a priority set
create index idx_todos_priority on public.todos(priority) where priority is not null;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('mention', 'assignment', 'reminder', 'comment')),
  title text not null,
  body text,
  link text,
  is_read boolean default false not null,
  todo_id uuid references public.todos(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.notifications enable row level security;

-- Composite index for efficient notification queries
create index idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

-- Policies: users can read and delete their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

-- Allow inserts from authenticated users (for creating notifications for others)
create policy "Authenticated users can create notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- Allow users to mark their own notifications as read
create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- ============================================
-- REMINDERS TABLE
-- ============================================
create table public.reminders (
  id uuid default gen_random_uuid() primary key,
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  remind_at timestamptz not null,
  is_sent boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.reminders enable row level security;

-- Composite index for efficient reminder queries (e.g., finding unsent reminders due)
create index idx_reminders_user_sent_remind_at
  on public.reminders(user_id, is_sent, remind_at);

-- Policies: users can CRUD their own reminders
create policy "Users can view own reminders"
  on public.reminders for select
  using (user_id = auth.uid());

create policy "Users can create own reminders"
  on public.reminders for insert
  with check (user_id = auth.uid());

create policy "Users can update own reminders"
  on public.reminders for update
  using (user_id = auth.uid());

create policy "Users can delete own reminders"
  on public.reminders for delete
  using (user_id = auth.uid());

-- ============================================
-- ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================
alter publication supabase_realtime add table public.notifications;
