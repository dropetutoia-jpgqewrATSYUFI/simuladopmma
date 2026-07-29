import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type {
  PmmaAnswerFeedback,
  PmmaResult,
  PmmaStartResult,
} from "./pmma.types";

export const pmmaCountAttempts = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const { countAttempts } = await import("./pmma.server");
    return countAttempts();
  },
);

const startSchema = z.object({
  sessionId: z.string().min(8).max(64),
  campaignSlug: z.string().min(3).max(80).optional(),
  utmSource: z.string().max(120).nullish(),
  utmMedium: z.string().max(120).nullish(),
  utmCampaign: z.string().max(120).nullish(),
  utmContent: z.string().max(120).nullish(),
  partnerCode: z.string().max(120).nullish(),
  deviceType: z.enum(["mobile", "desktop"]).nullish(),
  referrer: z.string().max(500).nullish(),
  seenQuestionCodes: z.array(z.string().max(20)).max(200).optional(),
});

export const pmmaStart = createServerFn({ method: "POST" })
  .validator({ parse: (input) => startSchema.parse(input) })
  .handler(async ({ data }): Promise<PmmaStartResult> => {
    const { startAttempt, logEvent } = await import("./pmma.server");
    const result = await startAttempt(data);
    await logEvent({
      sessionId: data.sessionId,
      attemptId: result.attemptId,
      eventName: "quiz_start_click",
      data: { headline: result.headlineVariant, cta: result.ctaVariant },
    });
    return result;
  });

/** Início de simulados pagos: exige conta e compra aprovada. */
export const pmmaStartOwned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({ parse: (input) => startSchema.parse(input) })
  .handler(async ({ data, context }): Promise<PmmaStartResult> => {
    const { startAttempt, logEvent } = await import("./pmma.server");
    const result = await startAttempt({ ...data, userId: context.userId });
    await logEvent({
      sessionId: data.sessionId,
      attemptId: result.attemptId,
      eventName: "quiz_start_click",
      data: { headline: result.headlineVariant, cta: result.ctaVariant },
    });
    return result;
  });


export const pmmaAnswer = createServerFn({ method: "POST" })
  .validator({
    parse: (input) =>
      z
        .object({
          attemptId: z.string().uuid(),
          questionId: z.string().uuid(),
          answer: z.boolean(),
          responseTimeSeconds: z.number().min(0).max(3600),
        })
        .parse(input),
  })
  .handler(async ({ data }): Promise<PmmaAnswerFeedback> => {
    const { answerQuestion } = await import("./pmma.server");
    return answerQuestion(data);
  });

export const pmmaCaptureLead = createServerFn({ method: "POST" })
  .validator({
    parse: (input) =>
      z
        .object({
          attemptId: z.string().uuid(),
          firstName: z
            .string()
            .trim()
            .min(2, "Informe seu primeiro nome.")
            .max(60)
            .regex(/^[\p{L}][\p{L}\s'-]*$/u, "Informe um nome válido."),
          whatsapp: z.string().trim().min(8).max(25),
          email: z.string().trim().email("E-mail inválido.").max(255).optional().or(z.literal("")),
          consent: z.literal(true, { message: "É necessário aceitar o consentimento." }),
        })
        .parse(input),
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { captureLead } = await import("./pmma.server");
    await captureLead({
      attemptId: data.attemptId,
      firstName: data.firstName,
      whatsapp: data.whatsapp,
      email: data.email || null,
      consent: data.consent,
    });
    return { ok: true };
  });

export const pmmaFinish = createServerFn({ method: "POST" })
  .validator({ parse: (input) => z.object({ attemptId: z.string().uuid() }).parse(input) })
  .handler(async ({ data }): Promise<PmmaResult> => {
    const { finishAttempt } = await import("./pmma.server");
    return finishAttempt(data.attemptId);
  });

const EVENT_NAMES = [
  "quiz_view",
  "question_view",
  "question_answered",
  "feedback_viewed",
  "next_question_click",
  "lead_form_view",
  "lead_form_submit",
  "lead_form_error",
  "quiz_resume",
  "quiz_complete",
  "result_view",
  "corrections_open",
  "bonus_accept",
  "bonus_skip",
  "offer_view",
  "offer_click",
  "whatsapp_click",
  "retake_click",
] as const;

export const pmmaTrack = createServerFn({ method: "POST" })
  .validator({
    parse: (input) =>
      z
        .object({
          sessionId: z.string().min(8).max(64),
          attemptId: z.string().uuid().nullish(),
          eventName: z.enum(EVENT_NAMES),
          data: z.record(z.string(), z.unknown()).optional(),
        })
        .parse(input),
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { logEvent } = await import("./pmma.server");
    await logEvent({
      sessionId: data.sessionId,
      attemptId: data.attemptId ?? null,
      eventName: data.eventName,
      data: data.data,
    });
    return { ok: true };
  });
