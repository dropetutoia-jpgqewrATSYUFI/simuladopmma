-- Questão 4: Português - Concordância verbal
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Assinale a alternativa em que a concordância verbal está correta.',
  'Português',
  'Concordância verbal',
  'medium',
  'A concordância verbal exige que o verbo esteja de acordo com o núcleo do sujeito em número e pessoa. Na alternativa correta, o sujeito é plural e o verbo flexionado corretamente no plural.'
)
RETURNING id;

DO $$
DECLARE q4_id UUID;
BEGIN
  SELECT id INTO q4_id FROM public.quiz_questions WHERE statement LIKE 'Assinale a alternativa em que a concordância verbal%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q4_id, 'A', 'Havia muitos candidatos concorrendo às vagas.', 0, false),
    (q4_id, 'B', 'Faziam parte do edital as disciplinas de Direito e Administração.', 1, true),
    (q4_id, 'C', 'Restavam apenas duas horas para o término da prova.', 2, false),
    (q4_id, 'D', 'Existia várias questões sobre atualidades.', 3, false);
END $$;

-- Questão 5: Informática - Planilhas
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Em uma planilha eletrônica, qual função retorna o maior valor de um intervalo de células?',
  'Informática',
  'Planilhas eletrônicas',
  'easy',
  'A função MÁXIMO (ou MAX) retorna o maior valor numérico encontrado em um intervalo de células.'
)
RETURNING id;

DO $$
DECLARE q5_id UUID;
BEGIN
  SELECT id INTO q5_id FROM public.quiz_questions WHERE statement LIKE 'Em uma planilha eletrônica, qual função%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q5_id, 'A', 'MÍNIMO', 0, false),
    (q5_id, 'B', 'SOMA', 1, false),
    (q5_id, 'C', 'MÉDIA', 2, false),
    (q5_id, 'D', 'MÁXIMO', 3, true);
END $$;

-- Questão 6: Matemática - Porcentagem
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Um produto que custa R$ 500,00 sofreu um aumento de 20%. Qual é o novo preço?',
  'Matemática',
  'Porcentagem',
  'easy',
  '20% de R$ 500,00 é R$ 100,00. Somando ao preço original, o novo preço é R$ 600,00.'
)
RETURNING id;

DO $$
DECLARE q6_id UUID;
BEGIN
  SELECT id INTO q6_id FROM public.quiz_questions WHERE statement LIKE 'Um produto que custa R$ 500,00%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q6_id, 'A', 'R$ 520,00', 0, false),
    (q6_id, 'B', 'R$ 600,00', 1, true),
    (q6_id, 'C', 'R$ 620,00', 2, false),
    (q6_id, 'D', 'R$ 700,00', 3, false);
END $$;

-- Questão 7: Direito Constitucional
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'De acordo com a Constituição Federal de 1988, a administração pública direta e indireta obedece aos princípios da legalidade, impessoalidade, moralidade, publicidade e eficiência. Esse dispositivo encontra-se no artigo:',
  'Direito Constitucional',
  'Princípios da Administração Pública',
  'medium',
  'O art. 37, caput, da Constituição Federal estabelece os princípios da administração pública: legalidade, impessoalidade, moralidade, publicidade e eficiência.'
)
RETURNING id;

DO $$
DECLARE q7_id UUID;
BEGIN
  SELECT id INTO q7_id FROM public.quiz_questions WHERE statement LIKE 'De acordo com a Constituição Federal de 1988%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q7_id, 'A', 'Art. 5º', 0, false),
    (q7_id, 'B', 'Art. 37', 1, true),
    (q7_id, 'C', 'Art. 70', 2, false),
    (q7_id, 'D', 'Art. 144', 3, false);
END $$;

-- Questão 8: Administração
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Na teoria clássica da administração, Henri Fayol é reconhecido por:',
  'Administração',
  'Teoria clássica',
  'medium',
  'Henri Fayol é um dos principais representantes da teoria clássica da administração, destacando-se pelos princípios de administração e pelas funções administrativas.'
)
RETURNING id;

DO $$
DECLARE q8_id UUID;
BEGIN
  SELECT id INTO q8_id FROM public.quiz_questions WHERE statement LIKE 'Na teoria clássica da administração%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q8_id, 'A', 'Criar a linha de montagem e a produção em massa.', 0, false),
    (q8_id, 'B', 'Desenvolver os princípios de administração e as funções administrativas.', 1, true),
    (q8_id, 'C', 'Introduzir a teoria das relações humanas.', 2, false),
    (q8_id, 'D', 'Criar o estudo dos movimentos e tempos.', 3, false);
END $$;

-- Questão 9: Raciocínio Lógico
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Se todo A é B e algum B é C, então:',
  'Raciocínio Lógico',
  'Silogismos',
  'hard',
  'A partir das premissas "todo A é B" e "algum B é C", não se pode concluir necessariamente que algum A é C, pois os C podem estar em uma parte de B que não coincide com A.'
)
RETURNING id;

DO $$
DECLARE q9_id UUID;
BEGIN
  SELECT id INTO q9_id FROM public.quiz_questions WHERE statement LIKE 'Se todo A é B e algum B é C%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q9_id, 'A', 'Todo A é C.', 0, false),
    (q9_id, 'B', 'Algum A é C.', 1, false),
    (q9_id, 'C', 'Nada se pode concluir necessariamente sobre a relação entre A e C.', 2, true),
    (q9_id, 'D', 'Todo C é A.', 3, false);
END $$;

-- Questão 10: Atualidades
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'A Lei Geral de Proteção de Dados Pessoais (LGPD) no Brasil tem como base principal a proteção:',
  'Atualidades',
  'LGPD',
  'easy',
  'A LGPD (Lei nº 13.709/2018) tem como finalidade proteger os direitos fundamentais de liberdade, privacidade e o livre desenvolvimento da personalidade das pessoas naturais.'
)
RETURNING id;

DO $$
DECLARE q10_id UUID;
BEGIN
  SELECT id INTO q10_id FROM public.quiz_questions WHERE statement LIKE 'A Lei Geral de Proteção de Dados Pessoais%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q10_id, 'A', 'Da propriedade intelectual das empresas.', 0, false),
    (q10_id, 'B', 'Dos direitos fundamentais de liberdade e privacidade.', 1, true),
    (q10_id, 'C', 'Do acesso irrestrito à informação pública.', 2, false),
    (q10_id, 'D', 'Da concorrência entre empresas de tecnologia.', 3, false);
END $$;