/**
 * Gestão administrativa (CMS): usuários, acessos e pagamentos.
 * Todas as funções aqui assumem que o chamador já foi validado como admin
 * nas server functions correspondentes.
 */

export type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  attempts: number;
  completedAttempts: number;
  purchases: number;
  paidPurchases: number;
  totalPaid: number;
  releasedSimulados: number;
};

export type AdminPaymentRow = {
  id: string;
  kind: "purchase" | "donation";
  amount: number;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  reference: string | null;
};

export type AdminAccessRow = {
  userId: string;
  campaignId: string;
  campaignName: string;
  campaignSlug: string;
  isPaid: boolean;
  status: "released" | "blocked";
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------- usuários ------------------------------- */

export async function listUsers(search: string): Promise<AdminUser[]> {
  const client = await db();

  const { data: authData, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  const authUsers = authData?.users ?? [];

  const ids = authUsers.map((u) => u.id);
  if (ids.length === 0) return [];

  const [profilesRes, rolesRes, attemptsRes, purchasesRes, accessRes] = await Promise.all([
    client.from("profiles").select("user_id, full_name, phone, city, email").in("user_id", ids),
    client.from("user_roles").select("user_id, role").in("user_id", ids),
    client.from("pmma_attempts").select("user_id, status").in("user_id", ids).limit(20000),
    client.from("purchases").select("user_id, status, amount").in("user_id", ids).limit(20000),
    client
      .from("simulado_access")
      .select("user_id, status")
      .in("user_id", ids)
      .eq("status", "released")
      .limit(20000),
  ]);

  const profiles = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const admins = new Set(
    (rolesRes.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
  );

  const attemptStats = new Map<string, { total: number; completed: number }>();
  for (const a of attemptsRes.data ?? []) {
    if (!a.user_id) continue;
    const entry = attemptStats.get(a.user_id) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (a.status === "completed") entry.completed += 1;
    attemptStats.set(a.user_id, entry);
  }

  const purchaseStats = new Map<string, { total: number; paid: number; sum: number }>();
  for (const p of purchasesRes.data ?? []) {
    const entry = purchaseStats.get(p.user_id) ?? { total: 0, paid: 0, sum: 0 };
    entry.total += 1;
    if (p.status === "approved") {
      entry.paid += 1;
      entry.sum += Number(p.amount ?? 0);
    }
    purchaseStats.set(p.user_id, entry);
  }

  const releasedCount = new Map<string, number>();
  for (const a of accessRes.data ?? []) {
    releasedCount.set(a.user_id, (releasedCount.get(a.user_id) ?? 0) + 1);
  }

  const term = search.trim().toLowerCase();

  return authUsers
    .map((u) => {
      const profile = profiles.get(u.id);
      const attempts = attemptStats.get(u.id) ?? { total: 0, completed: 0 };
      const purchases = purchaseStats.get(u.id) ?? { total: 0, paid: 0, sum: 0 };
      const meta = (u.user_metadata ?? {}) as { full_name?: string; whatsapp?: string };
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? null,
        fullName: profile?.full_name ?? meta.full_name ?? null,
        phone: profile?.phone ?? meta.whatsapp ?? null,
        city: profile?.city ?? null,
        isAdmin: admins.has(u.id),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        attempts: attempts.total,
        completedAttempts: attempts.completed,
        purchases: purchases.total,
        paidPurchases: purchases.paid,
        totalPaid: Math.round(purchases.sum * 100) / 100,
        releasedSimulados: releasedCount.get(u.id) ?? 0,
      } satisfies AdminUser;
    })
    .filter((u) => {
      if (!term) return true;
      return [u.email, u.fullName, u.phone].some((v) => v?.toLowerCase().includes(term));
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function updateUser(input: {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  city?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  actorId: string;
}) {
  const client = await db();

  if (input.email) {
    const { error } = await client.auth.admin.updateUserById(input.userId, {
      email: input.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
  }

  const profilePatch: Record<string, string | null> = {};
  if (input.fullName !== undefined) profilePatch.full_name = input.fullName;
  if (input.phone !== undefined) profilePatch.phone = input.phone;
  if (input.city !== undefined) profilePatch.city = input.city;
  if (input.email !== undefined) profilePatch.email = input.email;

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await client
      .from("profiles")
      .upsert({ user_id: input.userId, ...profilePatch }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }

  if (input.isAdmin !== undefined) {
    if (input.userId === input.actorId && input.isAdmin === false) {
      throw new Error("Você não pode remover o seu próprio acesso de administrador.");
    }
    if (input.isAdmin) {
      const { error } = await client
        .from("user_roles")
        .upsert({ user_id: input.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await client
        .from("user_roles")
        .delete()
        .eq("user_id", input.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
  }

  return { ok: true as const };
}

export async function resetUserPassword(userId: string, password: string) {
  const client = await db();
  const { error } = await client.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deleteUsers(userIds: string[], actorId: string) {
  const client = await db();
  const targets = userIds.filter((id) => id !== actorId);
  if (targets.length === 0) {
    throw new Error("Selecione ao menos um usuário diferente da sua própria conta.");
  }

  const failed: string[] = [];
  for (const id of targets) {
    // Limpa dados vinculados antes de remover a conta.
    await client.from("simulado_access").delete().eq("user_id", id);
    await client.from("purchases").delete().eq("user_id", id);
    await client.from("donations").delete().eq("user_id", id);
    await client.from("pmma_attempts").delete().eq("user_id", id);
    await client.from("user_roles").delete().eq("user_id", id);
    await client.from("profiles").delete().eq("user_id", id);
    const { error } = await client.auth.admin.deleteUser(id);
    if (error) failed.push(id);
  }

  return {
    deleted: targets.length - failed.length,
    skipped: userIds.length - targets.length,
    failed: failed.length,
  };
}

/* -------------------------------- acessos -------------------------------- */

export async function listUserAccess(userId: string): Promise<AdminAccessRow[]> {
  const client = await db();
  const [campaignsRes, accessRes] = await Promise.all([
    client
      .from("pmma_campaigns")
      .select("id, name, slug, is_paid")
      .order("display_order", { ascending: true }),
    client.from("simulado_access").select("campaign_id, status").eq("user_id", userId),
  ]);

  const statuses = new Map((accessRes.data ?? []).map((a) => [a.campaign_id, a.status]));

  return (campaignsRes.data ?? []).map((c) => ({
    userId,
    campaignId: c.id,
    campaignName: c.name,
    campaignSlug: c.slug,
    isPaid: c.is_paid,
    status: statuses.get(c.id) === "released" ? "released" : "blocked",
  }));
}

export async function setUserAccess(
  userId: string,
  campaignId: string,
  status: "released" | "blocked",
) {
  const client = await db();
  const { error } = await client.from("simulado_access").upsert(
    {
      user_id: userId,
      campaign_id: campaignId,
      status,
      released_at: status === "released" ? new Date().toISOString() : null,
      source: status === "released" ? "admin" : "admin_block",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,campaign_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/* ------------------------------ pagamentos ------------------------------ */

export async function listPayments(input: {
  kind: "all" | "purchase" | "donation";
  status: string;
  search: string;
}): Promise<{ rows: AdminPaymentRow[]; totals: { approved: number; pending: number; revenue: number } }> {
  const client = await db();

  const [purchasesRes, donationsRes] = await Promise.all([
    client
      .from("purchases")
      .select(
        "id, user_id, amount, status, provider, provider_payment_id, created_at, paid_at, campaign_id, pmma_campaigns(name)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    client
      .from("donations")
      .select(
        "id, user_id, amount, status, provider, provider_payment_id, created_at, paid_at, session_id, payer_email, consumed",
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const userIds = [
    ...new Set(
      [
        ...(purchasesRes.data ?? []).map((p) => p.user_id),
        ...(donationsRes.data ?? []).map((d) => d.user_id),
      ].filter((v): v is string => Boolean(v)),
    ),
  ];

  const profiles = new Map<string, { email: string | null; full_name: string | null }>();
  if (userIds.length > 0) {
    const { data } = await client
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);
    for (const p of data ?? []) {
      profiles.set(p.user_id, { email: p.email, full_name: p.full_name });
    }
  }

  const purchases: AdminPaymentRow[] = (purchasesRes.data ?? []).map((p) => {
    const campaign = p.pmma_campaigns as { name: string } | null;
    const profile = p.user_id ? profiles.get(p.user_id) : null;
    return {
      id: p.id,
      kind: "purchase",
      amount: Number(p.amount),
      status: p.status,
      provider: p.provider,
      providerPaymentId: p.provider_payment_id,
      createdAt: p.created_at,
      paidAt: p.paid_at,
      userId: p.user_id,
      userEmail: profile?.email ?? null,
      userName: profile?.full_name ?? null,
      campaignId: p.campaign_id,
      campaignName: campaign?.name ?? null,
      reference: null,
    };
  });

  const donations: AdminPaymentRow[] = (donationsRes.data ?? []).map((d) => {
    const profile = d.user_id ? profiles.get(d.user_id) : null;
    return {
      id: d.id,
      kind: "donation",
      amount: Number(d.amount),
      status: d.status,
      provider: d.provider,
      providerPaymentId: d.provider_payment_id,
      createdAt: d.created_at,
      paidAt: d.paid_at,
      userId: d.user_id,
      userEmail: profile?.email ?? d.payer_email ?? null,
      userName: profile?.full_name ?? null,
      campaignId: null,
      campaignName: d.consumed ? "Doação (crédito usado)" : "Doação (crédito disponível)",
      reference: d.session_id?.slice(0, 8) ?? null,
    };
  });

  let rows = [...purchases, ...donations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (input.kind !== "all") rows = rows.filter((r) => r.kind === input.kind);
  if (input.status !== "all") rows = rows.filter((r) => r.status === input.status);

  const term = input.search.trim().toLowerCase();
  if (term) {
    rows = rows.filter((r) =>
      [r.userEmail, r.userName, r.providerPaymentId, r.campaignName, r.reference].some((v) =>
        v?.toLowerCase().includes(term),
      ),
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      if (r.status === "approved") {
        acc.approved += 1;
        acc.revenue += r.amount;
      } else if (r.status === "pending") {
        acc.pending += 1;
      }
      return acc;
    },
    { approved: 0, pending: 0, revenue: 0 },
  );
  totals.revenue = Math.round(totals.revenue * 100) / 100;

  return { rows, totals };
}

/** Consulta o Mercado Pago e sincroniza o status real do pagamento. */
export async function syncPayment(kind: "purchase" | "donation", id: string) {
  const client = await db();
  const table = kind === "purchase" ? "purchases" : "donations";

  const { data: rawRow } = await (client.from(table) as any)
    .select("id, status, provider_payment_id, user_id, campaign_id")
    .eq("id", id)
    .maybeSingle();

  const row = rawRow as {
    id: string;
    status: string;
    provider_payment_id: string | null;
    user_id: string | null;
    campaign_id?: string | null;
  } | null;

  if (!row) throw new Error("Pagamento não encontrado.");
  const record = row;

  if (!record.provider_payment_id) throw new Error("Pagamento sem identificador no provedor.");

  const { getMercadoPagoToken } = await import("./donation.server");
  const token = await getMercadoPagoToken();
  if (!token) throw new Error("Credencial do Mercado Pago não configurada.");

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${record.provider_payment_id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const payload = (await response.json().catch(() => null)) as { status?: string } | null;
  if (!response.ok || !payload?.status) throw new Error("Não foi possível consultar o provedor.");

  const status = payload.status;
  await client
    .from(table)
    .update({ status, paid_at: status === "approved" ? new Date().toISOString() : null })
    .eq("id", id);

  if (kind === "purchase" && status === "approved" && record.user_id && record.campaign_id) {
    await setUserAccess(record.user_id, record.campaign_id, "released");
  }

  return { status };
}

/** Liberação manual: marca como aprovado e destrava o acesso do usuário. */
export async function approvePaymentManually(kind: "purchase" | "donation", id: string) {
  const client = await db();
  const now = new Date().toISOString();

  if (kind === "purchase") {
    const { data: row } = await client
      .from("purchases")
      .select("id, user_id, campaign_id")
      .eq("id", id)
      .maybeSingle();
    if (!row) throw new Error("Compra não encontrada.");
    const { error } = await client
      .from("purchases")
      .update({ status: "approved", paid_at: now })
      .eq("id", id);
    if (error) throw new Error(error.message);
    if (row.user_id && row.campaign_id) {
      await setUserAccess(row.user_id, row.campaign_id, "released");
    }
  } else {
    const { error } = await client
      .from("donations")
      .update({ status: "approved", paid_at: now, consumed: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  return { ok: true as const };
}

export async function cancelPayment(kind: "purchase" | "donation", id: string) {
  const client = await db();
  const table = kind === "purchase" ? "purchases" : "donations";
  const { error } = await client.from(table).update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deletePayments(kind: "purchase" | "donation", ids: string[]) {
  const client = await db();
  const table = kind === "purchase" ? "purchases" : "donations";
  const { error } = await client.from(table).delete().in("id", ids);
  if (error) throw new Error(error.message);
  return { deleted: ids.length };
}
