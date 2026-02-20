-- =============================================
-- 006: 워크스페이스 색상 + 과목/과제 테이블 생성 + Canvas 연동
-- =============================================

-- 1. 워크스페이스에 색상 필드 추가
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'blue';

-- ============================================
-- 2. COURSES (과목 관리) — 테이블이 없으면 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  professor text,
  color text default '#3B82F6' not null,
  semester text,
  created_at timestamptz default now() not null,
  canvas_course_id integer unique,
  workspace_id uuid references public.workspaces(id) on delete set null
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (IF NOT EXISTS 대신 DO $$ 블록)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Users can view own courses') THEN
    CREATE POLICY "Users can view own courses"
      ON public.courses FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Users can create own courses') THEN
    CREATE POLICY "Users can create own courses"
      ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Users can update own courses') THEN
    CREATE POLICY "Users can update own courses"
      ON public.courses FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Users can delete own courses') THEN
    CREATE POLICY "Users can delete own courses"
      ON public.courses FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 기존 courses 테이블에 새 컬럼 추가 (이미 있으면 무시)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS canvas_course_id integer UNIQUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================
-- 3. ASSIGNMENTS (과제 관리) — 테이블이 없으면 생성
-- ============================================

-- enum 타입이 없으면 생성
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
    CREATE TYPE assignment_type AS ENUM ('assignment', 'exam', 'quiz', 'project', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  type assignment_type default 'assignment' not null,
  due_date date,
  is_completed boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  canvas_assignment_id integer unique
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'Users can view own assignments') THEN
    CREATE POLICY "Users can view own assignments"
      ON public.assignments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'Users can create own assignments') THEN
    CREATE POLICY "Users can create own assignments"
      ON public.assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'Users can update own assignments') THEN
    CREATE POLICY "Users can update own assignments"
      ON public.assignments FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'Users can delete own assignments') THEN
    CREATE POLICY "Users can delete own assignments"
      ON public.assignments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 기존 assignments 테이블에 새 컬럼 추가 (이미 있으면 무시)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS canvas_assignment_id integer UNIQUE;

-- updated_at 트리거 (기존 함수 재사용, 이미 있으면 무시)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_assignment_updated'
  ) THEN
    CREATE TRIGGER on_assignment_updated
      BEFORE UPDATE ON public.assignments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- ============================================
-- 4. Realtime 활성화 (이미 있으면 무시)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'courses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
  END IF;
END $$;
