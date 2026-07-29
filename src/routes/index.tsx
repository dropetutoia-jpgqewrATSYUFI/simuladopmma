import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { listPublicSimulados } from "@/lib/purchase.functions";
import { pmmaCountAttempts } from "@/lib/pmma.functions";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Simulados PM-MA 2026 | Estilo Cebraspe — Edital360";
const DESCRIPTION =
  "Treine para o concurso da PM-MA com simulados Certo ou Errado no estilo Cebraspe: mini simulado gratuito de 40 questões e simulados completos de 120 questões.";

export const Route = createFileRoute("/")({
  loader: async () => ({ simulados: await listPublicSimulados() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Não foi possível carregar os simulados agora. Atualize a página em instantes.
      </Card>
    </PmmaShell>
  ),
  notFoundComponent: () => (
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Página não encontrada.
      </Card>
    </PmmaShell>
  ),
  component: HomePage,
});

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function HomePage() {
  const { simulados } = Route.useLoaderData();
  const countAttempts = useServerFn(pmmaCountAttempts);
  const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void countAttempts({ data: undefined })
      .then(setAttemptsCount)
      .catch(() => setAttemptsCount(null));
    void supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [countAttempts]);

  const free = simulados.filter((s) => !s.isPaid);
  const premium = simulados.filter((s) => s.isPaid);

  return (
    <PmmaShell>
      <div className="space-y-8">
        <header className="pmma-rise space-y-4">
          <Badge className="rounded-full border-0 bg-accent/20 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-accent">
            SIMULADOS PM-MA · ESTILO CEBRASPE
          </Badge>
          <h1 className="text-[30px] font-black leading-[1.1] tracking-tight sm:text-[42px]">
            Treine para a PM-MA com simulados no formato Certo ou Errado
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Comece pelo mini simulado gratuito e evolua para os simulados completos de 120 questões,
            com correção comentada e diagnóstico por matéria.
          </p>
          <div className="flex flex-wrap gap-2">
            {signedIn ? (
              <Button asChild size="lg" variant="outline">
                <Link to="/painel">MEU PAINEL</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    CRIAR CONTA
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link to="/auth" search={{ mode: "signin" }}>
                    ENTRAR
                  </Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="pmma-rise pmma-delay-1 grid grid-cols-3 gap-2.5">
          {[
            { value: String(simulados.length), label: "simulados" },
            { value: "8", label: "matérias" },
            {
              value: attemptsCount == null ? "—" : attemptsCount.toLocaleString("pt-BR"),
              label: "pessoas já fizeram",
            },
          ].map((stat) => (
            <div key={stat.label} className="pmma-glass rounded-2xl px-2 py-3 text-center">
              <p className="text-2xl font-black tabular-nums text-primary sm:text-3xl">{stat.value}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold">Simulado gratuito</h2>
          {free.map((s) => (
            <Card key={s.id} className="pmma-glass pmma-rise rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold leading-snug">{s.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                  Grátis
                </span>
              </div>
              <Button
                asChild
                size="lg"
                className="pmma-shine mt-5 h-14 w-full rounded-2xl bg-linear-to-r from-primary to-[#2563eb] text-base font-black tracking-wide shadow-[0_18px_44px_-16px_var(--color-primary)]"
              >
                <Link to="/simulado/$slug" params={{ slug: s.slug }}>
                  INICIAR AGORA
                </Link>
              </Button>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold">Simulados completos</h2>
          {premium.map((s) => (
            <Card key={s.id} className="pmma-glass pmma-rise rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold leading-snug">{s.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.totalQuestions} questões · liberação imediata via Pix
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-[13px] font-black text-accent">
                  {brl(s.priceCents)}
                </span>
              </div>
              <Button asChild size="lg" variant="outline" className="mt-5 h-14 w-full rounded-2xl text-base font-bold">
                <Link to={signedIn ? "/painel" : "/auth"} search={signedIn ? undefined : { mode: "signup" }}>
                  🔒 DESBLOQUEAR POR {brl(s.priceCents)}
                </Link>
              </Button>
            </Card>
          ))}
        </section>
      </div>
    </PmmaShell>
  );
}
