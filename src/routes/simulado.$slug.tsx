import { useEffect, useState } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { PmmaQuizRunner } from "@/components/pmma/PmmaQuizRunner";
import { PmmaPurchaseGate } from "@/components/pmma/PmmaPurchaseGate";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listPublicSimulados, mySimuladoAccess } from "@/lib/purchase.functions";

export const Route = createFileRoute("/simulado/$slug")({
  loader: async ({ params }) => {
    const simulados = await listPublicSimulados();
    const simulado = simulados.find((s) => s.slug === params.slug);
    if (!simulado) throw notFound();
    return { simulado };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.simulado.name ?? "Simulado PM-MA";
    const description =
      loaderData?.simulado.description ??
      "Simulado no formato Certo ou Errado para o concurso da PM-MA, com correção comentada.";
    return {
      meta: [
        { title: `${name} | Simulados PM-MA` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${name} | Simulados PM-MA` },
        { property: "og:description", content: description.slice(0, 155) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => (
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Não foi possível carregar este simulado agora. Atualize a página em instantes.
      </Card>
    </PmmaShell>
  ),
  notFoundComponent: () => (
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Simulado não encontrado.
      </Card>
    </PmmaShell>
  ),
  component: SimuladoRunPage,
});

function SimuladoRunPage() {
  const { simulado } = Route.useLoaderData();
  const checkAccess = useServerFn(mySimuladoAccess);
  const [state, setState] = useState<"checking" | "released" | "blocked" | "anon">("checking");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session.session) {
        setState("anon");
        return;
      }
      if (!simulado.isPaid) {
        setState("released");
        return;
      }
      try {
        const access = await checkAccess({ data: { campaignSlug: simulado.slug } });
        if (alive) setState(access.status === "released" ? "released" : "blocked");
      } catch {
        if (alive) setState("blocked");
      }
    })();
    return () => {
      alive = false;
    };
  }, [checkAccess, simulado.isPaid, simulado.slug]);

  if (state === "checking") {
    return (
      <PmmaShell>
        <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Verificando a situação do seu acesso...
        </Card>
      </PmmaShell>
    );
  }

  if (state === "anon") {
    return (
      <PmmaShell>
        <Card className="pmma-glass pmma-rise rounded-2xl p-6 text-center">
          <Badge className="rounded-full border-0 bg-accent/20 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-accent">
            SITUAÇÃO: BLOQUEADO
          </Badge>
          <h1 className="mt-4 font-display text-xl font-bold">{simulado.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este simulado é vinculado à sua conta. Entre ou cadastre-se para ver a situação do seu
            acesso.
          </p>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link to="/">ENTRAR NA MINHA CONTA</Link>
          </Button>
        </Card>
      </PmmaShell>
    );
  }

  if (state === "blocked") {
    return (
      <PmmaShell>
        <PmmaPurchaseGate simulado={simulado} onUnlocked={() => setState("released")} />
      </PmmaShell>
    );
  }

  return (
    <PmmaQuizRunner
      campaignSlug={simulado.slug}
      paid={simulado.isPaid}
      title={simulado.name}
      subtitle="Preparando suas questões..."
    />
  );
}
