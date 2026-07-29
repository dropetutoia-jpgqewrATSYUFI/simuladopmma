import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { AccessStatus, DonationRecord } from "./donation.server";

type AuthedContext = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: AuthedContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

const sessionSchema = z.object({ sessionId: z.string().min(8).max(64) });

export const pmmaAccessStatus = createServerFn({ method: "POST" })
  .validator({ parse: (input: unknown) => sessionSchema.parse(input) })
  .handler(async ({ data }): Promise<AccessStatus> => {
    const { getAccessStatus } = await import("./donation.server");
    const { getDeviceFingerprint } = await import("./fingerprint.server");
    return getAccessStatus(data.sessionId, await getDeviceFingerprint());
  });

export const donationCreatePix = createServerFn({ method: "POST" })
  .validator({
    parse: (input: unknown) =>
      z
        .object({
          sessionId: z.string().min(8).max(64),
          amount: z.number().min(5, "O valor mínimo é R$ 5,00.").max(5000),
          email: z.string().trim().email().max(255).optional().or(z.literal("")),
        })
        .parse(input),
  })
  .handler(async ({ data }): Promise<DonationRecord> => {
    const { createPixDonation } = await import("./donation.server");
    return createPixDonation({
      sessionId: data.sessionId,
      amount: data.amount,
      email: data.email || null,
    });
  });

export const donationCheckPix = createServerFn({ method: "POST" })
  .validator({
    parse: (input: unknown) =>
      z
        .object({ donationId: z.string().uuid(), sessionId: z.string().min(8).max(64) })
        .parse(input),
  })
  .handler(async ({ data }): Promise<DonationRecord> => {
    const { refreshDonationStatus } = await import("./donation.server");
    return refreshDonationStatus(data.donationId, data.sessionId);
  });

export const adminPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getMercadoPagoStatus, listDonations } = await import("./donation.server");
    const [settings, donations] = await Promise.all([getMercadoPagoStatus(), listDonations(100)]);
    return { settings, donations };
  });

export const adminSavePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ accessToken: z.string().trim().min(20).max(500) }).parse(input),
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { saveMercadoPagoToken } = await import("./donation.server");
    await saveMercadoPagoToken(data.accessToken);
    return { ok: true };
  });
