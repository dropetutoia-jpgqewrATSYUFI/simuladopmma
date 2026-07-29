import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  PmmaAnswerFeedback,
  PmmaCampaignConfig,
  PmmaPublicQuestion,
  PmmaResult,
  PmmaStartResult,
  PmmaDisciplineScore,
  PmmaReviewItem,
} from "./pmma.types";

export const CAMPAIGN_SLUG = "simulado-pmma";

export const CONSENT_TEXT =
  "Concordo em receber meu resultado e informações sobre preparação para concursos pela Edital360. Posso cancelar quando quiser.";
export const CONSENT_VERSION = "v1";

const BANDS = [
  {
    key: "base_inicial",
    label: "BASE INICIAL",
    max: 34.999,
    text: "Seu resultado mostra que existem conteúdos fundamentais que precisam ser organizados antes de avançar. Isso não define sua capacidade; mostra apenas por onde começar.",
  },
  {
    key: "em_desenvolvimento",
    label: "EM DESENVOLVIMENTO",
    max: 54.999,
    text: "Você já reconhece parte do conteúdo, mas ainda existem lacunas que podem custar pontos. O próximo passo é estudar em uma sequência organizada e revisar com frequência.",
  },
  {
    key: "caminho_certo",
    label: "CAMINHO CERTO",
    max: 74.999,
    text: "Você demonstrou uma base razoável. Agora precisa transformar conhecimento parcial em maior precisão, principalmente nas matérias com mais erros.",
  },
  {
    key: "bom_desempenho",
    label: "BOM DESEMPENHO",
    max: 89.999,
    text: "Seu desempenho foi bom. Para evoluir, concentre-se nos detalhes, revise os erros e continue praticando questões de Certo ou Errado.",
  },
  {
    key: "avancado",
    label: "DESEMPENHO AVANÇADO",
    max: 100,
    text: "Você apresentou ótimo domínio neste mini simulado. Continue treinando para manter a precisão e identificar detalhes que podem provocar erros na prova.",
  },
];

function bandFor(percentage: number) {
  return BANDS.find((b) => percentage <= b.max) ?? BANDS[BANDS.length - 1];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function loadCampaign(slug: string = CAMPAIGN_SLUG): Promise<PmmaCampaignConfig> {
  const { data, error } = await supabaseAdmin
    .from("pmma_campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Campanha não encontrada.");
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    status: data.status,
    isPaid: data.is_paid,
    priceCents: data.price_cents,
    totalQuestions: data.total_questions,
    questionsPerAttempt: data.questions_per_attempt,
    questionsPerDiscipline: data.questions_per_discipline,
    leadCaptureAfterQuestion: data.lead_capture_after_question,
    bonusEnabled: data.bonus_enabled,
    offerUrl: data.offer_url,
    whatsappNumber: data.whatsapp_number,
    pausedMessage: data.paused_message,
  };
}

export type StartInput = {
  sessionId: string;
  campaignSlug?: string;
  userId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  partnerCode?: string | null;
  deviceType?: string | null;
  referrer?: string | null;
  seenQuestionCodes?: string[];
};

