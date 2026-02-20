-- ============================================
-- 011: Kanban board status column
-- ============================================

-- todos 테이블에 status 컬럼 추가
ALTER TABLE public.todos
  ADD COLUMN status text NOT NULL DEFAULT 'todo'
  CHECK (status IN ('todo', 'in_progress', 'done'));

-- is_completed가 true인 기존 할일 → status = 'done'
UPDATE public.todos SET status = 'done' WHERE is_completed = true;
