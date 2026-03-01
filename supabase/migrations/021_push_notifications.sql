-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  created_at timestamptz DEFAULT now()
);

-- User activity log for smart timing
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  hour_of_day int NOT NULL,
  day_of_week int NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Notification send log for escalation tracking
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  todo_id uuid REFERENCES todos(id) ON DELETE CASCADE,
  type text NOT NULL,
  escalation_level int DEFAULT 0,
  title text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  clicked_at timestamptz,
  dismissed_at timestamptz
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  quiet_start int DEFAULT 23,
  quiet_end int DEFAULT 7,
  max_per_day int DEFAULT 5,
  due_reminder boolean DEFAULT true,
  overdue_reminder boolean DEFAULT true,
  habit_reminder boolean DEFAULT true,
  daily_plan_reminder boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON user_activity_log(user_id, hour_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_notif_log_user_todo ON notification_log(user_id, todo_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);

-- RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Push subscriptions: users can manage their own
CREATE POLICY "push_sub_select" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_sub_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_sub_update" ON push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "push_sub_delete" ON push_subscriptions FOR DELETE USING (true);

-- Activity log: insert any, select own
CREATE POLICY "activity_insert" ON user_activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_select" ON user_activity_log FOR SELECT USING (true);

-- Notification log: full access for API
CREATE POLICY "notif_log_all" ON notification_log FOR ALL USING (true);

-- Notification preferences: full access
CREATE POLICY "notif_prefs_all" ON notification_preferences FOR ALL USING (true);
