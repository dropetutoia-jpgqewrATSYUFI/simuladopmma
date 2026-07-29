import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SimuladoCatalogItem } from "./pmma.types";
import type { PurchaseRecord } from "./purchase.server";

export const listPublicSimulados = createServerFn({ method: "GET" }).handler(
  async (): Promise<SimuladoCatalogItem[]> => {
    const { listSimulados } = await import("./purchase.server");
    return listSimulados(null);
  },
);

/** Admins têm acesso liberado a todos os simulados para teste, sem compra. */
async function checkAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return data === true;
}

export const listMySimulados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SimuladoCatalogItem[]> => {
    const { listSimulados } = await import("./purchase.server");
    return listSimulados(context.userId, await checkAdmin(context));
  });

export const myDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listSimulados, listMyPurchases, listMyAttempts } = await import("./purchase.server");
    const isAdmin = await checkAdmin(context);
    const [simulados, purchases, attempts] = await Promise.all([
      listSimulados(context.userId, isAdmin),
      listMyPurchases(context.userId),
      listMyAttempts(context.userId),
    ]);
    return { simulados, purchases, attempts, isAdmin };
  });


export const createSimuladoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ campaignSlug: z.string().min(3).max(80) }).parse(input),
  })
  .handler(async ({ data, context }): Promise<PurchaseRecord> => {
    const { createPixPurchase } = await import("./purchase.server");
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    return createPixPurchase({
      userId: context.userId,
      email,
      campaignSlug: data.campaignSlug,
    });
  });

export const checkSimuladoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({ parse: (input: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(input) })
  .handler(async ({ data, context }): Promise<PurchaseRecord> => {
    const { refreshPurchase } = await import("./purchase.server");
    return refreshPurchase(data.purchaseId, context.userId);
  });
