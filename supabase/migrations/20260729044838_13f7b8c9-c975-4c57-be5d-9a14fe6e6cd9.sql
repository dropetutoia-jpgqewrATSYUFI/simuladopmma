-- Questão 11: Legislação Estadual/PMMA
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'O Estado do Maranhão está localizado na região:',
  'Legislação Estadual',
  'Geografia e organização política do Maranhão',
  'easy',
  'O Maranhão está situado na Região Nordeste do Brasil, sendo o segundo maior estado da região em extensão territorial.'
)
RETURNING id;

DO $$
DECLARE q11_id UUID;
BEGIN
  SELECT id INTO q11_id FROM public.quiz_questions WHERE statement LIKE 'O Estado do Maranhão está localizado%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q11_id, 'A', 'Norte', 0, false),
    (q11_id, 'B', 'Nordeste', 1, true),
    (q11_id, 'C', 'Centro-Oeste', 2, false),
    (q11_id, 'D', 'Sudeste', 3, false);
END $$;

-- Questão 12: Direito Administrativo
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'A licitação é o procedimento administrativo destinado a assegurar:',
  'Direito Administrativo',
  'Licitação',
  'medium',
  'A licitação visa garantir a observância do princípio constitucional da isonomia, a seleção da proposta mais vantajosa para a administração e a promoção do desenvolvimento nacional sustentável.'
)
RETURNING id;

DO $$
DECLARE q12_id UUID;
BEGIN
  SELECT id INTO q12_id FROM public.quiz_questions WHERE statement LIKE 'A licitação é o procedimento administrativo%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q12_id, 'A', 'A contratação direta de empresas indicadas pelo gestor.', 0, false),
    (q12_id, 'B', 'A isonomia, a vantajosidade da proposta e o desenvolvimento nacional sustentável.', 1, true),
    (q12_id, 'C', 'A dispensa de regras formais para contratos de pequeno valor.', 2, false),
    (q12_id, 'D', 'A contratação exclusiva de empresas estatais.', 3, false);
END $$;

-- Questão 13: Direito Constitucional
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'A Constituição Federal de 1988 estabelece que a União, os Estados, o Distrito Federal e os Municípios manterão:',
  'Direito Constitucional',
  'Controle externo',
  'medium',
  'O art. 70 da CF/88 prevê o controle externo a ser exercido pelos Poderes Legislativos, com auxílio dos Tribunais de Contas.'
)
RETURNING id;

DO $$
DECLARE q13_id UUID;
BEGIN
  SELECT id INTO q13_id FROM public.quiz_questions WHERE statement LIKE 'A Constituição Federal de 1988 estabelece que a União%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q13_id, 'A', 'Sistema próprio de controle interno, sem interferência de outros entes.', 0, false),
    (q13_id, 'B', 'Tribunais de Contas responsáveis unicamente pela fiscalização do Poder Executivo.', 1, false),
    (q13_id, 'C', 'Controle externo, a ser exercido pelos Poderes Legislativos, com auxílio dos Tribunais de Contas.', 2, true),
    (q13_id, 'D', 'Apenas auditorias internas anuais realizadas pelo Poder Judiciário.', 3, false);
END $$;

-- Questão 14: Matemática
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Um funcionário recebe R$ 2.400,00 por mês. Se ele gastar 30% com aluguel, quanto sobrará para outras despesas?',
  'Matemática',
  'Porcentagem',
  'easy',
  '30% de R$ 2.400,00 é R$ 720,00. O valor restante é R$ 2.400,00 - R$ 720,00 = R$ 1.680,00.'
)
RETURNING id;

DO $$
DECLARE q14_id UUID;
BEGIN
  SELECT id INTO q14_id FROM public.quiz_questions WHERE statement LIKE 'Um funcionário recebe R$ 2.400,00%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q14_id, 'A', 'R$ 1.680,00', 0, true),
    (q14_id, 'B', 'R$ 1.720,00', 1, false),
    (q14_id, 'C', 'R$ 1.800,00', 2, false),
    (q14_id, 'D', 'R$ 2.000,00', 3, false);
END $$;

-- Questão 15: Informática
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Qual é a extensão padrão de arquivos criados no Microsoft Word?',
  'Informática',
  'Editores de texto',
  'easy',
  'O Microsoft Word utiliza a extensão .docx como padrão para documentos a partir da versão 2007.'
)
RETURNING id;

DO $$
DECLARE q15_id UUID;
BEGIN
  SELECT id INTO q15_id FROM public.quiz_questions WHERE statement LIKE 'Qual é a extensão padrão de arquivos criados%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q15_id, 'A', '.xlsx', 0, false),
    (q15_id, 'B', '.pptx', 1, false),
    (q15_id, 'C', '.docx', 2, true),
    (q15_id, 'D', '.pdf', 3, false);
