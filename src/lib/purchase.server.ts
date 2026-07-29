import type { SimuladoCatalogItem } from "./pmma.types";

export type PurchaseRecord = {
  id: string;
  status: string;
  amount: number;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  paid: boolean;
  campaignSlug: string;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function hasApprovedPurchase(userId: string, campaignId: string): Promise<boolean> {
  const client = await db();
  const { count } = await client
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("status", "approved");
  return (count ?? 0) > 0;
}

/** Cria as situações "bloqueado" de todos os simulados pagos para o usuário. */
export async function ensureSimuladoAccess(userId: string): Promise<void> {
  const client = await db();
  await client.rpc("ensure_simulado_access", { _user_id: userId });
}

/** Libera imediatamente o simulado vinculado ao usuário. */
export async function releaseSimuladoAccess(
  userId: string,
  campaignId: string,
  source = "purchase",
): Promise<void> {
  const client = await db();
  await client.rpc("release_simulado_access", {
    _user_id: userId,
    _campaign_id: campaignId,
    _source: source,
  });
}

/** Situação de acesso vinculada ao usuário: "released" só após pagamento aprovado. */
export async function getSimuladoAccessStatus(
  userId: string,
  campaignId: string,
): Promise<"released" | "blocked"> {
  const client = await db();
  const { data } = await client
    .from("simulado_access")
    .select("status")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (data?.status === "released") return "released";

  // Segurança extra: se houver compra aprovada, sincroniza a situação.
  if (await hasApprovedPurchase(userId, campaignId)) {
    await releaseSimuladoAccess(userId, campaignId);
    return "released";
  }
  return "blocked";
}

/** Catálogo público de simulados; `owned` só é verdadeiro para simulados já comprados pelo usuário (ou para admins). */
export async function listSimulados(
  userId: string | null,
  isAdmin = false,
): Promise<SimuladoCatalogItem[]> {
  const client = await db();
  const { data: campaigns } = await client
    .from("pmma_campaigns")
    .select("id, slug, name, description, is_paid, price_cents, total_questions, status, display_order")
    .eq("status", "active")
    .order("display_order", { ascending: true });

  const rows = campaigns ?? [];

  const ownedIds = new Set<string>();
  if (userId) {
    // Garante que todo usuário cadastrado tenha os simulados pagos com situação "bloqueado".
    await ensureSimuladoAccess(userId);

    const { data: approved } = await client
      .from("purchases")
      .select("campaign_id")
      .eq("user_id", userId)
      .eq("status", "approved");
    for (const p of approved ?? []) {
      ownedIds.add(p.campaign_id);
      await releaseSimuladoAccess(userId, p.campaign_id);
    }

    const { data: access } = await client
      .from("simulado_access")
      .select("campaign_id, status")
      .eq("user_id", userId)
      .eq("status", "released");
    for (const a of access ?? []) ownedIds.add(a.campaign_id);
  }

  const counts = await Promise.all(
    rows.map(async (c) => {
      const { count } = await client
        .from("pmma_questions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", c.id)
        .eq("is_active", true);
      return count ?? 0;
    }),
  );

  return rows.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    isPaid: c.is_paid,
    priceCents: c.price_cents,
    totalQuestions: c.total_questions,
    availableQuestions: counts[i],
    status: c.status,
    owned: isAdmin || !c.is_paid || ownedIds.has(c.id),
  }));
}

