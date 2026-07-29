import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type QuestionRow = Database["public"]["Tables"]["pmma_questions"]["Row"];

async function requireAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
}

function maskPhone(value: string | null) {
  if (!value) return null;
  return value.replace(/^(\+\d{2}\d{2})(\d+)(\d{2})$/, (_m, a, mid, z) => `${a}${"•".repeat(mid.length)}${z}`);
}

function maskEmail(value: string | null) {
  if (!value) return null;
  const [user, domain] = value.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export const pmmaOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabase } = context;

    const [{ data: attempts }, { data: leads }, { data: events }, { data: answers }] =
      await Promise.all([
        supabase.from("pmma_attempts").select("id, status, percentage, current_question_index"),
        supabase.from("pmma_leads").select("id"),
        supabase.from("pmma_events").select("event_name, session_id"),
        supabase
          .from("pmma_attempt_questions")
          .select("is_correct, answered_at, pmma_questions(public_code, discipline)"),
      ]);

    const attemptList = attempts ?? [];
    const eventList = events ?? [];
    const answerList = answers ?? [];

    const uniqueVisitors = new Set(
      eventList.filter((e) => e.event_name === "quiz_view").map((e) => e.session_id),
    ).size;
    const startClicks = eventList.filter((e) => e.event_name === "quiz_start_click").length;
    const reachedCapture = attemptList.filter((a) => a.current_question_index >= 4).length;
    const completed = attemptList.filter((a) => a.status === "completed").length;

    const errorsByDiscipline = new Map<string, number>();
    const errorsByQuestion = new Map<string, number>();
    for (const row of answerList) {
      if (row.is_correct !== false) continue;
      const q = row.pmma_questions as { public_code: string; discipline: string } | null;
      if (!q) continue;
      errorsByDiscipline.set(q.discipline, (errorsByDiscipline.get(q.discipline) ?? 0) + 1);
      errorsByQuestion.set(q.public_code, (errorsByQuestion.get(q.public_code) ?? 0) + 1);
    }

    const sortDesc = (map: Map<string, number>) =>
      [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const abandonment = new Map<number, number>();
    for (const a of attemptList) {
      if (a.status === "completed") continue;
      abandonment.set(a.current_question_index, (abandonment.get(a.current_question_index) ?? 0) + 1);
    }
    const worstStep = [...abandonment.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      uniqueVisitors,
      startClicks,
      reachedCapture,
      leads: leads?.length ?? 0,
      captureRate: startClicks ? Math.round(((leads?.length ?? 0) / startClicks) * 100) : 0,
      completed,
      completionRate: startClicks ? Math.round((completed / startClicks) * 100) : 0,
      abandonmentQuestion: worstStep ? worstStep[0] : null,
      topErrorQuestions: sortDesc(errorsByQuestion),
      topErrorDisciplines: sortDesc(errorsByDiscipline),
      offerClicks: eventList.filter((e) => e.event_name === "offer_click").length,
      whatsappClicks: eventList.filter((e) => e.event_name === "whatsapp_click").length,
    };
  });

export const pmmaListLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input) =>
      z
        .object({
          limit: z.number().int().min(1).max(200).default(100),
          unmask: z.boolean().default(false),
        })
        .parse(input ?? {}),
  })
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);

    const { data: leads, error } = await context.supabase
      .from("pmma_leads")
      .select("*, pmma_attempts(status, percentage, current_question_index)")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) throw new Error(error.message);

    return (leads ?? []).map((lead) => ({
      ...lead,
      whatsapp_e164: data.unmask ? lead.whatsapp_e164 : maskPhone(lead.whatsapp_e164),
      email: data.unmask ? lead.email : maskEmail(lead.email),
    }));
  });

export const pmmaListAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input) => z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(input ?? {}),
  })
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: attempts, error } = await context.supabase
      .from("pmma_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return attempts ?? [];
  });

export const pmmaListQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QuestionRow[]> => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pmma_questions")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const pmmaUpsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input) =>
      z
        .object({
          id: z.string().uuid().optional(),
          public_code: z.string().trim().min(2).max(20),
          discipline: z.string().trim().min(2).max(80),
          topic: z.string().trim().max(120).nullish(),
          statement: z.string().trim().min(10).max(4000),
          correct_answer: z.boolean(),
          feedback_correct: z.string().trim().min(5).max(2000),
          feedback_wrong: z.string().trim().min(5).max(2000),
          key_point: z.string().trim().min(3).max(1000),
          difficulty: z.enum(["facil", "medio", "dificil"]),
          pedagogical_review_status: z.enum(["pendente", "revisado", "aprovado", "arquivado"]),
          is_active: z.boolean(),
          sort_order: z.number().int().min(0).max(9999),
        })
        .parse(input),
  })
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pmma_questions")
      .upsert({ ...data, created_by: context.userId }, { onConflict: "public_code" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const pmmaUpdateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["active", "paused"]),
          questions_per_attempt: z.number().int().min(2).max(60),
          questions_per_discipline: z.number().int().min(1).max(10),
          lead_capture_after_question: z.number().int().min(1).max(30),
          bonus_enabled: z.boolean(),
          offer_url: z.string().url().max(500),
          whatsapp_number: z.string().trim().max(25).nullish(),
          paused_message: z.string().trim().max(500).nullish(),
        })
        .parse(input),
  })
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("pmma_campaigns").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const pmmaGetCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pmma_campaigns")
      .select("*")
      .eq("slug", "simulado-pmma")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
