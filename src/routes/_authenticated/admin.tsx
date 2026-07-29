import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminClaimFirstAdmin,
  adminLeads,
  adminLeadsCsv,
  adminOverview,
  adminQuestions,
  adminToggleQuestion,
  adminWhoAmI,
} from "@/lib/admin.functions";
import { adminPaymentSettings, adminSavePaymentSettings } from "@/lib/donation.functions";
import type { AdminLead, AdminOverview, AdminQuestion } from "@/lib/admin.types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel de gerenciamento | Simulado PMMA" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Métricas, leads e banco de questões do Simulado PMMA da Edital360.",
      },
    ],
  }),
});

type Tab = "visao" | "leads" | "questoes" | "pagamentos";

type PaymentsData = {
  settings: {
    configured: boolean;
    source: "painel" | "ambiente" | "nenhum";
    maskedToken: string | null;
    updatedAt: string | null;
  };
  donations: {
    id: string;
    amount: number;
    status: string;
    sessionId: string;
    createdAt: string;
    paidAt: string | null;
    consumed: boolean;
  }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="pmma-glass rounded-2xl p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const whoAmI = useServerFn(adminWhoAmI);
  const claimAdmin = useServerFn(adminClaimFirstAdmin);
  const loadOverview = useServerFn(adminOverview);
  const loadLeads = useServerFn(adminLeads);
  const loadCsv = useServerFn(adminLeadsCsv);
  const loadQuestions = useServerFn(adminQuestions);
  const toggleQuestion = useServerFn(adminToggleQuestion);
  const loadPayments = useServerFn(adminPaymentSettings);
  const savePayments = useServerFn(adminSavePaymentSettings);

  const [status, setStatus] = useState<"loading" | "denied" | "ready">("loading");
  const [tab, setTab] = useState<Tab>("visao");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState<PaymentsData | null>(null);
  const [mpToken, setMpToken] = useState("");
  const [mpMessage, setMpMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [o, l, q, p] = await Promise.all([
        loadOverview(),
        loadLeads({ data: { search: "", limit: 200 } }),
        loadQuestions(),
        loadPayments(),
      ]);
      setOverview(o);
      setLeads(l);
      setQuestions(q);
      setPayments(p as PaymentsData);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados.");
      setStatus("denied");
    }
  }, [loadLeads, loadOverview, loadQuestions, loadPayments]);

  useEffect(() => {
    let active = true;
    whoAmI()
      .then(async (me) => {
        if (!active) return;
        if (me.isAdmin) {
          await refresh();
          return;
        }
        const claimed = await claimAdmin();
        if (!active) return;
        if (claimed.ok) await refresh();
        else setStatus("denied");
      })
      .catch(() => active && setStatus("denied"));
    return () => {
      active = false;
    };
  }, [whoAmI, claimAdmin, refresh]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setLeads(await loadLeads({ data: { search, limit: 200 } }));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      const csv = await loadCsv();
      const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leads-simulado-pmma-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(question: AdminQuestion) {
    setBusy(true);
    try {
      await toggleQuestion({ data: { id: question.id, isActive: !question.isActive } });
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, isActive: !q.isActive } : q)),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveToken(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMpMessage(null);
    try {
      await savePayments({ data: { accessToken: mpToken.trim() } });
      setMpToken("");
      setPayments((await loadPayments()) as PaymentsData);
      setMpMessage("Credencial salva com sucesso.");
    } catch (err) {
      setMpMessage(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  const maxDay = useMemo(
    () => Math.max(1, ...(overview?.last7Days.map((d) => d.attempts) ?? [1])),
    [overview],
  );

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando painel...</p>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="pmma-glass max-w-md rounded-2xl p-8 text-center">
          <h1 className="font-display text-xl font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "Sua conta não tem permissão de administrador."}
          </p>
          <button
            onClick={handleSignOut}
            className="mt-6 h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Painel de gerenciamento
          </h1>
          <p className="text-sm text-muted-foreground">Simulado PMMA 2026 · Edital360</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold text-foreground transition hover:bg-white/5"
          >
            Atualizar
          </button>
          <button
            onClick={handleSignOut}
            className="h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold text-muted-foreground transition hover:bg-white/5"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="mt-6 flex gap-2 overflow-x-auto">
        {(
          [
            ["visao", "Visão geral"],
            ["leads", `Leads (${leads.length})`],
            ["questoes", `Questões (${questions.length})`],
            ["pagamentos", "Pagamentos"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "border border-white/10 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "visao" && overview ? (
        <section className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Tentativas" value={String(overview.totalAttempts)} />
            <StatCard
              label="Concluídas"
              value={String(overview.completedAttempts)}
              hint={`${overview.totalAttempts ? Math.round((overview.completedAttempts / overview.totalAttempts) * 100) : 0}% de conclusão`}
            />
            <StatCard
              label="Leads"
              value={String(overview.totalLeads)}
              hint={`${overview.conversionRate}% de conversão`}
            />
            <StatCard label="Média geral" value={`${overview.avgScore}%`} />
          </div>

          <div className="pmma-glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold text-foreground">Últimos 7 dias</h2>
            <div className="mt-4 flex items-end gap-2">
              {overview.last7Days.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">{d.attempts}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary"
                    style={{ height: `${Math.max(6, (d.attempts / maxDay) * 120)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pmma-glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Desempenho por matéria
            </h2>
            <div className="mt-4 space-y-3">
              {overview.disciplines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem respostas registradas.</p>
              ) : (
                overview.disciplines.map((d) => (
                  <div key={d.discipline}>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{d.discipline}</span>
                      <span className="text-muted-foreground">
                        {d.accuracy}% · {d.correct}/{d.answered}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                        style={{ width: `${d.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "leads" ? (
        <section className="mt-6 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, WhatsApp ou e-mail"
              className="h-11 min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={busy}
              className="h-11 rounded-xl border border-white/10 px-5 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              Exportar CSV
            </button>
          </form>

          <div className="pmma-glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{lead.firstName}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {lead.whatsapp}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.email ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.score === null
                          ? "—"
                          : `${lead.correctCount}/${lead.totalQuestions} (${lead.score}%)`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.utmSource ?? lead.source ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "pagamentos" ? (
        <section className="mt-6 space-y-4">
          <div className="pmma-glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Mercado Pago (Pix das doações)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cole o <strong>Access Token de produção</strong> da sua aplicação no Mercado Pago
              (Suas integrações → Credenciais de produção). Ele fica guardado apenas no servidor e
              nunca é exibido de novo.
            </p>
            <p className="mt-3 text-sm">
              Status:{" "}
              <span className={payments?.settings.configured ? "text-emerald-400" : "text-amber-400"}>
                {payments?.settings.configured
                  ? `configurado (${payments.settings.maskedToken}, via ${payments.settings.source})`
                  : "não configurado — o Pix não será gerado"}
              </span>
            </p>
            <form onSubmit={handleSaveToken} className="mt-4 flex flex-wrap gap-2">
              <input
                type="password"
                value={mpToken}
                onChange={(e) => setMpToken(e.target.value)}
                placeholder="APP_USR-..."
                className="h-11 min-w-[240px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy || mpToken.trim().length < 20}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                Salvar credencial
              </button>
            </form>
            {mpMessage ? <p className="mt-2 text-sm text-muted-foreground">{mpMessage}</p> : null}
          </div>

          <div className="pmma-glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sessão</th>
                  <th className="px-4 py-3">Usada</th>
                  <th className="px-4 py-3">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {(payments?.donations.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma doação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  payments?.donations.map((d) => (
                    <tr key={d.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {d.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            d.status === "approved" ? "text-emerald-400" : "text-muted-foreground"
                          }
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.sessionId}…</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.consumed ? "sim" : "não"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(d.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "questoes" ? (
        <section className="mt-6 space-y-3">
          {questions.map((q) => (
            <article key={q.id} className="pmma-glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  {q.discipline}
                </span>
                <span className="text-xs text-muted-foreground">{q.publicCode}</span>
                <span className="text-xs text-muted-foreground">
                  Gabarito: {q.correctAnswer ? "CERTO" : "ERRADO"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Acerto: {q.accuracy === null ? "—" : `${q.accuracy}% (${q.answered})`}
                </span>
                <button
                  onClick={() => handleToggle(q)}
                  disabled={busy}
                  className={`ml-auto h-8 rounded-full px-3 text-xs font-bold transition disabled:opacity-60 ${
                    q.isActive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {q.isActive ? "Ativa" : "Inativa"}
                </button>
              </div>
              <p className="mt-3 text-sm text-foreground/90">{q.statement}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
