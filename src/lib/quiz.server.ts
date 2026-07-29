import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { QuizMode, QuizQuestion, QuizAttempt, ResultSummary, QuizAnswer } from "./quiz.types";

const QUESTION_LIMIT: Record<QuizMode, number> = {
  quiz: 10,
  simulado: 20,
};

export async function fetchActiveQuestions(mode: QuizMode): Promise<QuizQuestion[]> {
  const limit = QUESTION_LIMIT[mode];

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("quiz_questions")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true })
    .limit(limit);

  if (questionsError) {
    console.error("[quiz.server] fetchActiveQuestions error:", questionsError);
    throw new Error("Não foi possível carregar as questões.");
  }

  if (!questions || questions.length === 0) {
    throw new Error("Nenhuma questão disponível no momento.");
  }

  const questionIds = questions.map((q) => q.id);

  const { data: options, error: optionsError } = await supabaseAdmin
    .from("quiz_options")
    .select("*")
    .in("question_id", questionIds)
    .order("position", { ascending: true });

  if (optionsError) {
    console.error("[quiz.server] fetchActiveQuestions options error:", optionsError);
    throw new Error("Não foi possível carregar as alternativas.");
  }

  const optionsByQuestion = new Map<string, typeof options>();
  for (const option of options ?? []) {
    const list = optionsByQuestion.get(option.question_id) ?? [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  }

  return questions.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) ?? [],
  }));
}

export async function getQuestionsForAttempt(attemptId: string): Promise<{
  questions: QuizQuestion[];
  answers: QuizAnswer[];
}> {
  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    throw new Error("Tentativa não encontrada.");
  }

  const limit = QUESTION_LIMIT[attempt.type as QuizMode];

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("quiz_questions")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true })
    .limit(limit);

  if (questionsError) {
    console.error("[quiz.server] getQuestionsForAttempt error:", questionsError);
    throw new Error("Não foi possível carregar as questões.");
  }

  const questionIds = questions?.map((q) => q.id) ?? [];

  const [{ data: options }, { data: answers }] = await Promise.all([
    supabaseAdmin
      .from("quiz_options")
      .select("*")
      .in("question_id", questionIds)
      .order("position", { ascending: true }),
    supabaseAdmin.from("quiz_answers").select("*").eq("attempt_id", attemptId),
  ]);

  const optionsByQuestion = new Map<string, typeof options>();
  for (const option of options ?? []) {
    const list = optionsByQuestion.get(option.question_id) ?? [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  }

  const enrichedQuestions = questions?.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) ?? [],
  })) ?? [];

  return {
    questions: enrichedQuestions,
    answers: answers ?? [],
  };
}

function getAttemptById(attemptId: string): Promise<QuizAttempt | null> {
  return supabaseAdmin
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    });
}

export async function createAnonymousAttempt(mode: QuizMode): Promise<QuizAttempt> {
  const { data, error } = await supabaseAdmin
    .from("quiz_attempts")
    .insert({
      type: mode,
      status: "started",
      source: "diagnostico-pmma",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[quiz.server] createAnonymousAttempt error:", error);
    throw new Error("Não foi possível iniciar o diagnóstico.");
  }

  return data;
}

export async function getAttemptByToken(publicToken: string): Promise<QuizAttempt | null> {
  const { data, error } = await supabaseAdmin
    .from("quiz_attempts")
    .select("*")
    .eq("public_token", publicToken)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[quiz.server] getAttemptByToken error:", error);
    throw new Error("Não foi possível localizar a tentativa.");
  }

  return data;
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  optionId: string | null
): Promise<void> {
  if (!optionId) {
    // Resposta em branco: remove qualquer resposta anterior
    const { error } = await supabaseAdmin
      .from("quiz_answers")
      .delete()
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId);

    if (error) {
      console.error("[quiz.server] saveAnswer delete error:", error);
      throw new Error("Não foi possível limpar a resposta.");
    }
    return;
  }

  // Busca a alternativa correta para calcular is_correct
  const { data: option, error: optionError } = await supabaseAdmin
    .from("quiz_options")
    .select("is_correct")
    .eq("id", optionId)
    .single();

  if (optionError) {
    console.error("[quiz.server] saveAnswer option error:", optionError);
    throw new Error("Alternativa inválida.");
  }

  const isCorrect = option?.is_correct ?? false;

  const { error } = await supabaseAdmin.from("quiz_answers").upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      option_id: optionId,
      is_correct: isCorrect,
    },
    {
      onConflict: "attempt_id,question_id",
    }
  );

  if (error) {
    console.error("[quiz.server] saveAnswer error:", error);
    throw new Error("Não foi possível salvar a resposta.");
  }
}

