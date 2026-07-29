import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  adminApprovePayment,
  adminCancelPayment,
  adminDeletePayments,
  adminPayments,
  adminSyncPayment,
} from "@/lib/admin-manage.functions";
import { adminPaymentSettings, adminSavePaymentSettings } from "@/lib/donation.functions";
import type { AdminPaymentRow } from "@/lib/admin-manage.server";

type Settings = {
  configured: boolean;
  source: "painel" | "ambiente" | "nenhum";
  maskedToken: string | null;
  updatedAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusStyle: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  cancelled: "bg-white/10 text-white/55",
  rejected: "bg-red-500/15 text-red-300",
  error: "bg-red-500/15 text-red-300",
};

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-primary";

export function AdminPaymentsPanel() {
  const loadPayments = useServerFn(adminPayments);
  const syncPayment = useServerFn(adminSyncPayment);
  const approvePayment = useServerFn(adminApprovePayment);
  const cancelPayment = useServerFn(adminCancelPayment);
  const deletePayments = useServerFn(adminDeletePayments);
  const loadSettings = useServerFn(adminPaymentSettings);
  const saveSettings = useServerFn(adminSavePaymentSettings);

  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [totals, setTotals] = useState({ approved: 0, pending: 0, revenue: 0 });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [kind, setKind] = useState<"all" | "purchase" | "donation">("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const refresh = useCallback(
    async (filters?: { kind?: typeof kind; status?: string; search?: string }) => {
      setBusy(true);
      try {
        const result = await loadPayments({
          data: {
            kind: filters?.kind ?? kind,
            status: filters?.status ?? status,
            search: filters?.search ?? search,
          },
        });
        setRows(result.rows);
        setTotals(result.totals);
        setSelected(new Set());
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Falha ao carregar pagamentos.");
      } finally {
        setBusy(false);
      }
    },
    [loadPayments, kind, status, search],
  );

  useEffect(() => {
    void refresh();
    loadSettings()
      .then((p) => setSettings((p as { settings: Settings }).settings))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(
    fn: (args: { data: { kind: "purchase" | "donation"; id: string } }) => Promise<unknown>,
    row: AdminPaymentRow,
    okMessage: string,
  ) {
    setBusy(true);
    setMessage(null);
    try {
      await fn({ data: { kind: row.kind, id: row.id } });
      setMessage(okMessage);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha na operação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkDelete() {
    const chosen = rows.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const purchases = chosen.filter((r) => r.kind === "purchase").map((r) => r.id);
      const donations = chosen.filter((r) => r.kind === "donation").map((r) => r.id);
      if (purchases.length) await deletePayments({ data: { kind: "purchase", ids: purchases } });
      if (donations.length) await deletePayments({ data: { kind: "donation", ids: donations } });
      setMessage(`${chosen.length} registro(s) removido(s).`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveToken(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await saveSettings({ data: { accessToken: token.trim() } });
      setToken("");
      const p = await loadSettings();
      setSettings((p as { settings: Settings }).settings);
      setMessage("Credencial salva com sucesso.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Registros", String(rows.length)],
          ["Aprovados", String(totals.approved)],
          ["Pendentes", String(totals.pending)],
          ["Receita", brl(totals.revenue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{label}</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
        <h2 className="font-display text-lg font-semibold text-white">
          Mercado Pago · credencial Pix
        </h2>
        <p className="mt-1 text-sm text-white/65">
          Cole o <strong>Access Token de produção</strong>. Ele fica guardado apenas no servidor.
        </p>
        <p className="mt-3 text-sm">
          Status:{" "}
          <span className={settings?.configured ? "text-emerald-400" : "text-amber-400"}>
            {settings?.configured
              ? `configurado (${settings.maskedToken}, via ${settings.source})`
              : "não configurado — o Pix não será gerado"}
          </span>
        </p>
        <form onSubmit={handleSaveToken} className="mt-4 flex flex-wrap gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="APP_USR-..."
            className={`min-w-[240px] flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={busy || token.trim().length < 20}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            Salvar credencial
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => {
            const value = e.target.value as typeof kind;
            setKind(value);
            void refresh({ kind: value });
          }}
          className="h-11 rounded-xl border border-white/10 bg-[#0f172a] px-3 text-sm text-white"
        >
          <option value="all">Todos os tipos</option>
          <option value="purchase">Compras de simulado</option>
          <option value="donation">Doações</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            void refresh({ status: e.target.value });
          }}
          className="h-11 rounded-xl border border-white/10 bg-[#0f172a] px-3 text-sm text-white"
        >
          <option value="all">Todos os status</option>
          <option value="approved">Aprovados</option>
          <option value="pending">Pendentes</option>
          <option value="cancelled">Cancelados</option>
          <option value="rejected">Rejeitados</option>
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void refresh();
          }}
          className="flex min-w-[220px] flex-1 gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por e-mail, nome ou ID do provedor"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            Filtrar
          </button>
        </form>
        <button
          onClick={handleBulkDelete}
          disabled={busy || selected.size === 0}
          className="h-11 rounded-xl border border-red-500/40 bg-red-500/10 px-5 text-sm font-bold text-red-300 disabled:opacity-40"
        >
          Excluir ({selected.size})
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/55">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
                    )
                  }
                  className="size-4 accent-[#3B82F6]"
                />
              </th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-white/50">
                  {busy ? "Carregando..." : "Nenhum pagamento encontrado."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                      className="size-4 accent-[#3B82F6]"
                    />
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {r.kind === "purchase" ? "Compra" : "Doação"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{brl(r.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[r.status] ?? "bg-white/10 text-white/60"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    <p>{r.userName ?? "—"}</p>
                    <p className="text-xs text-white/45">{r.userEmail ?? r.reference ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.campaignName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/55">
                    {formatDate(r.createdAt)}
                    <p className="text-white/35">Pago: {formatDate(r.paidAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => void act(syncPayment, r, "Status sincronizado.")}
                        disabled={busy}
                        className="h-8 rounded-lg border border-white/15 px-2.5 text-xs font-bold text-white transition hover:border-primary/50 disabled:opacity-50"
                      >
                        Consultar
                      </button>
                      {r.status !== "approved" ? (
                        <button
                          onClick={() => void act(approvePayment, r, "Pagamento liberado.")}
                          disabled={busy}
                          className="h-8 rounded-lg bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-400 disabled:opacity-50"
                        >
                          Liberar
                        </button>
                      ) : null}
                      {r.status !== "cancelled" ? (
                        <button
                          onClick={() => void act(cancelPayment, r, "Pagamento cancelado.")}
                          disabled={busy}
                          className="h-8 rounded-lg bg-white/8 px-2.5 text-xs font-bold text-white/70 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
