-- ============================================
-- D-Day entries (localStorage → DB 마이그레이션)
-- ============================================
CREATE TABLE public.dday_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date text NOT NULL,
  emoji text NOT NULL DEFAULT '📌',
  color text NOT NULL DEFAULT 'blue',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.dday_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dday_entries"
  ON public.dday_entries FOR ALL
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dday_entries;

CREATE INDEX idx_dday_entries_user ON public.dday_entries(user_id);

-- ============================================
-- Goal ↔ Todo 연결
-- ============================================
ALTER TABLE public.todos
  ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE INDEX idx_todos_goal_id ON public.todos(goal_id) WHERE goal_id IS NOT NULL;