export async function finishAttempt(
  attemptId: string,
  leadData: {
    name: string;
    email: string;
    phone?: string;
    city?: string;
    consentPrivacy: boolean;
    consentMarketing: boolean;
  }
): Promise<ResultSummary> {
  // Marca a tentativa como finalizada
  const { error: finishError } = await supabaseAdmin
    .from("quiz_attempts")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
      lead_name: leadData.name,
      lead_email: leadData.email,
      lead_phone: leadData.phone ?? null,
      lead_city: leadData.city ?? null,
      consent_privacy: leadData.consentPrivacy,
      consent_marketing: leadData.consentMarketing,
    })
    .eq("id", attemptId);

  if (finishError) {
    console.error("[quiz.server] finishAttempt update error:", finishError);
    throw new Error("Não foi possível finalizar o diagnóstico.");
  }

  // Calcula o resultado
  const { data: answers, error: answersError } = await supabaseAdmin
    .from("quiz_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  if (answersError) {
    console.error("[quiz.server] finishAttempt answers error:", answersError);
    throw new Error("Não foi possível calcular o resultado.");
  }

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("quiz_questions")
    .select("id")
    .eq("is_active", true);

  if (questionsError) {
    console.error("[quiz.server] finishAttempt questions error:", questionsError);
    throw new Error("Não foi possível calcular o resultado.");
  }

  const totalQuestions = questions?.length ?? 0;
  const answeredQuestionIds = new Set(answers?.map((a) => a.question_id) ?? []);
  const correctCount = answers?.filter((a) => a.is_correct).length ?? 0;
  const wrongCount = answers?.filter((a) => a.option_id && !a.is_correct).length ?? 0;
  const blankCount = totalQuestions - answeredQuestionIds.size;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Classificação aproximada
  let estimatedRank = "Abaixo da média";
  let recommendation = "Recomendamos reforçar as bases antes de avançar para simulados completos.";
  let passed = false;

  if (scorePercentage >= 70) {
    estimatedRank = "Dentro do grupo de aprovação";
    recommendation =
      "Excelente desempenho! Continue praticando com simulados completos e mantenha a constância.";
    passed = true;
  } else if (scorePercentage >= 50) {
    estimatedRank = "Na média";
    recommendation =
      "Você tem uma base, mas precisa reforçar os pontos fracos. Foque nas disciplinas com mais erros.";
  }

  const result: ResultSummary = {
    totalQuestions,
    correctCount,
    wrongCount,
    blankCount,
    scorePercentage,
    estimatedRank,
    recommendation,
    passed,
  };

  // Salva o resultado
  const { error: resultError } = await supabaseAdmin.from("quiz_results").upsert(
    {
      attempt_id: attemptId,
      total_questions: result.totalQuestions,
      correct_count: result.correctCount,
      wrong_count: result.wrongCount,
      blank_count: result.blankCount,
      score_percentage: result.scorePercentage,
      estimated_rank: result.estimatedRank,
      recommendation: result.recommendation,
      passed: result.passed,
    },
    {
      onConflict: "attempt_id",
    }
  );

  if (resultError) {
    console.error("[quiz.server] finishAttempt result error:", resultError);
    throw new Error("Não foi possível salvar o resultado.");
  }

  // Cria/atualiza lead
  const { error: leadError } = await supabaseAdmin.from("leads").upsert(
    {
      attempt_id: attemptId,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone ?? null,
      city: leadData.city ?? null,
      consent_privacy: leadData.consentPrivacy,
      consent_marketing: leadData.consentMarketing,
      source: "diagnostico-pmma",
      is_demo: true,
    },
    {
      onConflict: "attempt_id",
    }
  );

  if (leadError) {
    console.error("[quiz.server] finishAttempt lead error:", leadError);
    // Não falha o fluxo por erro de lead, apenas loga
  }

  return result;
}

export async function getResultByAttemptId(attemptId: string): Promise<QuizAttempt & { result: ResultSummary | null }> {
  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    console.error("[quiz.server] getResultByAttemptId attempt error:", attemptError);
    throw new Error("Tentativa não encontrada.");
  }

  const { data: resultRow, error: resultError } = await supabaseAdmin
    .from("quiz_results")
    .select("*")
    .eq("attempt_id", attemptId)
    .single();

  if (resultError && resultError.code !== "PGRST116") {
    console.error("[quiz.server] getResultByAttemptId result error:", resultError);
  }

  const result: ResultSummary | null = resultRow
    ? {
        totalQuestions: resultRow.total_questions,
        correctCount: resultRow.correct_count,
        wrongCount: resultRow.wrong_count,
        blankCount: resultRow.blank_count,
        scorePercentage: resultRow.score_percentage,
        estimatedRank: resultRow.estimated_rank ?? "Indefinido",
        recommendation: resultRow.recommendation ?? "Continue estudando.",
        passed: resultRow.passed,
      }
    : null;

  return { ...attempt, result };
}
