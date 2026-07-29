import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminClaimFirstAdmin,
  adminDeleteLeads,
  adminLeads,
  adminLeadsCsv,
  adminOverview,
  adminQuestions,
  adminToggleQuestion,
  adminWhoAmI,
} from "@/lib/admin.functions";
import type { AdminLead, AdminOverview, AdminQuestion } from "@/lib/admin.types";
import { supabase } from "@/integrations/supabase/client";
import { PmmaBrandMark } from "@/components/pmma/PmmaBrandMark";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminPaymentsPanel } from "@/components/admin/AdminPaymentsPanel";
import { AdminAccessPanel } from "@/components/admin/AdminAccessPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel de gerenciamento | Simulado PMMA" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Gestão de usuários, pagamentos, leads e questões do Simulado PMMA da Edital360.",
      },
    ],
  }),
});

type Tab = "visao" | "usuarios" | "acessos" | "pagamentos" | "leads" | "questoes";

const NAV: { key: Tab; label: string; icon: string; hint: string }[] = [
  { key: "visao", label: "Visão geral", icon: "▤", hint: "Métricas" },
  { key: "usuarios", label: "Usuários", icon: "◍", hint: "Contas e acessos" },
  { key: "acessos", label: "Liberar acesso", icon: "🔓", hint: "Simulados pagos" },
  { key: "pagamentos", label: "Pagamentos", icon: "◈", hint: "Pix e liberações" },
  { key: "leads", label: "Leads", icon: "✦", hint: "Captação" },
  { key: "questoes", label: "Questões", icon: "✎", hint: "Banco" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="pmma-rise group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] p-5 transition hover:border-primary/40">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-primary/60 to-accent/60 opacity-60"
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/55">{hint}</p> : null}
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
  const deleteLeads = useServerFn(adminDeleteLeads);
  const loadQuestions = useServerFn(adminQuestions);
  const toggleQuestion = useServerFn(adminToggleQuestion);

  const [status, setStatus] = useState<"loading" | "denied" | "ready">("loading");
  const [tab, setTab] = useState<Tab>("visao");
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);


  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [o, l, q] = await Promise.all([
        loadOverview(),
        loadLeads({ data: { search: "", limit: 200 } }),
        loadQuestions(),
      ]);
      setOverview(o);
      setLeads(l);
      setQuestions(q);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados.");
      setStatus("denied");
    }
  }, [loadLeads, loadOverview, loadQuestions]);

  useEffect(() => {
    let active = true;
    whoAmI()
      .then(async (me) => {
        if (!active) return;
        setCurrentUserId(me.userId);
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

  function toggleLead(id: string) {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAllLeads() {
    setSelectedLeads((prev) => (prev.length === leads.length ? [] : leads.map((l) => l.id)));
  }

  async function handleDeleteLeads() {
    if (selectedLeads.length === 0) return;
    if (!window.confirm(`Apagar ${selectedLeads.length} lead(s)? Esta ação não pode ser desfeita.`))
      return;
    setBusy(true);
    try {
      await deleteLeads({ data: { ids: selectedLeads } });
      setLeads((prev) => prev.filter((l) => !selectedLeads.includes(l.id)));
      setSelectedLeads([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar leads.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setSelectedLeads([]);
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

  const maxDay = useMemo(
    () => Math.max(1, ...(overview?.last7Days.map((d) => d.attempts) ?? [1])),
    [overview],
  );

  if (status === "loading") {
    return (
      <div className="pmma-theme flex min-h-[100dvh] items-center justify-center">
        <p className="text-sm text-white/60">Carregando painel...</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="pmma-theme flex min-h-[100dvh] items-center justify-center px-4">
        <div className="pmma-glass pmma-rise max-w-md rounded-2xl p-8 text-center">
          <h1 className="font-display text-xl font-bold text-white">Acesso restrito</h1>
          <p className="mt-2 text-sm text-white/65">
            {error ?? "Sua conta não tem permissão de administrador."}
          </p>
          <button
            onClick={handleSignOut}
            className="mt-6 h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const activeNav = NAV.find((n) => n.key === tab)!;

  return (
    <div className="pmma-theme min-h-[100dvh] lg:flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[264px] shrink-0 border-r border-white/10 bg-[#0b1220] p-4 transition-transform lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2 py-1">
          <PmmaBrandMark size="sm" />
        </div>
        <p className="mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          Gerenciamento
        </p>
        <nav className="mt-2 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTab(item.key);
                setMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                tab === item.key
                  ? "bg-linear-to-r from-primary/25 to-accent/10 text-white shadow-inner ring-1 ring-primary/30"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-[11px] text-white/40">{item.hint}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <button
            onClick={refresh}
            className="h-10 w-full rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-primary/10"
          >
            Atualizar dados
          </button>
          <button
            onClick={handleSignOut}
            className="h-10 w-full rounded-xl border border-white/10 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      ) : null}

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0b1220]/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setMenuOpen(true)}
            className="h-10 w-10 rounded-xl border border-white/15 text-white lg:hidden"
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-extrabold tracking-tight text-white sm:text-xl">
              {activeNav.label}
            </h1>
            <p className="truncate text-xs text-white/50">Simulados PM-MA 2026 · Edital360</p>
          </div>
          <span className="ml-auto hidden rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent sm:inline-flex">
            Administrador
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          {tab === "visao" && overview ? (
            <section className="space-y-6">
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

              <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                <h2 className="font-display text-lg font-semibold text-white">Últimos 7 dias</h2>
                <div className="mt-4 flex items-end gap-2">
                  {overview.last7Days.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs text-white/55">{d.attempts}</span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary"
                        style={{ height: `${Math.max(6, (d.attempts / maxDay) * 120)}px` }}
                      />
                      <span className="text-[10px] text-white/45">
                        {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                <h2 className="font-display text-lg font-semibold text-white">
                  Desempenho por matéria
                </h2>
                <div className="mt-4 space-y-3">
                  {overview.disciplines.length === 0 ? (
                    <p className="text-sm text-white/55">Ainda sem respostas registradas.</p>
                  ) : (
                    overview.disciplines.map((d) => (
                      <div key={d.discipline}>
                        <div className="flex justify-between text-sm">
                          <span className="text-white">{d.discipline}</span>
                          <span className="text-white/55">
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

          {tab === "usuarios" ? <AdminUsersPanel currentUserId={currentUserId} /> : null}

          {tab === "acessos" ? <AdminAccessPanel /> : null}

          {tab === "pagamentos" ? <AdminPaymentsPanel /> : null}

          {tab === "leads" ? (
            <section className="space-y-4">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, WhatsApp ou e-mail"
                  className="h-11 min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-white/35 focus:border-primary"
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
                  className="h-11 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Exportar CSV
                </button>
              </form>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f172a]">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/55">
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
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          Nenhum lead encontrado.
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-3 font-medium text-white">{lead.firstName}</td>
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
                          <td className="px-4 py-3 text-white/65">{lead.email ?? "—"}</td>
                          <td className="px-4 py-3 text-white/65">
                            {lead.score === null
                              ? "—"
                              : `${lead.correctCount}/${lead.totalQuestions} (${lead.score}%)`}
                          </td>
                          <td className="px-4 py-3 text-white/65">
                            {lead.utmSource ?? lead.source ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-white/65">{formatDate(lead.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "questoes" ? (
            <section className="space-y-3">
              {questions.map((q) => (
                <article key={q.id} className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      {q.discipline}
                    </span>
                    <span className="text-xs text-white/55">{q.publicCode}</span>
                    <span className="text-xs text-white/55">
                      Gabarito: {q.correctAnswer ? "CERTO" : "ERRADO"}
                    </span>
                    <span className="text-xs text-white/55">
                      Acerto: {q.accuracy === null ? "—" : `${q.accuracy}% (${q.answered})`}
                    </span>
                    <button
                      onClick={() => handleToggle(q)}
                      disabled={busy}
                      className={`ml-auto h-8 rounded-full px-3 text-xs font-bold transition disabled:opacity-60 ${
                        q.isActive
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/10 text-white/55"
                      }`}
                    >
                      {q.isActive ? "Ativa" : "Inativa"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-white/90">{q.statement}</p>
                </article>
              ))}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
