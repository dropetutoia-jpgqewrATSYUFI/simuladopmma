import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { PmmaPurchaseGate } from "@/components/pmma/PmmaPurchaseGate";
import { myDashboard } from "@/lib/purchase.functions";
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

function PainelPage() {
  const navigate = useNavigate();
  const loadDashboard = useServerFn(myDashboard);
  const [simulados, setSimulados] = useState<SimuladoCatalogItem[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<SimuladoCatalogItem | null>(null);

  const refresh = useCallback(async () => {
    const data = await loadDashboard({ data: undefined });
    setSimulados(data.simulados);
    setAttempts(data.attempts as Attempt[]);
    setLoading(false);
  }, [loadDashboard]);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <PmmaShell>
      <div className="space-y-8">
        <header className="pmma-rise flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="rounded-full border-0 bg-primary/20 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-primary">
              MEU PAINEL
            </Badge>
            <h1 className="mt-3 font-display text-2xl font-black tracking-tight sm:text-3xl">
              Seus simulados PM-MA
            </h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            SAIR
          </Button>
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
          <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Carregando seus dados...
          </Card>
        ) : (
          <>
            <section className="space-y-4">
              {simulados.map((s) => {
                const unlocked = !s.isPaid || s.owned;
                return (
                  <Card key={s.id} className="pmma-glass pmma-rise rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-bold leading-snug">{s.name}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {s.description}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {s.totalQuestions} questões
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          unlocked
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-accent/20 text-accent"
                        }`}
                      >
                        {unlocked ? "Liberado" : brl(s.priceCents)}
                      </span>
                    </div>

                    {unlocked ? (
                      <Button asChild size="lg" className="mt-5 h-14 w-full rounded-2xl text-base font-black">
                        <Link to="/simulado/$slug" params={{ slug: s.slug }}>
                          INICIAR AGORA
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        className="mt-5 h-14 w-full rounded-2xl text-base font-bold"
                        onClick={() => setBuying(s)}
                      >
                        🔒 DESBLOQUEAR POR {brl(s.priceCents)}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold">Histórico</h2>
              {attempts.length === 0 ? (
                <Card className="pmma-glass rounded-2xl p-5 text-sm text-muted-foreground">
                  Você ainda não concluiu nenhum simulado.
                </Card>
              ) : (
                attempts.map((a) => (
                  <Card
                    key={a.id}
                    className="pmma-glass flex items-center justify-between gap-3 rounded-2xl p-4"
                  >
                    <div>
                      <p className="text-sm font-bold">{a.campaignName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                        {a.status === "completed" ? "concluído" : "em andamento"}
                      </p>
                    </div>
                    <p className="text-lg font-black tabular-nums text-primary">
                      {a.correct}/{a.total}
                    </p>
                  </Card>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </PmmaShell>
  );
}