END $$;

-- Questão 16: Português
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Assinale a alternativa em que o uso da crase está correto.',
  'Português',
  'Crase',
  'medium',
  'A crase ocorre pela fusão da preposição "a" com o artigo feminino "a". Na alternativa correta, há a preposição "a" exigida pelo verbo/regime e o artigo definido feminino.'
)
RETURNING id;

DO $$
DECLARE q16_id UUID;
BEGIN
  SELECT id INTO q16_id FROM public.quiz_questions WHERE statement LIKE 'Assinale a alternativa em que o uso da crase%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q16_id, 'A', 'Fui a praia no domingo.', 0, false),
    (q16_id, 'B', 'Cheguei a cidade ontem à noite.', 1, true),
    (q16_id, 'C', 'Entreguei o documento a secretária.', 2, false),
    (q16_id, 'D', 'Refiro-me a problemas administrativos.', 3, false);
END $$;

-- Questão 17: Raciocínio Lógico
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'Em uma progressão aritmética, o primeiro termo é 3 e a razão é 4. Qual é o quinto termo?',
  'Raciocínio Lógico',
  'Progressão aritmética',
  'medium',
  'Na progressão aritmética, a_n = a_1 + (n-1) * r. Logo, a_5 = 3 + (5-1) * 4 = 3 + 16 = 19.'
)
RETURNING id;

DO $$
DECLARE q17_id UUID;
BEGIN
  SELECT id INTO q17_id FROM public.quiz_questions WHERE statement LIKE 'Em uma progressão aritmética, o primeiro termo%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q17_id, 'A', '15', 0, false),
    (q17_id, 'B', '17', 1, false),
    (q17_id, 'C', '19', 2, true),
    (q17_id, 'D', '23', 3, false);
END $$;

-- Questão 18: Administração
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'O ciclo de gestão da qualidade PDCA é composto pelas etapas:',
  'Administração',
  'Gestão da qualidade',
  'medium',
  'O ciclo PDCA (Plan-Do-Check-Act) corresponde a Planejar, Executar, Verificar e Agir.'
)
RETURNING id;

DO $$
DECLARE q18_id UUID;
BEGIN
  SELECT id INTO q18_id FROM public.quiz_questions WHERE statement LIKE 'O ciclo de gestão da qualidade PDCA%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q18_id, 'A', 'Planejar, Executar, Verificar e Agir.', 0, true),
    (q18_id, 'B', 'Produzir, Distribuir, Controlar e Avaliar.', 1, false),
    (q18_id, 'C', 'Planejar, Desenvolver, Controlar e Analisar.', 2, false),
    (q18_id, 'D', 'Programar, Dirigir, Coordenar e Avaliar.', 3, false);
END $$;

-- Questão 19: Atualidades
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'O Plano Plurianual (PPA) é instrumento de planejamento governamental com vigência de:',
  'Atualidades',
  'Planejamento governamental',
  'medium',
  'O PPA estabelece, de forma regionalizada, as diretrizes, objetivos e metas da administração pública federal para o período de quatro anos.'
)
RETURNING id;

DO $$
DECLARE q19_id UUID;
BEGIN
  SELECT id INTO q19_id FROM public.quiz_questions WHERE statement LIKE 'O Plano Plurianual (PPA) é instrumento%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q19_id, 'A', 'Um ano.', 0, false),
    (q19_id, 'B', 'Dois anos.', 1, false),
    (q19_id, 'C', 'Quatro anos.', 2, true),
    (q19_id, 'D', 'Seis anos.', 3, false);
END $$;

-- Questão 20: Conhecimentos Específicos
INSERT INTO public.quiz_questions (statement, discipline, topic, difficulty, explanation)
VALUES (
  'No âmbito da administração pública maranhense, o Plano de Cargos, Carreiras e Salários (PCCS) tem como objetivo principal:',
  'Conhecimentos Específicos',
  'Gestão de pessoas',
  'medium',
  'O PCCS busca estruturar as carreiras dos servidores públicos, definindo critérios de ingresso, progressão e remuneração de forma transparente.'
)
RETURNING id;

DO $$
DECLARE q20_id UUID;
BEGIN
  SELECT id INTO q20_id FROM public.quiz_questions WHERE statement LIKE 'No âmbito da administração pública maranhense%';
  INSERT INTO public.quiz_options (question_id, label, option_text, position, is_correct)
  VALUES
    (q20_id, 'A', 'Permitir nomeações políticas sem critérios técnicos.', 0, false),
    (q20_id, 'B', 'Estruturar carreiras, critérios de ingresso, progressão e remuneração.', 1, true),
    (q20_id, 'C', 'Eliminar concursos públicos para cargos temporários.', 2, false),
    (q20_id, 'D', 'Garantir vantagens exclusivas a servidores comissionados.', 3, false);
END $$;