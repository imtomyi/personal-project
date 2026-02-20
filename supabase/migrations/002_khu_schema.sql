-- ============================================
-- COURSES (개인 과목 관리)
-- ============================================
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  professor text,
  color text default '#3B82F6' not null,
  semester text,
  created_at timestamptz default now() not null
);

alter table public.courses enable row level security;

create policy "Users can view own courses"
  on public.courses for select using (auth.uid() = user_id);
create policy "Users can create own courses"
  on public.courses for insert with check (auth.uid() = user_id);
create policy "Users can update own courses"
  on public.courses for update using (auth.uid() = user_id);
create policy "Users can delete own courses"
  on public.courses for delete using (auth.uid() = user_id);

-- ============================================
-- ASSIGNMENTS (과제/시험/퀴즈 관리)
-- ============================================
create type assignment_type as enum ('assignment', 'exam', 'quiz', 'project', 'other');

create table public.assignments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  type assignment_type default 'assignment' not null,
  due_date timestamptz,
  is_completed boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.assignments enable row level security;

create policy "Users can view own assignments"
  on public.assignments for select using (auth.uid() = user_id);
create policy "Users can create own assignments"
  on public.assignments for insert with check (auth.uid() = user_id);
create policy "Users can update own assignments"
  on public.assignments for update using (auth.uid() = user_id);
create policy "Users can delete own assignments"
  on public.assignments for delete using (auth.uid() = user_id);

-- updated_at 트리거 (기존 함수 재사용)
create trigger on_assignment_updated
  before update on public.assignments
  for each row execute function public.handle_updated_at();

-- Realtime 활성화
alter publication supabase_realtime add table public.assignments;
alter publication supabase_realtime add table public.courses;
