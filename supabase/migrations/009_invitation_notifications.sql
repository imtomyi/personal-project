-- ============================================
-- ADD 'invitation' TYPE TO NOTIFICATIONS
-- ============================================

-- Drop and recreate the type check constraint to include 'invitation'
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('mention', 'assignment', 'reminder', 'comment', 'invitation'));

-- ============================================
-- ADD STATUS COLUMN FOR INVITATION TRACKING
-- ============================================
-- status is only meaningful for type='invitation' rows; null for all other types
ALTER TABLE public.notifications
  ADD COLUMN status text DEFAULT NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IS NULL OR status IN ('pending', 'accepted', 'declined'));

-- ============================================
-- PREVENT DUPLICATE PENDING INVITATIONS
-- ============================================
-- A user can only have one pending invitation per workspace at a time
CREATE UNIQUE INDEX idx_unique_pending_invitation
  ON public.notifications(user_id, workspace_id)
  WHERE type = 'invitation' AND status = 'pending';
