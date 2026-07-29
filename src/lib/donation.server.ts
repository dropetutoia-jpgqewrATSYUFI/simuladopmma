const SETTINGS_KEY = "mercadopago";
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 5000;

export type DonationRecord = {
  id: string;
  status: string;
  amount: number;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  paid: boolean;
};

export type AccessStatus = {
  blocked: boolean;
  hasCredit: boolean;
  completedAttempts: number;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getMercadoPagoToken(): Promise<string | null> {
  const client = await db();
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  const stored = (data?.value as { accessToken?: string } | null)?.accessToken;
  return stored?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || null;
}

export async function saveMercadoPagoToken(accessToken: string) {
  const token = accessToken.trim();
  // A Public Key do Mercado Pago tem formato UUID (APP_USR-xxxxxxxx-xxxx-...) e não autentica a API.
  if (/^(APP_USR|TEST)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    throw new Error(
      "Esse valor é a Public Key. Cole o Access Token (credencial privada) do Mercado Pago.",
    );
  }
  const client = await db();
  const { error } = await client
    .from("app_settings")
    .upsert({ key: SETTINGS_KEY, value: { accessToken: token } }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getMercadoPagoStatus() {
  const client = await db();
  const { data } = await client
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  const token = (data?.value as { accessToken?: string } | null)?.accessToken ?? "";
  const envToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  const active = token || envToken;
  return {
    configured: Boolean(active),
    source: token ? ("painel" as const) : envToken ? ("ambiente" as const) : ("nenhum" as const),
    // Only a short suffix is ever revealed, never the full credential.
    maskedToken: active ? `••••••${active.slice(-4)}` : null,
    updatedAt: data?.updated_at ?? null,
  };
}

/** Evita que caracteres especiais quebrem/injetem no filtro `or()` do PostgREST. */
function isFilterSafe(value: string) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export type IdentityInput = {
  sessionId: string;
  fingerprint?: string | null;
  userId?: string | null;
};

/**
 * Identidade do candidato no simulado gratuito. O bloqueio segue a pessoa mesmo
 * que ela limpe o navegador ou crie outra conta de e-mail, porque combinamos
 * sessão + impressão digital do dispositivo/rede + conta logada.
 */
function identityFilter(identity: IdentityInput, fields: {
  session: string;
  fingerprint: string;
  user: string;
}): string | null {
  const parts: string[] = [];
  if (isFilterSafe(identity.sessionId)) parts.push(`${fields.session}.eq.${identity.sessionId}`);
  if (identity.fingerprint && isFilterSafe(identity.fingerprint)) {
    parts.push(`${fields.fingerprint}.eq.${identity.fingerprint}`);
  }
  if (identity.userId && isFilterSafe(identity.userId)) {
    parts.push(`${fields.user}.eq.${identity.userId}`);
  }
  return parts.length ? parts.join(",") : null;
}

/** id da campanha gratuita (a única sujeita ao bloqueio por doação). */
async function freeCampaignId(): Promise<string | null> {
  const client = await db();
  const { data } = await client
    .from("pmma_campaigns")
    .select("id")
    .eq("is_paid", false)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Access is blocked when the person already finished the free simulado and has no unused donation. */
export async function getAccessStatus(identity: IdentityInput): Promise<AccessStatus> {
  const client = await db();
  // O bloqueio do gratuito é por CONTA: no primeiro acesso o usuário logado sempre
  // entra liberado, e só é bloqueado depois que ELE concluir a prova. Sessão e
  // impressão digital só valem quando não há conta logada (fluxo anônimo).
  const attemptFilter = identity.userId && isFilterSafe(identity.userId)
    ? `user_id.eq.${identity.userId}`
    : identityFilter({ ...identity, userId: null }, {
        session: "anonymous_session_id",
        fingerprint: "device_fingerprint",
        user: "user_id",
      });
  const donationFilter = identityFilter(identity, {
    session: "session_id",
    fingerprint: "device_fingerprint",
    user: "user_id",
  });

  if (!attemptFilter || !donationFilter) {
    return { blocked: false, hasCredit: false, completedAttempts: 0 };
  }

  const campaignId = await freeCampaignId();

  let attemptsQuery = client
    .from("pmma_attempts")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .or(attemptFilter);
  if (campaignId) attemptsQuery = attemptsQuery.eq("campaign_id", campaignId);


  const donationsQuery = client
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .eq("consumed", false)
    .or(donationFilter);

  const [{ count: completed }, { count: credits }] = await Promise.all([
    attemptsQuery,
    donationsQuery,
  ]);

  const completedAttempts = completed ?? 0;
  const hasCredit = (credits ?? 0) > 0;
  return { blocked: completedAttempts > 0 && !hasCredit, hasCredit, completedAttempts };
}

/** Consumes one approved donation so a new attempt can be started. */
export async function consumeDonationCredit(identity: IdentityInput): Promise<boolean> {
  const client = await db();
  const filter = identityFilter(identity, {
    session: "session_id",
    fingerprint: "device_fingerprint",
    user: "user_id",
  });
  if (!filter) return false;

  const { data } = await client
    .from("donations")
    .select("id")
    .eq("status", "approved")
    .eq("consumed", false)
    .or(filter)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  const { error, count } = await client
    .from("donations")
    .update({ consumed: true, consumed_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", data.id)
    .eq("consumed", false);
  return !error && (count ?? 0) > 0;
}


function normalizeAmount(amount: number) {
  const value = Math.round(amount * 100) / 100;
  if (!Number.isFinite(value) || value < MIN_AMOUNT || value > MAX_AMOUNT) {
    throw new Error(`A doação deve ser entre R$ ${MIN_AMOUNT},00 e R$ ${MAX_AMOUNT},00.`);
  }
  return value;
}

export async function createPixDonation(input: {
  sessionId: string;
  amount: number;
  email: string | null;
  userId?: string | null;
}): Promise<DonationRecord> {
  const amount = normalizeAmount(input.amount);
  const token = await getMercadoPagoToken();
  if (!token) {
    throw new Error("Pagamentos indisponíveis no momento. Tente novamente mais tarde.");
  }

  const { getDeviceFingerprint } = await import("./fingerprint.server");
  const fingerprint = await getDeviceFingerprint();

  const client = await db();
  const { data: row, error: insertError } = await client
    .from("donations")
    .insert({
      session_id: input.sessionId,
      user_id: input.userId ?? null,
      device_fingerprint: fingerprint,

      amount,
      payer_email: input.email,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !row) throw new Error("Não foi possível registrar a doação.");

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": row.id,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: "Doação — conteúdo gratuito para concursos (Edital360)",
      payment_method_id: "pix",
      external_reference: row.id,
      payer: { email: input.email || "doador@edital360.com" },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: number | string;
        status?: string;
        point_of_interaction?: {
          transaction_data?: {
            qr_code?: string;
            qr_code_base64?: string;
            ticket_url?: string;
          };
        };
      }
    | null;

  if (!response.ok || !payload?.id) {
    console.error("[mercadopago] create payment failed", response.status, payload);
    await client.from("donations").update({ status: "error" }).eq("id", row.id);
    throw new Error("Não foi possível gerar o Pix agora. Tente novamente em instantes.");
  }

  const transaction = payload.point_of_interaction?.transaction_data ?? {};
  await client
    .from("donations")
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
  };
}

export async function refreshDonationStatus(
  donationId: string,
  sessionId: string,
  userId?: string | null,
): Promise<DonationRecord> {
  const client = await db();
  const { data: row } = await client
    .from("donations")
    .select(
      "id, session_id, user_id, amount, status, provider_payment_id, qr_code, qr_code_base64, ticket_url",
    )
    .eq("id", donationId)
    .maybeSingle();

  // Só o dono da doação (mesma sessão ou mesma conta) pode consultar o status.
  const owns = row?.session_id === sessionId || (userId != null && row?.user_id === userId);
  if (!row || !owns) throw new Error("Doação não encontrada.");


  let status = row.status;

  if (status !== "approved" && row.provider_payment_id) {
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
          .from("donations")
          .update({
            status,
            paid_at: status === "approved" ? new Date().toISOString() : null,
          })
          .eq("id", row.id);
      }
    }
  }

  return {
    id: row.id,
    status,
    amount: Number(row.amount),
    qrCode: row.qr_code,
    qrCodeBase64: row.qr_code_base64,
    ticketUrl: row.ticket_url,
    paid: status === "approved",
  };
}

export async function listDonations(limit: number) {
  const client = await db();
  const { data } = await client
    .from("donations")
    .select("id, amount, status, session_id, created_at, paid_at, consumed")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((d) => ({
    id: d.id,
    amount: Number(d.amount),
    status: d.status,
    sessionId: d.session_id.slice(0, 8),
    createdAt: d.created_at,
    paidAt: d.paid_at,
    consumed: d.consumed,
  }));
}
