
-- ============ CAMPANHAS ============
CREATE TABLE public.pmma_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  questions_per_attempt integer NOT NULL DEFAULT 14,
  questions_per_discipline integer NOT NULL DEFAULT 2,
  lead_capture_after_question integer NOT NULL DEFAULT 4,
  bonus_enabled boolean NOT NULL DEFAULT true,
  product_id text,
  offer_url text NOT NULL DEFAULT 'https://edital360.com/lp/preparatorio-pmma-2026-soldado',
  whatsapp_number text,
  paused_message text,
  start_at timestamptz,
  end_at timestamptz,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmma_campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pmma_campaigns TO authenticated;
ALTER TABLE public.pmma_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.pmma_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ QUESTOES ============
CREATE TABLE public.pmma_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_code text NOT NULL UNIQUE,
  original_reference text,
  campaign_id uuid REFERENCES public.pmma_campaigns(id) ON DELETE SET NULL,
  discipline text NOT NULL,
  topic text,
  statement text NOT NULL,
  correct_answer boolean NOT NULL,
  feedback_correct text NOT NULL,
  feedback_wrong text NOT NULL,
  key_point text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medio',
  source_name text,
  source_type text,
  pedagogical_review_status text NOT NULL DEFAULT 'pendente',
  legal_review_status text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmma_questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmma_questions TO authenticated;
ALTER TABLE public.pmma_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage questions" ON public.pmma_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ LEADS ============
CREATE TABLE public.pmma_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  whatsapp_e164 text NOT NULL,
  email text,
  consent boolean NOT NULL DEFAULT false,
  consent_text_version text,
  consent_text text,
  consent_at timestamptz,
  source text DEFAULT 'simulado-pmma',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  partner_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmma_leads TO service_role;