export async function startAttempt(input: StartInput): Promise<PmmaStartResult> {
  const campaign = await loadCampaign(input.campaignSlug ?? CAMPAIGN_SLUG);
  if (campaign.status !== "active") {
    throw new Error("PAUSED");
  }

  const { getDeviceFingerprint } = await import("./fingerprint.server");
  const fingerprint = await getDeviceFingerprint();

  if (campaign.isPaid) {
    // Simulados pagos exigem conta e compra aprovada.
    if (!input.userId) throw new Error("LOGIN_REQUIRED");
    const { hasApprovedPurchase } = await import("./purchase.server");
    const owns = await hasApprovedPurchase(input.userId, campaign.id);
    if (!owns) throw new Error("PURCHASE_REQUIRED");
  } else {
    // Anti-refazer no simulado gratuito: quem já concluiu precisa de uma doação aprovada.
    const { getAccessStatus, consumeDonationCredit } = await import("./donation.server");
    const access = await getAccessStatus(input.sessionId, fingerprint);
    if (access.completedAttempts > 0) {
      const unlocked = await consumeDonationCredit(input.sessionId, fingerprint);
      if (!unlocked) throw new Error("DONATION_REQUIRED");
    }
  }




  const { data: pool, error } = await supabaseAdmin
    .from("pmma_questions")
    .select(
      "id, public_code, discipline, topic, base_text, statement, difficulty, correct_answer, sort_order",
    )
    .eq("is_active", true)
    .eq("campaign_id", campaign.id)
    .order("sort_order", { ascending: true });

  if (error || !pool || pool.length === 0) {
    throw new Error("Nenhuma questão disponível no momento.");
  }

  type PoolRow = {
    id: string;
    public_code: string;
    discipline: string;
    topic: string | null;
    base_text: string | null;
    statement: string;
    difficulty: string;
    correct_answer: boolean;
    sort_order: number;
  };
  const rowsPool: PoolRow[] = pool;

  const questions: PoolRow[] = [];
  if (campaign.isPaid) {
    // Provas comentadas preservam a numeração original (1..120).
    questions.push(...rowsPool);
  } else {
    const byDiscipline = new Map<string, PoolRow[]>();
    for (const q of rowsPool) {
      const list = byDiscipline.get(q.discipline) ?? [];
      list.push(q);
      byDiscipline.set(q.discipline, list);
    }
    const orderedByDiscipline = shuffle([...byDiscipline.entries()]).map(([, list]) => shuffle(list));
    const maxLen = Math.max(0, ...orderedByDiscipline.map((l) => l.length));
    for (let i = 0; i < maxLen; i++) {
      for (const list of orderedByDiscipline) {
        const item = list[i];
        if (item) questions.push(item);
      }
    }
  }


  const bonus: PoolRow | null = null;


  const headlineVariant: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
  const ctaVariant: "A" | "B" = Math.random() < 0.5 ? "A" : "B";

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("pmma_attempts")
    .insert({
      anonymous_session_id: input.sessionId,
      user_id: input.userId ?? null,
      device_fingerprint: fingerprint,

      campaign_id: campaign.id,
      status: "started",
      total_questions: questions.length,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      utm_content: input.utmContent ?? null,
      partner_code: input.partnerCode ?? null,
      device_type: input.deviceType ?? null,
      referrer: input.referrer ?? null,
      headline_variant: headlineVariant,
      cta_variant: ctaVariant,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    throw new Error("Não foi possível iniciar o desafio.");
  }

  const rows = questions.map((q, index) => ({
    attempt_id: attempt.id,
    question_id: q.id,
    display_order: index + 1,
    is_bonus: false,
  }));
  await supabaseAdmin.from("pmma_attempt_questions").insert(rows);

  const toPublic = (q: PoolRow, order: number, isBonus: boolean): PmmaPublicQuestion => ({
    id: q.id,
    publicCode: q.public_code,
    discipline: q.discipline,
    topic: q.topic,
    baseText: q.base_text,
    statement: q.statement,
    difficulty: q.difficulty,
    displayOrder: order,
    isBonus,
  });

  return {
    attemptId: attempt.id,
    campaign,
    questions: questions.map((q, i) => toPublic(q, i + 1, false)),
    bonusQuestion: bonus ? toPublic(bonus, questions.length + 1, true) : null,
    headlineVariant,
    ctaVariant,
  };
}

export async function answerQuestion(params: {
  attemptId: string;
  questionId: string;
  answer: boolean;
  responseTimeSeconds: number;
}): Promise<PmmaAnswerFeedback> {
  const { data: link, error: linkError } = await supabaseAdmin
    .from("pmma_attempt_questions")
    .select("id, display_order, is_bonus, answered_at")
    .eq("attempt_id", params.attemptId)
    .eq("question_id", params.questionId)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error("Questão não pertence a esta tentativa.");
  }

  const { data: question, error: questionError } = await supabaseAdmin
    .from("pmma_questions")
    .select("correct_answer, feedback_correct, feedback_wrong, key_point")
    .eq("id", params.questionId)
    .maybeSingle();

  if (questionError || !question) {
    throw new Error("Questão não encontrada.");
  }

  const isCorrect = question.correct_answer === params.answer;

  if (!link.answered_at) {
    await supabaseAdmin
      .from("pmma_attempt_questions")
      .update({
        selected_answer: params.answer,
        is_correct: isCorrect,
        response_time_seconds: Math.max(0, Math.round(params.responseTimeSeconds)),
        answered_at: new Date().toISOString(),
      })
      .eq("id", link.id);

    if (!link.is_bonus) {
      await supabaseAdmin
        .from("pmma_attempts")
        .update({ current_question_index: link.display_order })
        .eq("id", params.attemptId);
    }
  }

  const { data: next } = await supabaseAdmin
    .from("pmma_attempt_questions")
    .select("question_id, display_order, pmma_questions(discipline)")
    .eq("attempt_id", params.attemptId)
    .eq("is_bonus", false)
    .gt("display_order", link.display_order)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextDiscipline =
    (next?.pmma_questions as { discipline: string } | null | undefined)?.discipline ?? null;

  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    feedback: isCorrect ? question.feedback_correct : question.feedback_wrong,
    keyPoint: question.key_point,
    nextDiscipline,
  };
}

