-- Ajusta políticas de INSERT para não serem 'true' genérico
DROP POLICY IF EXISTS "Anyone can create an attempt" ON public.quiz_attempts;
CREATE POLICY "Anyone can create a new started attempt"
ON public.quiz_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'started' AND type IN ('quiz', 'simulado'));

DROP POLICY IF EXISTS "Anyone can insert an answer" ON public.quiz_answers;
CREATE POLICY "Anyone can answer an open attempt"
ON public.quiz_answers
FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id AND a.status = 'started'
    )
);

DROP POLICY IF EXISTS "Anyone can insert a result" ON public.quiz_results;
CREATE POLICY "Anyone can insert result for finished attempt"
ON public.quiz_results
FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id AND a.status = 'finished'
    )
);

DROP POLICY IF EXISTS "Anyone can create a lead" ON public.leads;
CREATE POLICY "Anyone can create a lead with privacy consent"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (consent_privacy = true);

-- Garante que a função has_role permanece acessível para regras de anon/authenticated
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;