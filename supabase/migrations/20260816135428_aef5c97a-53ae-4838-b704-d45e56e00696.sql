CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_summary_enabled boolean NOT NULL DEFAULT false,
  send_hour_local smallint NOT NULL DEFAULT 8,
  timezone text NOT NULL DEFAULT 'Asia/Jerusalem',
  last_sent_on date,
  test_requested_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notification prefs" ON public.notification_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);