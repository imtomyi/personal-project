-- ============================================
-- 014: Goals system
-- ============================================

CREATE TABLE public.goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '🎯',
  target_date text,            -- "YYYY-MM-DD" (optional)
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
