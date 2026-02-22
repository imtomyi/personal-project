-- ============================================
-- 020: D-Day → 시간표 연동
-- dday_entries에 소요 시간 컬럼 추가
-- ============================================

ALTER TABLE public.dday_entries
  ADD COLUMN IF NOT EXISTS estimated_minutes integer NOT NULL DEFAULT 30
    CHECK (estimated_minutes >= 10 AND estimated_minutes <= 480);
