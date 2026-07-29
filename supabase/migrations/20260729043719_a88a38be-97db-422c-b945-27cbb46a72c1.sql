-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Tabela de papéis (separada de profiles, conforme guideline de segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Função security definer para verificar papel sem recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

-- Perfis dos usuários
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    city TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Questões do quiz/simulado
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discipline TEXT NOT NULL,
    topic TEXT,
    statement TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    year INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quiz_questions TO anon;
GRANT SELECT ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active questions"
ON public.quiz_questions
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Alternativas das questões
CREATE TABLE public.quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    option_text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quiz_options TO anon;
GRANT SELECT ON public.quiz_options TO authenticated;
GRANT ALL ON public.quiz_options TO service_role;

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read options of active questions"
ON public.quiz_options
FOR SELECT
TO anon, authenticated
USING (EXISTS (
    SELECT 1 FROM public.quiz_questions q
    WHERE q.id = question_id AND q.is_active = true
));

CREATE POLICY "Admins can manage options"
ON public.quiz_options
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tentativas de quiz/simulado
CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'quiz',
    status TEXT NOT NULL DEFAULT 'started',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    lead_city TEXT,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    consent_privacy BOOLEAN NOT NULL DEFAULT false,
    source TEXT DEFAULT 'diagnostico-pmma',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attempt owners can read own attempts"
ON public.quiz_attempts
FOR SELECT
TO anon, authenticated
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can create an attempt"
ON public.quiz_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Attempt owners can update own attempts"
ON public.quiz_attempts
FOR UPDATE
TO anon, authenticated
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

-- Respostas marcadas
CREATE TABLE public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.quiz_options(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, question_id)
);

GRANT SELECT, INSERT, UPDATE ON public.quiz_answers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attempt owners can read own answers"
ON public.quiz_answers
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id
          AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Anyone can insert an answer"
ON public.quiz_answers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Attempt owners can update own answers"
ON public.quiz_answers
FOR UPDATE
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id
          AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id
          AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- Resultados calculados
CREATE TABLE public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    blank_count INTEGER NOT NULL DEFAULT 0,
    score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    estimated_rank TEXT,
    recommendation TEXT,
    passed BOOLEAN NOT NULL DEFAULT false,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.quiz_results TO anon;
GRANT SELECT, INSERT, UPDATE ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attempt owners can read own results"
ON public.quiz_results
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id
          AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Anyone can insert a result"
ON public.quiz_results
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Attempt owners can update own results"
ON public.quiz_results
FOR UPDATE
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id
          AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quiz_attempts a
        WHERE a.id = attempt_id
          AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- Leads capturados pelo funil
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    consent_marketing BOOLEAN NOT NULL DEFAULT false,
    consent_privacy BOOLEAN NOT NULL DEFAULT false,
    source TEXT DEFAULT 'diagnostico-pmma',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead owners can read own leads"
ON public.leads
FOR SELECT
TO anon, authenticated
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can create a lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Lead owners can update own leads"
ON public.leads
FOR UPDATE
TO anon, authenticated
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

-- Triggers de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Questões demonstrativas
INSERT INTO public.quiz_questions (discipline, topic, statement, explanation, difficulty, year, position, is_demo, is_active)
VALUES
('Português', 'Interpretação de texto', 'Leia o trecho: "A educação é a arma mais poderosa que você pode usar para mudar o mundo." A afirmação enfatiza que a educação:', 'A frase destaca o poder transformador da educação na sociedade.', 'easy', 2024, 1, true, true),
('Informática', 'Microsoft Word', 'No Microsoft Word, qual atalho é usado para salvar um documento?', 'O atalho Ctrl+S salva o documento rapidamente.', 'easy', 2024, 2, true, true),
('Matemática', 'Raciocínio lógico', 'Se todos os A são B e alguns B são C, então:', 'Premissa válida de silogismo lógico.', 'medium', 2024, 3, true, true);

-- Alternativas demonstrativas
INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'a', 'é um direito garantido por lei', 1, false FROM public.quiz_questions WHERE position = 1;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'b', 'é capaz de transformar a realidade social', 2, true FROM public.quiz_questions WHERE position = 1;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'c', 'deve ser oferecida apenas nas escolas públicas', 3, false FROM public.quiz_questions WHERE position = 1;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'd', 'é obrigatória apenas até os 14 anos', 4, false FROM public.quiz_questions WHERE position = 1;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'a', 'Ctrl + S', 1, true FROM public.quiz_questions WHERE position = 2;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'b', 'Ctrl + P', 2, false FROM public.quiz_questions WHERE position = 2;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'c', 'Ctrl + N', 3, false FROM public.quiz_questions WHERE position = 2;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'd', 'Ctrl + O', 4, false FROM public.quiz_questions WHERE position = 2;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'a', 'todos os A são C', 1, false FROM public.quiz_questions WHERE position = 3;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'b', 'alguns A são C', 2, true FROM public.quiz_questions WHERE position = 3;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'c', 'nenhum A é C', 3, false FROM public.quiz_questions WHERE position = 3;

INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
SELECT id, 'd', 'todos os C são A', 4, false FROM public.quiz_questions WHERE position = 3;