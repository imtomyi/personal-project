-- 워크스페이스 아카이브 기능
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
