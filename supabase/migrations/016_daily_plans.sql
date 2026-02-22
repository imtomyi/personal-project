-- ============================================
-- 016: Daily planning / triage system
-- 일일 계획 — 할 일을 오늘 시간표에 배치
-- ============================================

CREATE TABLE public.daily_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  date text NOT NULL,                         -- "YYYY-MM-DD"
  estimated_minutes integer NOT NULL          -- 30, 60, 90, 120, 150, 180
    CHECK (estimated_minutes >= 0 AND estimated_minutes <= 480),
  scheduled_start_min integer,                -- 자정 기준 분 (540 = 09:00), auto-assign 전 null
  scheduled_end_min integer,
  is_skipped boolean NOT NULL DEFAULT false,  -- "오늘 안 함"
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (todo_id, date)
);

-- RLS
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_plans" ON public.daily_plans
  FOR ALL USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_plans;

-- Index
CREATE INDEX idx_daily_plans_user_date ON public.daily_plans(user_id, date);
