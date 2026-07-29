import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Lock, LogOut, Sparkles, Target, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { PmmaPurchaseGate } from "@/components/pmma/PmmaPurchaseGate";
import { myDashboard } from "@/lib/purchase.functions";
import { pmmaAccessStatus } from "@/lib/donation.functions";

import { supabase } from "@/integrations/supabase/client";
import type { SimuladoCatalogItem } from "@/lib/pmma.types";

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelPage,
  head: () => ({
    meta: [
      { title: "Meu painel | Simulados PM-MA" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Acompanhe seus simulados PM-MA, compras liberadas e histórico de desempenho.",
      },
    ],
  }),
});

type Attempt = {
  id: string;
  status: string;
  percentage: number;
  correct: number;
  total: number;
  createdAt: string;
  campaignName: string;
  campaignSlug: string;
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function firstName(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  tone: "primary" | "accent" | "emerald";
  delay: string;
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary from-primary/70"
      : tone === "accent"
        ? "text-accent from-accent/70"
        : "text-emerald-400 from-emerald-400/70";

  return (
    <Card className={`pmma-glass pmma-rise ${delay} relative overflow-hidden rounded-2xl p-4`}>
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-px bg-linear-to-r to-transparent ${toneClass}`}
      />
      <Icon className={`h-4 w-4 ${toneClass.split(" ")[0]}`} aria-hidden="true" />
      <p className="mt-3 font-display text-2xl font-black leading-none tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </Card>
  );
}

function PainelPage() {
  const navigate = useNavigate();
  const loadDashboard = useServerFn(myDashboard);
  const accessStatus = useServerFn(pmmaAccessStatus);
  const [simulados, setSimulados] = useState<SimuladoCatalogItem[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<SimuladoCatalogItem | null>(null);
  const [name, setName] = useState<string | null>(null);
  /** Simulado gratuito já concluído: só refaz depois de uma doação aprovada. */
  const [freeBlocked, setFreeBlocked] = useState(false);

  const refresh = useCallback(async () => {
    const data = await loadDashboard({ data: undefined });
    setSimulados(data.simulados);
    setAttempts(data.attempts as Attempt[]);
    setLoading(false);

    const sessionId = localStorage.getItem("pmma:session:v1");
    if (sessionId && sessionId.length >= 8) {
      const status = await accessStatus({ data: { sessionId } }).catch(() => null);
      setFreeBlocked(Boolean(status?.blocked));
    }
  }, [accessStatus, loadDashboard]);


  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      setName(
        firstName(
          (meta?.full_name as string) ?? (meta?.name as string) ?? data.user?.email ?? null,
        ),
      );
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const completed = attempts.filter((a) => a.status === "completed");
  const unlockedCount = simulados.filter((s) => !s.isPaid || s.owned).length;
  const best = completed.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0);

  return (
    <PmmaShell>
      <div className="space-y-8">
        <header className="pmma-rise relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-primary/15 via-white/[0.04] to-accent/10 p-6 sm:p-7">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Área do aluno
              </span>
              <h1 className="mt-3 font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                {name ? `Olá, ${name}` : "Bem-vindo de volta"}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Escolha um simulado e continue sua preparação para a PM-MA.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="shrink-0 gap-2 rounded-full border-white/15 bg-white/5 text-xs font-bold"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              SAIR
            </Button>
          </div>
        </header>

        {buying ? (
          <div className="space-y-3">
            <PmmaPurchaseGate
              simulado={buying}
              onUnlocked={() => {
                setBuying(null);
                void refresh();
              }}
            />
            <Button variant="ghost" className="w-full" onClick={() => setBuying(null)}>
              Cancelar
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3">
              <MiniStat
                icon={CheckCircle2}
                label="Liberados"
                value={String(unlockedCount)}
                tone="emerald"
                delay="pmma-delay-1"
              />
              <MiniStat
                icon={Target}
                label="Concluídos"
                value={String(completed.length)}
                tone="primary"
                delay="pmma-delay-2"
              />
              <MiniStat
                icon={TrendingUp}
                label="Melhor nota"
                value={completed.length ? `${Math.round(best)}%` : "—"}
                tone="accent"
                delay="pmma-delay-3"
              />
            </section>

            <section className="space-y-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Simulados disponíveis
              </h2>
              {simulados.map((s, i) => {
                const delayClass = ["pmma-delay-1", "pmma-delay-2", "pmma-delay-3", "pmma-delay-4"][Math.min(i, 3)];
                const donationLocked = !s.isPaid && freeBlocked;
                const unlocked = (!s.isPaid || s.owned) && !donationLocked;
                return (
                  <Card
                    key={s.id}
                    className={`pmma-glass pmma-rise ${delayClass} group relative overflow-hidden rounded-2xl p-5 transition-colors hover:border-white/20`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-1 ${
                        unlocked
                          ? "bg-linear-to-b from-primary to-emerald-400/60"
                          : "bg-linear-to-b from-accent to-accent/30"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-bold leading-snug">{s.name}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {donationLocked
                            ? "Você já concluiu este simulado. Para refazer, apoie o projeto com uma doação de qualquer valor (mínimo R$ 5) — a liberação é imediata após o Pix."
                            : s.description}
                        </p>
                        <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {s.totalQuestions} questões
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          unlocked
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-accent/15 text-accent"
                        }`}
                      >
                        {donationLocked ? "Concluído" : unlocked ? "Liberado" : brl(s.priceCents)}
                      </span>
                    </div>

                    {unlocked ? (
                      <Button
                        asChild
                        size="lg"
                        className="mt-5 h-14 w-full rounded-2xl bg-linear-to-r from-primary to-[#60a5fa] text-base font-black shadow-[0_10px_30px_-12px_var(--color-primary)] transition-transform active:scale-[0.99]"
                      >
                        <Link to="/simulado/$slug" params={{ slug: s.slug }}>
                          INICIAR AGORA
                        </Link>
                      </Button>
                    ) : donationLocked ? (
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="mt-5 h-14 w-full gap-2 rounded-2xl border-accent/40 bg-accent/5 text-base font-bold text-accent hover:bg-accent/10"
                      >
                        <Link to="/simulado/$slug" params={{ slug: s.slug }}>
                          <Lock className="h-4 w-4" aria-hidden="true" />
                          APOIAR E REFAZER
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        className="mt-5 h-14 w-full gap-2 rounded-2xl border-accent/40 bg-accent/5 text-base font-bold text-accent hover:bg-accent/10"
                        onClick={() => setBuying(s)}
                      >
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        DESBLOQUEAR POR {brl(s.priceCents)}
                      </Button>
                    )}
                  </Card>

                );
              })}
            </section>

            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Histórico de desempenho
              </h2>
              {attempts.length === 0 ? (
                <Card className="pmma-glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  Você ainda não concluiu nenhum simulado.
                </Card>
              ) : (
                attempts.map((a) => {
                  const pct = Math.round(a.percentage ?? 0);
                  return (
                    <Card key={a.id} className="pmma-glass rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{a.campaignName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                            {a.status === "completed" ? "concluído" : "em andamento"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-lg font-black leading-none tabular-nums text-primary">
                            {a.correct}/{a.total}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                            {pct}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-[width] duration-700"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </Card>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </PmmaShell>
  );
}
