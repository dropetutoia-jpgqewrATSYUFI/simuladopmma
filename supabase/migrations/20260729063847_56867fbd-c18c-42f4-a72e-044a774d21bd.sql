ALTER TABLE public.pmma_campaigns
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS total_questions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_login boolean NOT NULL DEFAULT false;

UPDATE public.pmma_campaigns
SET description = 'Mini simulado gratuito com 40 questoes Certo ou Errado no estilo Cebraspe, com correcao explicada na hora.',
    total_questions = 40,
    display_order = 1
WHERE slug = 'simulado-pmma';

INSERT INTO public.pmma_campaigns
  (name, slug, status, questions_per_attempt, questions_per_discipline, lead_capture_after_question,
   bonus_enabled, offer_url, is_paid, price_cents, description, total_questions, display_order, requires_login)
VALUES
  ('Simulado Oficial PMMA - Prova 2017', 'pmma-oficial-2017', 'active', 120, 0, 0, false,
   'https://edital360.com/lp/preparatorio-pmma-2026-soldado', true, 3000,
   'Prova oficial da PMMA de 2017 na integra: 120 questoes com correcao comentada.', 120, 2, true),
  ('Simulado Estilo Cebraspe - 120 questoes', 'pmma-cebraspe-120', 'active', 120, 0, 0, false,
   'https://edital360.com/lp/preparatorio-pmma-2026-soldado', true, 3000,
   'Simulado completo no padrao Cebraspe: 120 questoes Certo ou Errado com gabarito comentado.', 120, 3, true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.pmma_attempts ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS pmma_attempts_user_idx ON public.pmma_attempts (user_id);