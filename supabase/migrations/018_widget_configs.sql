-- ============================================
-- WIDGET CONFIGS TABLE
-- 위젯 표시/순서 설정을 계정에 연동
-- ============================================
CREATE TABLE public.widget_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_key text NOT NULL,           -- e.g. "ws_widget_config"
  widget_id text NOT NULL,            -- e.g. "exercise", "dday", "habit"
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, config_key, widget_id)
);

ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_widget_configs_user_key
  ON public.widget_configs(user_id, config_key);

-- RLS policies
CREATE POLICY "Users can view own widget configs"
  ON public.widget_configs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own widget configs"
  ON public.widget_configs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own widget configs"
  ON public.widget_configs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own widget configs"
  ON public.widget_configs FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_configs;
