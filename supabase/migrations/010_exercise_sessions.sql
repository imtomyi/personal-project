-- ============================================
-- EXERCISE SESSIONS TABLE
-- ============================================
CREATE TABLE public.exercise_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL, -- "YYYY-MM-DD" KST date
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cardio', 'strength', 'flexibility', 'sports', 'other')),
  duration_min integer NOT NULL DEFAULT 30,
  calories_burned integer DEFAULT NULL,
  sets integer DEFAULT NULL,
  reps integer DEFAULT NULL,
  memo text DEFAULT NULL,
  completed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

-- Index for efficient queries by user + date
CREATE INDEX idx_exercise_sessions_user_date
  ON public.exercise_sessions(user_id, date DESC);

-- RLS policies: users can only CRUD their own sessions
CREATE POLICY "Users can view own exercise sessions"
  ON public.exercise_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own exercise sessions"
  ON public.exercise_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own exercise sessions"
  ON public.exercise_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own exercise sessions"
  ON public.exercise_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_sessions;
