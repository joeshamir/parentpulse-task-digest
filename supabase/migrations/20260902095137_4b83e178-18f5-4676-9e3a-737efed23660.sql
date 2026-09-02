CREATE TABLE public.user_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  privacy_accepted_at timestamptz NOT NULL DEFAULT now(),
  group_notice_accepted_at timestamptz NOT NULL DEFAULT now(),
  marketing_opt_in boolean NOT NULL DEFAULT false,
  locale text NOT NULL DEFAULT 'he',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own consents" ON public.user_consents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.privacy_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_task_retention_days smallint NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.privacy_prefs TO authenticated;
GRANT ALL ON public.privacy_prefs TO service_role;

ALTER TABLE public.privacy_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own privacy prefs" ON public.privacy_prefs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.purge_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.action_items ai
  USING public.privacy_prefs pp
  WHERE pp.user_id = ai.user_id
    AND ai.is_completed
    AND ai.created_at < now() - make_interval(days => pp.completed_task_retention_days);

  DELETE FROM public.action_items ai
  WHERE ai.is_completed
    AND NOT EXISTS (SELECT 1 FROM public.privacy_prefs pp WHERE pp.user_id = ai.user_id)
    AND ai.created_at < now() - interval '30 days';

  DELETE FROM public.action_items
  WHERE created_at < now() - interval '12 months';

  DELETE FROM public.daily_summaries
  WHERE created_at < now() - interval '90 days';

  DELETE FROM public.whatsapp_sessions
  WHERE status <> 'connected'
    AND updated_at < now() - interval '30 days';
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'parentpulse-purge-expired-data',
  '17 3 * * *',
  $$SELECT public.purge_expired_data();$$
);