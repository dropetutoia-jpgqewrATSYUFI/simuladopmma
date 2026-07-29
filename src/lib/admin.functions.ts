import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { AdminLead, AdminOverview, AdminQuestion } from "./admin.types";

type AuthedContext = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: AuthedContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}


export const adminWhoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ userId: string; isAdmin: boolean }> => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { userId: context.userId, isAdmin: data === true };
  });

/**
 * One-time bootstrap: the first signed-in user becomes admin only while the
 * project has no admin at all. Once an admin exists this always fails.
 */
export const adminClaimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; reason?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false, reason: "Já existe um administrador." };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context);
    const { getOverview } = await import("./admin.server");
    return getOverview();
  });

export const adminLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z
        .object({
          search: z.string().max(120).default(""),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .parse(input ?? {}),
  })
  .handler(async ({ context, data }): Promise<AdminLead[]> => {
    await assertAdmin(context);
    const { listLeads } = await import("./admin.server");
    return listLeads(data.search, data.limit);
  });

export const adminLeadsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string> => {
    await assertAdmin(context);
    const { leadsCsv } = await import("./admin.server");
    return leadsCsv();
  });

export const adminQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminQuestion[]> => {
    await assertAdmin(context);
    const { listQuestions } = await import("./admin.server");
    return listQuestions();
  });

export const adminToggleQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input),
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { setQuestionActive } = await import("./admin.server");
    await setQuestionActive(data.id, data.isActive);
    return { ok: true };
  });

export const adminDeleteLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(input),
  })
  .handler(async ({ context, data }): Promise<{ deleted: number }> => {
    await assertAdmin(context);
    const { deleteLeads } = await import("./admin.server");
    return { deleted: await deleteLeads(data.ids) };
  });
