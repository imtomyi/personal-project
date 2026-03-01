-- D-Day 아카이브 기능
ALTER TABLE public.dday_entries
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
