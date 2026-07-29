CREATE TABLE IF NOT EXISTS public.simulado_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.pmma_campaigns(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'blocked',
  released_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

GRANT SELECT ON public.simulado_access TO authenticated;
GRANT ALL ON public.simulado_access TO service_role;

ALTER TABLE public.simulado_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own simulado access"
ON public.simulado_access FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_simulado_access_updated_at
BEFORE UPDATE ON public.simulado_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ensure_simulado_access(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.simulado_access (user_id, campaign_id, status)
  SELECT _user_id, c.id, 'blocked'
  FROM public.pmma_campaigns c
  WHERE c.is_paid = true
  ON CONFLICT (user_id, campaign_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.release_simulado_access(_user_id uuid, _campaign_id uuid, _source text DEFAULT 'purchase')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.simulado_access (user_id, campaign_id, status, released_at, source)
  VALUES (_user_id, _campaign_id, 'released', now(), _source)
  ON CONFLICT (user_id, campaign_id)
  DO UPDATE SET status = 'released', released_at = now(), source = _source, updated_at = now();
$$;

INSERT INTO public.simulado_access (user_id, campaign_id, status, released_at, source)
SELECT p.user_id, p.campaign_id, 'released', COALESCE(p.paid_at, now()), 'purchase'
FROM public.purchases p
WHERE p.status = 'approved'
ON CONFLICT (user_id, campaign_id)
DO UPDATE SET status = 'released', released_at = now(), source = 'purchase';