const DDD_MIN = 11;
const DDD_MAX = 99;

export function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  if (national.length !== 10 && national.length !== 11) {
    throw new Error("Informe um WhatsApp válido com DDD.");
  }
  const ddd = Number(national.slice(0, 2));
  if (Number.isNaN(ddd) || ddd < DDD_MIN || ddd > DDD_MAX) {
    throw new Error("DDD inválido.");
  }
  const rest = national.slice(2);
  if (national.length === 11 && rest[0] !== "9") {
    throw new Error("Informe um número de celular válido.");
  }
  if (/^(\d)\1+$/.test(rest)) {
    throw new Error("Informe um WhatsApp válido.");
  }
  return `+55${national}`;
}

export async function captureLead(params: {
  attemptId: string;
  firstName: string;
  whatsapp: string;
  email?: string | null;
  consent: boolean;
}): Promise<{ leadId: string }> {
  if (!params.consent) {
    throw new Error("É necessário aceitar o consentimento para continuar.");
  }
  const whatsapp = normalizeWhatsapp(params.whatsapp);

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("pmma_attempts")
    .select("id, lead_id, utm_source, utm_medium, utm_campaign, utm_content, partner_code")
    .eq("id", params.attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    throw new Error("Tentativa não encontrada.");
  }
  if (attempt.lead_id) {
    return { leadId: attempt.lead_id };
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("pmma_leads")
    .insert({
      first_name: params.firstName.trim().slice(0, 60),
      whatsapp_e164: whatsapp,
      email: params.email?.trim() ? params.email.trim().slice(0, 255) : null,
      consent: true,
      consent_text: CONSENT_TEXT,
      consent_text_version: CONSENT_VERSION,
      consent_at: new Date().toISOString(),
      utm_source: attempt.utm_source,
      utm_medium: attempt.utm_medium,
      utm_campaign: attempt.utm_campaign,
      utm_content: attempt.utm_content,
      partner_code: attempt.partner_code,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    throw new Error("Não foi possível salvar seus dados agora.");
  }

  await supabaseAdmin
    .from("pmma_attempts")
    .update({ lead_id: lead.id, lead_captured_at: new Date().toISOString() })
    .eq("id", params.attemptId);

  return { leadId: lead.id };
}

export async function finishAttempt(attemptId: string): Promise<PmmaResult> {
  const campaign = await loadCampaign();

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("pmma_attempts")
    .select("*, pmma_leads(first_name)")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    throw new Error("Tentativa não encontrada.");
  }

  const { data: rows, error: rowsError } = await supabaseAdmin
    .from("pmma_attempt_questions")
    .select(
      "display_order, is_bonus, selected_answer, is_correct, response_time_seconds, pmma_questions(public_code, discipline, topic, statement, correct_answer, feedback_correct, feedback_wrong, key_point)",
    )
    .eq("attempt_id", attemptId)
    .order("display_order", { ascending: true });

  if (rowsError || !rows) {
    throw new Error("Não foi possível calcular o resultado.");
  }

  const main = rows.filter((r) => !r.is_bonus);
  const bonusRow = rows.find((r) => r.is_bonus && r.selected_answer !== null) ?? null;

  const correct = main.filter((r) => r.is_correct).length;
  const total = main.length;
  const wrong = total - correct;
  const percentage = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  let streak = 0;
  let bestStreak = 0;
  for (const row of main) {
    if (row.is_correct) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }

  const startedAt = new Date(attempt.started_at).getTime();
  const durationSeconds =
    main.reduce((sum, r) => sum + (r.response_time_seconds ?? 0), 0) ||
    Math.max(0, Math.round((Date.now() - startedAt) / 1000));

  const disciplineMap = new Map<string, PmmaDisciplineScore>();
  for (const row of main) {
    const q = row.pmma_questions as { discipline: string } | null;
    if (!q) continue;
    const entry = disciplineMap.get(q.discipline) ?? {
      discipline: q.discipline,
      correct: 0,
      total: 0,
      state: "atencao" as const,
    };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    disciplineMap.set(q.discipline, entry);
  }

  const disciplines = [...disciplineMap.values()].map((d) => ({
    ...d,
    state:
      d.correct === 0
        ? ("prioridade" as const)
        : d.correct === d.total
          ? ("ponto_forte" as const)
          : ("atencao" as const),
  }));

  const maxScore = Math.max(...disciplines.map((d) => d.correct / d.total), 0);
  const minScore = Math.min(...disciplines.map((d) => d.correct / d.total), 1);
  const bestDisciplines = disciplines
    .filter((d) => d.correct / d.total === maxScore)
    .slice(0, 2)
    .map((d) => d.discipline);
  const worstDisciplines = disciplines
    .filter((d) => d.correct / d.total === minScore)
    .slice(0, 2)
    .map((d) => d.discipline);

  const review: PmmaReviewItem[] = rows
    .filter((r) => r.selected_answer !== null)
    .map((r) => {
      const q = r.pmma_questions as {
        public_code: string;
        discipline: string;
        topic: string | null;
        statement: string;
        correct_answer: boolean;
        feedback_correct: string;
        feedback_wrong: string;
        key_point: string;
      };
      return {
        publicCode: q.public_code,
        discipline: q.discipline,
        topic: q.topic,
        statement: q.statement,
        selectedAnswer: r.selected_answer,
        correctAnswer: q.correct_answer,
        isCorrect: Boolean(r.is_correct),
        explanation: r.is_correct ? q.feedback_correct : q.feedback_wrong,
        keyPoint: q.key_point,
        isBonus: r.is_bonus,
      };
    });

  const band = bandFor(percentage);
  const worst = worstDisciplines[0] ?? "suas matérias com mais erros";
  const recommendations = [
    `Revise ${worst}, que apresentou o menor aproveitamento neste teste.`,
    "Reestude os conceitos apresentados nas explicações das questões que você errou.",
    "Resolva novos testes de Certo ou Errado para confirmar a evolução.",
  ];

  await supabaseAdmin
    .from("pmma_attempts")
    .update({
      status: "completed",
      correct_count: correct,
      wrong_count: wrong,
      percentage,
      best_streak: bestStreak,
      duration_seconds: durationSeconds,
      completed_at: new Date().toISOString(),
      bonus_answered: Boolean(bonusRow),
      bonus_correct: bonusRow ? Boolean(bonusRow.is_correct) : null,
    })
    .eq("id", attemptId);

  return {
    firstName: (attempt.pmma_leads as { first_name: string } | null)?.first_name ?? null,
    correct,
    wrong,
    total,
    percentage,
    durationSeconds,
    averageSecondsPerQuestion: total > 0 ? Math.round(durationSeconds / total) : 0,
    bestStreak,
    bonusAnswered: Boolean(bonusRow),
    bonusCorrect: bonusRow ? Boolean(bonusRow.is_correct) : null,
    band: { key: band.key, label: band.label, text: band.text },
    disciplines,
    bestDisciplines,
    worstDisciplines,
    recommendations,
    review,
    offerUrl: campaign.offerUrl,
    whatsappNumber: campaign.whatsappNumber,
  };
}

export async function countAttempts(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("pmma_attempts")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  if (error) {
    throw new Error("Não foi possível contar as tentativas.");
  }

  return count ?? 0;
}

export async function logEvent(params: {
  sessionId: string;
  attemptId?: string | null;
  eventName: string;
  data?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("pmma_events").insert({
    session_id: params.sessionId,
    attempt_id: params.attemptId ?? null,
    event_name: params.eventName,
    event_data_json: (params.data ?? {}) as never,
  });
}
