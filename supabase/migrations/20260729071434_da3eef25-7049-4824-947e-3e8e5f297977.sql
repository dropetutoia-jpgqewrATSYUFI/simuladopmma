ALTER TABLE public.pmma_questions
  ADD COLUMN IF NOT EXISTS answer_status text NOT NULL DEFAULT 'definitivo';

ALTER TABLE public.pmma_questions
  DROP CONSTRAINT IF EXISTS pmma_questions_answer_status_check;

ALTER TABLE public.pmma_questions
  ADD CONSTRAINT pmma_questions_answer_status_check
  CHECK (answer_status IN ('definitivo', 'anulada', 'pendente'));

-- índice único por número original é validado na importação