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
  return (
    <PmmaQuizRunner
      campaignSlug={simulado.slug}
      paid={simulado.isPaid}
      title={simulado.name}
      subtitle="Preparando suas questões..."
    />
  );
}
