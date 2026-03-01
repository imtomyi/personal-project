-- ============================================
-- 024: todos 테이블에 due_time 컬럼 추가
-- 시간 선호 설정 (예: "14:30"), 시간표 자동 배치에 사용
-- ============================================

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS due_time text DEFAULT NULL;
