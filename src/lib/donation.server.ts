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

/** Access is blocked when the session already finished a simulado and has no unused donation. */
export async function getAccessStatus(
  sessionId: string,
  fingerprint?: string | null,
): Promise<AccessStatus> {
  const client = await db();

  const attemptsQuery = client
    .from("pmma_attempts")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");
  const donationsQuery = client
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .eq("consumed", false);

  const [{ count: completed }, { count: credits }] = await Promise.all([
    fingerprint
      ? attemptsQuery.or(
          `anonymous_session_id.eq.${sessionId},device_fingerprint.eq.${fingerprint}`,
        )
      : attemptsQuery.eq("anonymous_session_id", sessionId),
    fingerprint
      ? donationsQuery.or(`session_id.eq.${sessionId},device_fingerprint.eq.${fingerprint}`)
      : donationsQuery.eq("session_id", sessionId),
  ]);

  const completedAttempts = completed ?? 0;
  const hasCredit = (credits ?? 0) > 0;
  return { blocked: completedAttempts > 0 && !hasCredit, hasCredit, completedAttempts };
}

/** Consumes one approved donation so a new attempt can be started. */
export async function consumeDonationCredit(
  sessionId: string,
  fingerprint?: string | null,
): Promise<boolean> {
  const client = await db();
  const query = client
    .from("donations")
    .select("id")
    .eq("status", "approved")
    .eq("consumed", false)
    .order("created_at", { ascending: true })
    .limit(1);

  const { data } = await (fingerprint
    ? query.or(`session_id.eq.${sessionId},device_fingerprint.eq.${fingerprint}`)
    : query.eq("session_id", sessionId)
  ).maybeSingle();
  if (!data) return false;
  const { error } = await client
    .from("donations")
    .update({ consumed: true, consumed_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("consumed", false);
  return !error;
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
}): Promise<DonationRecord> {
  const amount = normalizeAmount(input.amount);
  const token = await getMercadoPagoToken();
  if (!token) {
    throw new Error("Pagamentos indisponíveis no momento. Tente novamente mais tarde.");
  }

  const client = await db();
  const { data: row, error: insertError } = await client
    .from("donations")
    .insert({
      session_id: input.sessionId,
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
): Promise<DonationRecord> {
  const client = await db();
  const { data: row } = await client
    .from("donations")
    .select(
      "id, session_id, amount, status, provider_payment_id, qr_code, qr_code_base64, ticket_url",
    )
    .eq("id", donationId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!row) throw new Error("Doação não encontrada.");

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
