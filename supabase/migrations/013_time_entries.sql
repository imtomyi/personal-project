-- ============================================
-- 013: Time tracking entries
-- ============================================

CREATE TABLE public.time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,        -- NULL = currently running
  duration_sec integer,        -- computed: ended_at - started_at (seconds)
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own time_entries" ON public.time_entries
  FOR ALL USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
