import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const withAdminRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error || !data) {
      throw new Error("Forbidden: Admin access required");
    }

    return { supabase, userId };
  });

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type AttemptRow = Database["public"]["Tables"]["quiz_attempts"]["Row"];

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      throw new Error(error.message);
    }

    return leads as LeadRow[];
  });

export const listAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const { data: attempts, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      throw new Error(error.message);
    }

    return attempts as AttemptRow[];
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      statement: z.string().min(5),
      discipline: z.string().min(2),
      topic: z.string().min(2),
      difficulty: z.enum(["easy", "medium", "hard"]),
      explanation: z.string().min(5),
      options: z
        .array(
          z.object({
            id: z.string().uuid().optional(),
            option_text: z.string().min(1),
            is_correct: z.boolean(),
          })
        )
        .min(2),
    })
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const { options, id, ...questionData } = data;

    const { data: question, error: questionError } = await supabase
      .from("quiz_questions")
      .upsert({ id, ...questionData })
      .select()
      .single();

    if (questionError || !question) {
      throw new Error(questionError?.message ?? "Failed to upsert question");
    }

    const correctCount = options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      throw new Error("Each question must have exactly one correct option");
    }

    const optionsToUpsert = options.map((o) => ({
      ...o,
      question_id: question.id,
    }));

    const { error: optionsError } = await supabase
      .from("quiz_options")
      .upsert(optionsToUpsert);

    if (optionsError) {
      throw new Error(optionsError.message);
    }

    return { success: true, questionId: question.id };
  });
