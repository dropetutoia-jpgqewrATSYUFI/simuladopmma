ALTER TABLE public.pmma_attempts ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS device_fingerprint text;
CREATE INDEX IF NOT EXISTS pmma_attempts_device_fingerprint_idx ON public.pmma_attempts (device_fingerprint);
CREATE INDEX IF NOT EXISTS donations_device_fingerprint_idx ON public.donations (device_fingerprint);