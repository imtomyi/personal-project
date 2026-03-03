-- 수업 시간표: 과목별 요일/시간 스케줄 (standalone, courses FK 없음)
CREATE TABLE IF NOT EXISTS public.course_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_course_id integer,        -- Canvas 과목 ID (선택)
  course_name text NOT NULL,       -- 과목명
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=일..6=토
  time_start text NOT NULL,        -- "HH:MM" (예: "09:00")
  time_end text NOT NULL,          -- "HH:MM" (예: "10:15")
  location text,                   -- 강의실 (선택)
  color text DEFAULT '#4F46E5',    -- 블록 색상
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, course_name, day_of_week, time_start)
);

-- RLS
ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_sel" ON public.course_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cs_ins" ON public.course_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cs_upd" ON public.course_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "cs_del" ON public.course_schedules FOR DELETE
  USING (auth.uid() = user_id);
