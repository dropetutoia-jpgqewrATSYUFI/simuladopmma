import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { AdminAccessRow, AdminPaymentRow, AdminUser } from "./admin-manage.server";

type AuthedContext = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: AuthedContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

/* ------------------------------- usuários ------------------------------- */

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ search: z.string().max(120).default("") }).parse(input ?? {}),
  })
  .handler(async ({ context, data }): Promise<AdminUser[]> => {
    await assertAdmin(context);
    const { listUsers } = await import("./admin-manage.server");
    return listUsers(data.search);
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z
        .object({
          userId: z.string().uuid(),
          fullName: z.string().trim().max(120).nullable().optional(),
          phone: z.string().trim().max(40).nullable().optional(),
          city: z.string().trim().max(80).nullable().optional(),
          email: z.string().trim().email().max(255).optional(),
          isAdmin: z.boolean().optional(),
        })
        .parse(input),
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { updateUser } = await import("./admin-manage.server");
    return updateUser({ ...data, actorId: context.userId });
  });

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ userId: z.string().uuid(), password: z.string().min(6).max(72) }).parse(input),
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { resetUserPassword } = await import("./admin-manage.server");
    return resetUserPassword(data.userId, data.password);
  });

export const adminDeleteUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z.object({ userIds: z.array(z.string().uuid()).min(1).max(200) }).parse(input),
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { deleteUsers } = await import("./admin-manage.server");
    return deleteUsers(data.userIds, context.userId);
  });

/* -------------------------------- acessos -------------------------------- */

export const adminUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({ parse: (input: unknown) => z.object({ userId: z.string().uuid() }).parse(input) })
  .handler(async ({ context, data }): Promise<AdminAccessRow[]> => {
    await assertAdmin(context);
    const { listUserAccess } = await import("./admin-manage.server");
    return listUserAccess(data.userId);
  });

export const adminSetUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z
        .object({
          userId: z.string().uuid(),
          campaignId: z.string().uuid(),
          status: z.enum(["released", "blocked"]),
        })
        .parse(input),
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { setUserAccess } = await import("./admin-manage.server");
    return setUserAccess(data.userId, data.campaignId, data.status);
  });

/* ------------------------------ pagamentos ------------------------------ */

export const adminPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z
        .object({
          kind: z.enum(["all", "purchase", "donation"]).default("all"),
          status: z.string().max(30).default("all"),
          search: z.string().max(120).default(""),
        })
        .parse(input ?? {}),
  })
  .handler(
    async ({
      context,
      data,
    }): Promise<{
      rows: AdminPaymentRow[];
      totals: { approved: number; pending: number; revenue: number };
    }> => {
      await assertAdmin(context);
      const { listPayments } = await import("./admin-manage.server");
      return listPayments(data);
    },
  );

const paymentTarget = z.object({
  kind: z.enum(["purchase", "donation"]),
  id: z.string().uuid(),
});

export const adminSyncPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({ parse: (input: unknown) => paymentTarget.parse(input) })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { syncPayment } = await import("./admin-manage.server");
    return syncPayment(data.kind, data.id);
  });

export const adminApprovePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({ parse: (input: unknown) => paymentTarget.parse(input) })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { approvePaymentManually } = await import("./admin-manage.server");
    return approvePaymentManually(data.kind, data.id);
  });

export const adminCancelPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({ parse: (input: unknown) => paymentTarget.parse(input) })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { cancelPayment } = await import("./admin-manage.server");
    return cancelPayment(data.kind, data.id);
  });

export const adminDeletePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
    parse: (input: unknown) =>
      z
        .object({
          kind: z.enum(["purchase", "donation"]),
          ids: z.array(z.string().uuid()).min(1).max(200),
        })
        .parse(input),
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { deletePayments } = await import("./admin-manage.server");
    return deletePayments(data.kind, data.ids);
  });
