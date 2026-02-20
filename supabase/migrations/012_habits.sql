-- ============================================
-- 012: Habit tracker tables
-- ============================================

CREATE TABLE public.habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '✅',
  frequency text NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekdays', 'weekly')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.habit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,  -- "YYYY-MM-DD"
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (habit_id, date)
);

-- RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own habit_logs" ON public.habit_logs
  FOR ALL USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
