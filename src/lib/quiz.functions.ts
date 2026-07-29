import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { QuizMode, ResultSummary, PublicQuizQuestion, QuizAnswer } from "./quiz.types";

const QuizModeSchema = z.enum(["quiz", "simulado"]);

export const startQuiz = createServerFn({ method: "POST" })
  .validator({
    parse: (data) => z.object({ mode: QuizModeSchema.default("quiz") }).parse(data),
  })
  .handler(async ({ data }): Promise<{ attemptId: string; publicToken: string; mode: QuizMode }> => {
    const { fetchActiveQuestions, createAnonymousAttempt } = await import("./quiz.server");
    const questions = await fetchActiveQuestions(data.mode);
    const attempt = await createAnonymousAttempt(data.mode);

    // Pré-cadastra as respostas em branco para todas as questões? Não — deixamos em branco.
    return {
      attemptId: attempt.id,
      publicToken: attempt.public_token,
      mode: attempt.type as QuizMode,
    };
  });

export const getQuestions = createServerFn({ method: "GET" })
  .validator({
    parse: (data) =>
      z
        .object({
          attemptId: z.string().uuid(),
        })
        .parse(data),
  })
  .handler(async ({ data }): Promise<{ questions: PublicQuizQuestion[]; answers: QuizAnswer[] }> => {
    const { getQuestionsForAttempt } = await import("./quiz.server");
    return getQuestionsForAttempt(data.attemptId);
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .validator({
    parse: (data) =>
      z
        .object({
          attemptId: z.string().uuid(),
          questionId: z.string().uuid(),
          optionId: z.string().uuid().nullable(),
        })
        .parse(data),
  })
  .handler(async ({ data }): Promise<{ success: true }> => {
    const { saveAnswer: serverSaveAnswer } = await import("./quiz.server");
    await serverSaveAnswer(data.attemptId, data.questionId, data.optionId);
    return { success: true };
  });

export const finishQuiz = createServerFn({ method: "POST" })
  .validator({
    parse: (data) =>
      z
        .object({
          attemptId: z.string().uuid(),
          lead: z.object({
            name: z.string().min(2, "Informe o nome completo"),
            email: z.string().email("Informe um e-mail válido"),
            phone: z.string().optional(),
            city: z.string().optional(),
            consentPrivacy: z.boolean().refine((v) => v === true, "É necessário aceitar a política de privacidade"),
            consentMarketing: z.boolean().default(false),
          }),
        })
        .parse(data),
  })
  .handler(async ({ data }): Promise<ResultSummary> => {
    const { finishAttempt } = await import("./quiz.server");
    return finishAttempt(data.attemptId, {
      name: data.lead.name,
      email: data.lead.email,
      phone: data.lead.phone,
      city: data.lead.city,
      consentPrivacy: data.lead.consentPrivacy,
      consentMarketing: data.lead.consentMarketing,
    });
  });

export const getResult = createServerFn({ method: "GET" })
  .validator({
    parse: (data) =>
      z
        .object({
          publicToken: z.string().uuid(),
        })
        .parse(data),
  })
  .handler(async ({ data }): Promise<{ status: string; result: ResultSummary | null }> => {
    const { getAttemptByToken, getResultByAttemptId } = await import("./quiz.server");
    const attempt = await getAttemptByToken(data.publicToken);
    if (!attempt) {
      throw new Error("Resultado não encontrado.");
    }
    const withResult = await getResultByAttemptId(attempt.id);
    return {
      status: attempt.status,
      result: withResult.result,
    };
  });
