-- ============================================
-- EXPENSES (가계부 - 소비 트래커)
-- ============================================

-- 카테고리 enum
create type expense_category as enum (
  'food', 'transport', 'shopping', 'cafe',
  'entertainment', 'education', 'health', 'other'
);

-- 지출 테이블
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null check (amount > 0),
  category expense_category default 'other' not null,
  memo text,
  date text not null,           -- "YYYY-MM-DD" KST
  created_at timestamptz default now() not null
);

alter table public.expenses enable row level security;

create policy "Users can view own expenses"
  on public.expenses for select using (auth.uid() = user_id);
create policy "Users can create own expenses"
  on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses"
  on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses"
  on public.expenses for delete using (auth.uid() = user_id);

-- 성능 인덱스: 월별 조회 최적화
create index idx_expenses_user_date on public.expenses (user_id, date);

-- ============================================
-- MONTHLY BUDGETS (월별 예산)
-- ============================================
create table public.monthly_budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  year_month text not null,      -- "YYYY-MM"
  budget_amount integer not null check (budget_amount > 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, year_month)
);

alter table public.monthly_budgets enable row level security;

create policy "Users can view own budgets"
  on public.monthly_budgets for select using (auth.uid() = user_id);
create policy "Users can create own budgets"
  on public.monthly_budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets"
  on public.monthly_budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets"
  on public.monthly_budgets for delete using (auth.uid() = user_id);

-- updated_at 트리거 (기존 함수 재사용)
create trigger on_monthly_budget_updated
  before update on public.monthly_budgets
  for each row execute function public.handle_updated_at();

-- Realtime 활성화
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.monthly_budgets;
