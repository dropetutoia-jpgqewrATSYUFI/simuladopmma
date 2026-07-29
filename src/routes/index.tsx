import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ClipboardCheck, Trophy, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Diagnóstico PMMA — Edital360" },
      {
        name: "description",
        content:
          "Descubra o seu nível de preparação para o concurso da PMMA com o diagnóstico gratuito da Edital360.",
      },
      { property: "og:title", content: "Diagnóstico PMMA — Edital360" },
      {
        property: "og:description",
        content:
          "Descubra o seu nível de preparação para o concurso da PMMA com o diagnóstico gratuito da Edital360.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent-foreground">
            <Trophy className="mr-1.5 h-4 w-4" />
            Prepare-se para a PMMA
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Diagnóstico PMMA
            <span className="block text-primary">Edital360</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Descubra em poucos minutos o seu nível de preparação para o concurso da Polícia Militar do Maranhão. Faça o quiz rápido ou o mini simulado e receba uma análise personalizada.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[14rem]">
              <Link to="/diagnostico-pmma">Iniciar diagnóstico</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-w-[14rem]">
              <Link to="/diagnostico-pmma" search={{ modo: "simulado" }}>
                Fazer mini simulado
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Conteúdo demonstrativo — identidade visual provisória.
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <ClipboardCheck className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold text-foreground">1. Responda as questões</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Escolha entre o quiz rápido (10 questões) ou o mini simulado (20 questões) com disciplinas do edital PMMA.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold text-foreground">2. Veja a correção</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Acertos, erros, percentual de aproveitamento e explicação das questões na hora.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold text-foreground">3. Receba a recomendação</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Saiba os próximos passos para melhorar o seu desempenho e se aproximar da aprovação.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold sm:text-3xl">Pronto para testar o seu conhecimento?</h2>
          <p className="mx-auto mt-4 max-w-xl">
            O diagnóstico é gratuito e leva menos de 10 minutos. Ao final, você pode receber o resultado no WhatsApp.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 min-w-[14rem]">
            <Link to="/diagnostico-pmma">Começar agora</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