GRANT SELECT ON public.pmma_leads TO authenticated;
ALTER TABLE public.pmma_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read leads" ON public.pmma_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ TENTATIVAS ============
CREATE TABLE public.pmma_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_session_id text,
  lead_id uuid REFERENCES public.pmma_leads(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.pmma_campaigns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'started',
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  lead_captured_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  current_question_index integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  bonus_answered boolean NOT NULL DEFAULT false,
  bonus_correct boolean,
  device_type text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  partner_code text,
  headline_variant text,
  cta_variant text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmma_attempts TO service_role;
GRANT SELECT ON public.pmma_attempts TO authenticated;
ALTER TABLE public.pmma_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read attempts" ON public.pmma_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ QUESTOES DA TENTATIVA ============
CREATE TABLE public.pmma_attempt_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.pmma_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.pmma_questions(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  is_bonus boolean NOT NULL DEFAULT false,
  selected_answer boolean,
  is_correct boolean,
  response_time_seconds integer,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pmma_attempt_questions_unique ON public.pmma_attempt_questions (attempt_id, question_id);
GRANT ALL ON public.pmma_attempt_questions TO service_role;
GRANT SELECT ON public.pmma_attempt_questions TO authenticated;
ALTER TABLE public.pmma_attempt_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read attempt questions" ON public.pmma_attempt_questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ EVENTOS ============
CREATE TABLE public.pmma_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  lead_id uuid,
  attempt_id uuid,
  event_name text NOT NULL,
  event_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pmma_events_name_idx ON public.pmma_events (event_name, created_at DESC);
GRANT ALL ON public.pmma_events TO service_role;
GRANT SELECT ON public.pmma_events TO authenticated;
ALTER TABLE public.pmma_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read events" ON public.pmma_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS updated_at ============
CREATE TRIGGER pmma_campaigns_updated_at BEFORE UPDATE ON public.pmma_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pmma_questions_updated_at BEFORE UPDATE ON public.pmma_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pmma_attempts_updated_at BEFORE UPDATE ON public.pmma_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAMPANHA PADRAO ============
INSERT INTO public.pmma_campaigns (name, slug, status, whatsapp_number)
VALUES ('Desafio PMMA - Edital360', 'simulado-pmma', 'active', NULL);

-- ============ 21 QUESTOES ============
INSERT INTO public.pmma_questions
 (public_code, original_reference, discipline, topic, statement, correct_answer, feedback_correct, feedback_wrong, key_point, difficulty, source_name, source_type, sort_order)
VALUES
('PT-01','001','Língua Portuguesa','Interpretação de texto','De acordo com o texto, o papel social mais nobre da corporação policial-militar é alcançado por meio da mediação de conflitos, em detrimento da aplicação exclusiva de sanções imediatas.',true,
 'Você acertou! O texto afirma que, quando a mediação de conflitos supera a simples sanção imediata, a corporação cumpre seu papel social mais nobre: atuar como promotora da paz pública.',
 'A resposta correta é CERTO. O item reproduz a ideia central do final do texto: a mediação deve ser priorizada antes da aplicação imediata de mecanismos coercitivos.',
 'Em interpretação, procure a ideia expressamente defendida pelo texto, sem acrescentar opinião pessoal.','facil','SIMULADO PMMA 01','simulado',1),
('PT-02','003','Língua Portuguesa','Conjunções e relações semânticas','A palavra "conquanto" estabelece uma relação de concessão entre as orações, indicando que a força é prerrogativa estatal, mas ainda assim deve ser o último recurso.',true,
 'Você acertou! "Conquanto" possui valor concessivo e pode ser entendido, nesse contexto, como "embora". A oração reconhece uma prerrogativa do Estado, mas apresenta uma ressalva quanto ao seu uso.',
 'A resposta correta é CERTO. A palavra "conquanto" introduz uma concessão: embora o uso da força seja uma prerrogativa estatal, ele deve ser tratado como último recurso.',
 'Conquanto = embora, ainda que, mesmo que.','medio','SIMULADO PMMA 01','simulado',2),
('PT-03','005','Língua Portuguesa','Coesão referencial','No trecho "aproxima-o como um fiador", o pronome "o" atua como elemento de coesão referencial que retoma o termo antecedente "o cidadão".',false,
 'Você acertou! O pronome "o" não retoma "o cidadão". Ele retoma "o militar", mencionado anteriormente em "A farda não afasta o militar da comunidade; ao contrário, aproxima-o".',
 'A resposta correta é ERRADO. O pronome "o" funciona como objeto direto de "aproxima" e retoma "o militar", não "o cidadão".',
 'Para descobrir o referente de um pronome, volte ao termo que mantém sentido e concordância no período.','medio','SIMULADO PMMA 01','simulado',3),
('HB-01','031','História do Brasil','Período pré-colonial','No período pré-colonial brasileiro (1500-1530), a exploração do pau-brasil baseou-se no escambo de objetos europeus pelo trabalho dos indígenas, sem necessidade de estabelecer núcleos urbanos permanentes de colonização.',true,
 'Você acertou! A exploração inicial do pau-brasil utilizou o escambo com populações indígenas e não exigiu, naquele momento, uma ocupação urbana e colonial permanente do território.',
 'A resposta correta é CERTO. No período pré-colonial, Portugal concentrou-se principalmente na exploração do pau-brasil, utilizando escambo e presença costeira limitada, sem colonização permanente ampla.',
 'Período pré-colonial: exploração do pau-brasil, escambo e ocupação portuguesa ainda limitada.','facil','SIMULADO PMMA 01','simulado',4),
('HB-02','041','História do Brasil','Governo João Goulart e Reformas de Base','As Reformas de Base, propostas pelo presidente João Goulart nos anos 1960, obtiveram ampla aceitação dos latifundiários e de setores conservadores, o que evitou conflitos agrários no campo.',false,
 'Você acertou! As Reformas de Base enfrentaram forte oposição de setores conservadores e proprietários rurais. O tema aumentou a tensão política e social, em vez de eliminar os conflitos.',
 'A resposta correta é ERRADO. O erro está em afirmar que houve ampla aceitação e que os conflitos foram evitados. As propostas encontraram resistência significativa e contribuíram para a polarização do período.',
 'Desconfie de expressões absolutas como "ampla aceitação" e "evitou conflitos" em períodos marcados por polarização.','medio','SIMULADO PMMA 01','simulado',5),
('HB-03','043','História do Brasil','Diretas Já','A campanha das Diretas Já, organizada em 1984, culminou na aprovação imediata da Emenda Dante de Oliveira, permitindo que a eleição presidencial daquele ano ocorresse pelo voto direto.',false,
 'Você acertou! A mobilização das Diretas Já foi histórica, mas a Emenda Dante de Oliveira não foi aprovada. A eleição presidencial seguinte ocorreu de forma indireta pelo Colégio Eleitoral.',
 'A resposta correta é ERRADO. A campanha pressionou pela volta do voto direto, porém a emenda não alcançou a aprovação necessária e a eleição presidencial de 1985 continuou indireta.',
 'Diretas Já mobilizou o país, mas a Emenda Dante de Oliveira foi rejeitada.','medio','SIMULADO PMMA 01','simulado',6),
('HM-01','046','História do Maranhão','França Equinocial','A França Equinocial instalou-se no Maranhão em 1612 sob o comando de Daniel de La Touche, Senhor de La Ravardière, que fundou o forte de São Luís em homenagem ao monarca francês Luís XIII.',true,
 'Você acertou! A presença francesa foi estabelecida em 1612 e está ligada à fundação de São Luís, cujo nome homenageia a monarquia francesa.',
 'A resposta correta é CERTO. Daniel de La Touche liderou a expedição francesa que se instalou na região e fundou o núcleo que deu origem a São Luís.',
 'França Equinocial: 1612, Daniel de La Touche e fundação de São Luís.','facil','SIMULADO PMMA 01','simulado',7),
('HM-02','051','História do Maranhão','Revolta de Beckman','Manuel Beckman e Jorge de Sampaio, líderes do levante de 1684, foram perdoados pacificamente pela Coroa após negociações diplomáticas conduzidas em Lisboa por Tomás Beckman.',false,
 'Você acertou! A Revolta de Beckman foi reprimida e houve punições severas. Portanto, a afirmação de que os líderes foram perdoados pacificamente está incorreta.',
 'A resposta correta é ERRADO. O item tenta suavizar o desfecho do movimento. A reação da Coroa envolveu repressão e punição dos envolvidos, não um perdão pacífico geral.',
 'Revolta de Beckman: insatisfação econômica, conflito com os jesuítas e repressão pela Coroa.','medio','SIMULADO PMMA 01','simulado',8),
('HM-03','054','História do Maranhão','Balaiada','A Revolta da Balaiada (1838-1841) foi um levante sertanejo popular cuja pacificação pelas forças imperiais rendeu a Luís Alves de Lima e Silva o título de Barão de Caxias.',true,
 'Você acertou! Luís Alves de Lima e Silva comandou a repressão e a pacificação do movimento, recebendo posteriormente o título de Barão de Caxias.',
 'A resposta correta é CERTO. A atuação de Luís Alves de Lima e Silva no encerramento da Balaiada foi decisiva para sua projeção política e militar.',
 'Balaiada: revolta popular no Maranhão e atuação de Luís Alves de Lima e Silva.','facil','SIMULADO PMMA 01','simulado',9),
('GB-01','058','Geografia do Brasil','Urbanização e conurbação','O fenômeno da conurbação ocorre quando o crescimento horizontal de dois ou mais municípios vizinhos resulta na unificação física de suas malhas urbanas.',true,
 'Você acertou! Conurbação é a continuidade física entre áreas urbanizadas de municípios diferentes, causada pela expansão das cidades.',
 'A resposta correta é CERTO. Quando cidades vizinhas crescem até que suas áreas construídas se encontrem, ocorre a conurbação.',
 'Conurbação é união física de manchas urbanas; não significa união administrativa dos municípios.','facil','SIMULADO PMMA 01','simulado',10),
('GB-02','061','Geografia do Brasil','Matriz de transportes','A matriz brasileira de transporte de cargas é caracterizada pela harmonia intermodal, com divisão equilibrada do volume entre ferrovias, rodovias e hidrovias em todas as macrorregiões.',false,
 'Você acertou! A matriz brasileira não é equilibrada. Há forte predominância do transporte rodoviário e diferenças importantes de infraestrutura entre as regiões.',
 'A resposta correta é ERRADO. O problema está nas expressões "harmonia intermodal" e "divisão equilibrada". O transporte de cargas no Brasil é historicamente concentrado nas rodovias.',
 'Brasil: predominância rodoviária e integração intermodal ainda desigual.','medio','SIMULADO PMMA 01','simulado',11),
('GB-03','065','Geografia do Brasil','Matriz elétrica','Apesar da grande dependência das bacias hidrográficas para a geração de energia, o Brasil registra diversificação da matriz elétrica com o avanço de usinas eólicas e solares fotovoltaicas.',true,
 'Você acertou! A geração hidrelétrica continua relevante, mas as fontes eólica e solar ganharam participação e ampliaram a diversificação da matriz elétrica.',
 'A resposta correta é CERTO. O crescimento das fontes eólica e solar reduz a concentração exclusiva na geração hidrelétrica, embora esta ainda tenha grande importância.',
 'Diversificação não significa abandono das hidrelétricas; significa aumento de outras fontes.','facil','SIMULADO PMMA 01','simulado',12),
('GM-01','068','Geografia do Maranhão','Baixada Maranhense','A Baixada Maranhense possui relevo rebaixado e sofre inundações periódicas no primeiro semestre, formando grandes lagos temporários artificiais destinados à piscicultura.',false,
 'Você acertou! A área realmente apresenta inundações sazonais, mas o item erra ao classificar os lagos temporários como artificiais e destinados à piscicultura. Eles fazem parte da dinâmica natural da região.',
 'A resposta correta é ERRADO. A armadilha está no termo "artificiais". Os campos inundáveis e lagos sazonais da Baixada Maranhense são associados ao regime natural de cheias.',
 'Em itens de geografia, uma única palavra inadequada, como "artificiais", pode tornar toda a afirmação errada.','medio','SIMULADO PMMA 01','simulado',13),
('GM-02','072','Geografia do Maranhão','Chapada das Mesas','O Parque Nacional da Chapada das Mesas, situado no sul do Maranhão, abriga chapadões, cachoeiras e biodiversidade típica do bioma Caatinga.',false,
 'Você acertou! A descrição do relevo e das cachoeiras está adequada, mas o bioma predominante da região é o Cerrado, não a Caatinga.',
 'A resposta correta é ERRADO. O item troca o bioma. A Chapada das Mesas está inserida principalmente no Cerrado.',
 'Chapada das Mesas: sul do Maranhão, relevo de chapadas, cachoeiras e Cerrado.','facil','SIMULADO PMMA 01','simulado',14),
('GM-03','076','Geografia do Maranhão','Porto do Itaqui e logística','O complexo portuário do Itaqui, em São Luís, destaca-se pela profundidade natural de seus canais e pela integração com a Estrada de Ferro Carajás para o escoamento de granéis minerais e agrícolas.',true,
 'Você acertou! A localização, o calado e a integração ferroviária tornam o Porto do Itaqui um ponto estratégico para o escoamento de cargas minerais e agrícolas.',
 'A resposta correta é CERTO. A integração do porto com corredores ferroviários, especialmente a Estrada de Ferro Carajás, favorece o transporte de grandes volumes de carga.',
 'Itaqui + ferrovia + profundidade portuária = importância logística nacional.','medio','SIMULADO PMMA 01','simulado',15),
('INF-01','081','Noções de Informática','Operações com arquivos no Windows','No Windows, se um usuário arrastar um arquivo da pasta C:\Documentos para a pasta D:\Backups, o sistema realizará, por padrão, a cópia do arquivo, mantendo o original na origem.',true,
 'Você acertou! Ao arrastar um arquivo entre unidades diferentes, como C: e D:, o comportamento padrão é copiar, mantendo o arquivo original na unidade de origem.',
 'A resposta correta é CERTO. Entre unidades diferentes, o Windows normalmente copia. Dentro da mesma unidade, o comportamento padrão costuma ser mover.',
 'Unidades diferentes: copiar. Mesma unidade: mover, salvo uso de teclas modificadoras.','facil','SIMULADO PMMA 01','simulado',16),
('INF-02','087','Noções de Informática','Atalhos de apresentação','No PowerPoint ou Impress, a tecla F5 inicia a apresentação a partir do slide selecionado, enquanto SHIFT + F5 inicia a apresentação desde o primeiro slide.',false,
 'Você acertou! O item inverteu os atalhos. F5 inicia a apresentação desde o começo; SHIFT + F5 inicia a partir do slide atual.',
 'A resposta correta é ERRADO. A banca trocou as funções: F5 começa no primeiro slide e SHIFT + F5 começa no slide selecionado.',
 'F5 = início. SHIFT + F5 = slide atual.','facil','SIMULADO PMMA 01','simulado',17),
('INF-03','090','Noções de Informática','Navegação anônima','A navegação em modo anônimo no Google Chrome impede que os sites visitados e o provedor de internet identifiquem o endereço IP e a localização da máquina do usuário.',false,
 'Você acertou! O modo anônimo reduz registros locais, como histórico e dados da sessão no dispositivo, mas não oculta o endereço IP do provedor ou dos sites acessados.',
 'A resposta correta é ERRADO. A guia anônima não funciona como anonimato total nem como VPN. Sites, redes corporativas e provedores ainda podem observar a conexão.',
 'Modo anônimo protege principalmente a privacidade local do navegador, não a identidade da conexão na internet.','medio','SIMULADO PMMA 01','simulado',18),
('LEG-01','096','Legislação','Organização das Polícias Militares','Nos termos do Decreto nº 88.777/1983 (R-200), as Polícias Militares são consideradas forças auxiliares e reserva do Exército Brasileiro, organizadas militarmente com base na hierarquia e na disciplina.',true,
 'Você acertou! O regime jurídico das Polícias Militares reconhece sua condição de forças auxiliares e reserva do Exército e sua organização militar baseada na hierarquia e na disciplina.',
 'A resposta correta é CERTO. A condição de força auxiliar e reserva, juntamente com a estrutura baseada em hierarquia e disciplina, integra o regime constitucional e regulamentar das Polícias Militares.',
 'Polícias Militares: instituições militares estaduais estruturadas pela hierarquia e disciplina e vinculadas ao modelo de forças auxiliares e reserva.','facil','SIMULADO PMMA 01','simulado',19),
('LEG-02','101','Legislação','Código Penal Militar - tempo do crime','No Código Penal Militar, considera-se praticado o crime no momento da ação ou omissão, ainda que o resultado ocorra em outro momento.',true,
 'Você acertou! O Código Penal Militar adota, para o tempo do crime, a teoria da atividade: considera-se o momento da ação ou da omissão, ainda que o resultado venha depois.',
 'A resposta correta é CERTO. O momento relevante é o da conduta do agente, e não necessariamente o momento em que o resultado se produz.',
 'Tempo do crime no CPM: teoria da atividade.','medio','SIMULADO PMMA 01','simulado',20),
('LEG-03','108','Legislação','Obediência hierárquica e ordem criminosa','O soldado que cumpre ordem verbal de superior para cometer tortura ou execução sumária contra preso algemado fica inteiramente isento de culpa ou pena por causa da obediência hierárquica.',false,
 'Você acertou! A obediência hierárquica não protege o inferior quando a ordem tem conteúdo manifestamente criminoso. Nesse caso, o subordinado também pode ser responsabilizado.',
 'A resposta correta é ERRADO. Tortura e execução sumária são atos manifestamente criminosos. O cumprimento de uma ordem desse tipo não gera isenção automática de responsabilidade.',
 'Ordem manifestamente criminosa não deve ser cumprida e não exclui automaticamente a responsabilidade do subordinado.','medio','SIMULADO PMMA 01','simulado',21);

UPDATE public.pmma_questions SET campaign_id = (SELECT id FROM public.pmma_campaigns WHERE slug = 'simulado-pmma');
