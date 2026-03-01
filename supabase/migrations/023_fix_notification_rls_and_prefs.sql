-- ============================================
-- 023: 알림 테이블 RLS 보안 강화 + 새 알림 유형 선호 컬럼 추가
-- ============================================

-- ─── 1. push_subscriptions: 자기 구독만 관리 가능 ───────────────
DROP POLICY IF EXISTS "push_sub_select" ON push_subscriptions;
DROP POLICY IF EXISTS "push_sub_insert" ON push_subscriptions;
DROP POLICY IF EXISTS "push_sub_update" ON push_subscriptions;
DROP POLICY IF EXISTS "push_sub_delete" ON push_subscriptions;

CREATE POLICY "push_sub_select" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_sub_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_sub_update" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_sub_delete" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- ─── 2. user_activity_log: 자기 활동만 조회/기록 ─────────────────
DROP POLICY IF EXISTS "activity_insert" ON user_activity_log;
DROP POLICY IF EXISTS "activity_select" ON user_activity_log;

CREATE POLICY "activity_insert" ON user_activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "activity_select" ON user_activity_log
  FOR SELECT USING (user_id = auth.uid());

-- ─── 3. notification_log: 자기 알림 기록만 접근 ──────────────────
DROP POLICY IF EXISTS "notif_log_all" ON notification_log;

CREATE POLICY "notif_log_select" ON notification_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_log_insert" ON notification_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_log_update" ON notification_log
  FOR UPDATE USING (user_id = auth.uid());

-- ─── 4. notification_preferences: 자기 설정만 접근 ───────────────
DROP POLICY IF EXISTS "notif_prefs_all" ON notification_preferences;

CREATE POLICY "notif_prefs_select" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_insert" ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs_update" ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- ─── 5. 새 알림 유형 선호 컬럼 추가 ─────────────────────────────
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS exercise_reminder boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dday_reminder boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS goal_reminder boolean DEFAULT true;
