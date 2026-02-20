-- ============================================
-- 015: Recurring tasks + schedule support
-- ============================================

CREATE TABLE public.recurring_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  priority integer CHECK (priority IN (1, 2, 3, 4)),
  recurrence text NOT NULL DEFAULT 'daily'
    CHECK (recurrence IN ('daily', 'weekdays', 'weekly', 'custom')),
  days_of_week integer[] DEFAULT '{}'::integer[],  -- 0=Sun..6=Sat
  time_start text,              -- "HH:mm" (e.g. "09:00")
  time_end text,                -- "HH:mm" (e.g. "10:30")
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring_tasks" ON public.recurring_tasks
  FOR ALL USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_tasks;

-- todos 테이블에 recurring_task_id 추가 (자동 생성된 할일 추적용)
ALTER TABLE public.todos
  ADD COLUMN recurring_task_id uuid REFERENCES public.recurring_tasks(id) ON DELETE SET NULL;
