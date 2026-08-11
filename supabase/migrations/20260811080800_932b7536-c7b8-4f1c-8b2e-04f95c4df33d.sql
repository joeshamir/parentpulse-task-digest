ALTER TABLE public.whatsapp_sessions ADD COLUMN reconnect_requested_at timestamptz;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;