-- Add parent_id column for subtask support
alter table public.todos
  add column parent_id uuid references public.todos(id) on delete cascade;

-- Index for fast subtask lookups
create index idx_todos_parent_id on public.todos(parent_id);
