ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS donations_user_id_idx ON public.donations (user_id);
CREATE INDEX IF NOT EXISTS donations_fingerprint_idx ON public.donations (device_fingerprint);
CREATE INDEX IF NOT EXISTS pmma_attempts_user_id_idx ON public.pmma_attempts (user_id);
CREATE INDEX IF NOT EXISTS pmma_attempts_fingerprint_idx ON public.pmma_attempts (device_fingerprint);