export async function createPixPurchase(input: {
  userId: string;
  email: string | null;
  campaignSlug: string;
}): Promise<PurchaseRecord> {
  const client = await db();
  const { data: campaign } = await client
    .from("pmma_campaigns")
    .select("id, slug, name, is_paid, price_cents, status")
    .eq("slug", input.campaignSlug)
    .maybeSingle();

  if (!campaign || !campaign.is_paid || campaign.status !== "active") {
    throw new Error("Simulado indisponível para compra.");
  }

  if (await hasApprovedPurchase(input.userId, campaign.id)) {
    throw new Error("Você já possui acesso a este simulado.");
  }

  // Reaproveita um Pix pendente ainda válido em vez de gerar cobranças duplicadas.
  const { data: pending } = await client
    .from("purchases")
    .select("id, status, amount, qr_code, qr_code_base64, ticket_url")
    .eq("user_id", input.userId)
    .eq("campaign_id", campaign.id)
    .eq("status", "pending")
    .not("qr_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    return {
      id: pending.id,
      status: pending.status,
      amount: Number(pending.amount),
      qrCode: pending.qr_code,
      qrCodeBase64: pending.qr_code_base64,
      ticketUrl: pending.ticket_url,
      paid: false,
      campaignSlug: campaign.slug,
    };
  }

  const { getMercadoPagoToken } = await import("./donation.server");
  const token = await getMercadoPagoToken();
  if (!token) throw new Error("Pagamentos indisponíveis no momento. Tente novamente mais tarde.");

  const amount = Math.round(campaign.price_cents) / 100;

  const { data: row, error: insertError } = await client
    .from("purchases")
    .insert({
      user_id: input.userId,
      campaign_id: campaign.id,
      amount,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !row) throw new Error("Não foi possível registrar a compra.");

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": row.id,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: `${campaign.name} — Edital360`,
      payment_method_id: "pix",
      external_reference: row.id,
      payer: { email: input.email || "aluno@edital360.com" },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: number | string;
        status?: string;
        point_of_interaction?: {
          transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
        };
      }
    | null;

  if (!response.ok || !payload?.id) {
    console.error("[mercadopago] purchase failed", response.status, payload);
    await client.from("purchases").update({ status: "error" }).eq("id", row.id);
    throw new Error("Não foi possível gerar o Pix agora. Tente novamente em instantes.");
  }

  const transaction = payload.point_of_interaction?.transaction_data ?? {};
  await client
    .from("purchases")
    .update({
      provider_payment_id: String(payload.id),
      status: payload.status ?? "pending",
      qr_code: transaction.qr_code ?? null,
      qr_code_base64: transaction.qr_code_base64 ?? null,
      ticket_url: transaction.ticket_url ?? null,
    })
    .eq("id", row.id);

  return {
    id: row.id,
    status: payload.status ?? "pending",
    amount,
    qrCode: transaction.qr_code ?? null,
    qrCodeBase64: transaction.qr_code_base64 ?? null,
    ticketUrl: transaction.ticket_url ?? null,
    paid: payload.status === "approved",
    campaignSlug: campaign.slug,
  };
}

export async function refreshPurchase(
  purchaseId: string,
  userId: string,
): Promise<PurchaseRecord> {
  const client = await db();
  const { data: row } = await client
    .from("purchases")
    .select(
      "id, amount, status, campaign_id, provider_payment_id, qr_code, qr_code_base64, ticket_url, pmma_campaigns(slug)",
    )
    .eq("id", purchaseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) throw new Error("Compra não encontrada.");

  let status = row.status;

  if (status !== "approved" && row.provider_payment_id) {
    const { getMercadoPagoToken } = await import("./donation.server");
    const token = await getMercadoPagoToken();
    if (token) {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${row.provider_payment_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = (await response.json().catch(() => null)) as { status?: string } | null;
      if (response.ok && payload?.status && payload.status !== status) {
        status = payload.status;
        await client
          .from("purchases")
          .update({
            status,
            paid_at: status === "approved" ? new Date().toISOString() : null,
          })
          .eq("id", row.id);
      }
    }
  }

  // Desbloqueio imediato do simulado vinculado ao usuário assim que o Pix é aprovado.
  if (status === "approved") {
    await releaseSimuladoAccess(userId, row.campaign_id);
  }

  const campaign = row.pmma_campaigns as { slug: string } | null;

  return {
    id: row.id,
    status,
    amount: Number(row.amount),
    qrCode: row.qr_code,
    qrCodeBase64: row.qr_code_base64,
    ticketUrl: row.ticket_url,
    paid: status === "approved",
    campaignSlug: campaign?.slug ?? "",
  };
}

export async function listMyPurchases(userId: string) {
  const client = await db();
  const { data } = await client
    .from("purchases")
    .select("id, amount, status, created_at, paid_at, pmma_campaigns(name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((p) => {
    const campaign = p.pmma_campaigns as { name: string; slug: string } | null;
    return {
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      createdAt: p.created_at,
      paidAt: p.paid_at,
      campaignName: campaign?.name ?? "Simulado",
      campaignSlug: campaign?.slug ?? "",
    };
  });
}

export async function listMyAttempts(userId: string) {
  const client = await db();
  const { data } = await client
    .from("pmma_attempts")
    .select("id, status, percentage, correct_count, total_questions, created_at, pmma_campaigns(name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((a) => {
    const campaign = a.pmma_campaigns as { name: string; slug: string } | null;
    return {
      id: a.id,
      status: a.status,
      percentage: Number(a.percentage),
      correct: a.correct_count,
      total: a.total_questions,
      createdAt: a.created_at,
      campaignName: campaign?.name ?? "Simulado",
      campaignSlug: campaign?.slug ?? "",
    };
  });
}
