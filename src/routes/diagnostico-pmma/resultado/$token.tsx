import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getResult } from "@/lib/quiz.functions";
import { QuizResult } from "@/components/quiz/QuizResult";
import { QuizLoading } from "@/components/quiz/QuizLoading";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/diagnostico-pmma/resultado/$token")({
  component: ResultadoPage,
  head: () => ({
    meta: [
      { title: "Resultado do Diagnóstico PMMA — Edital360" },
      {
        name: "description",
        content: "Veja o resultado do diagnóstico PMMA da Edital360.",
      },
      { property: "og:title", content: "Resultado do Diagnóstico PMMA — Edital360" },
      {
        property: "og:description",
        content: "Veja o resultado do diagnóstico PMMA da Edital360.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ResultadoPage() {
  const { token } = useParams({ from: "/diagnostico-pmma/resultado/$token" });
  const getResultFn = useServerFn(getResult);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-result", token],
    queryFn: () => getResultFn({ data: { publicToken: token } }),
    staleTime: Infinity,
  });

  if (isLoading) {
    return <QuizLoading message="Carregando resultado..." />;
  }

  if (error || !data || data.status !== "finished" || !data.result) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <Card className="mx-auto max-w-xl text-center">
          <CardContent className="py-12">
            <h1 className="text-xl font-semibold text-foreground">Resultado não encontrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esse link pode estar expirado ou o diagnóstico ainda não foi finalizado.
            </p>
            <Button asChild className="mt-6">
              <Link to="/diagnostico-pmma">Fazer o diagnóstico</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <QuizResult result={data.result} publicToken={token} />
    </main>
  );
}
