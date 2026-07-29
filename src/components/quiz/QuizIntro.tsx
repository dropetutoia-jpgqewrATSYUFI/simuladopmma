import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, FileQuestion, CheckCircle2 } from "lucide-react";
import type { QuizMode } from "@/lib/quiz.types";

interface QuizIntroProps {
  mode: QuizMode;
  onStart: () => void;
  isLoading: boolean;
}

export function QuizIntro({ mode, onStart, isLoading }: QuizIntroProps) {
  const questionCount = mode === "simulado" ? 20 : 10;
  const estimatedMinutes = mode === "simulado" ? 20 : 10;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {mode === "simulado" ? "Mini Simulado PMMA" : "Diagnóstico Rápido PMMA"}
        </CardTitle>
        <CardDescription>
          Teste o seu conhecimento e receba uma análise personalizada do seu desempenho.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-center">
            <FileQuestion className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{questionCount}</p>
            <p className="text-xs text-muted-foreground">questões</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <Clock className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">~{estimatedMinutes}</p>
            <p className="text-xs text-muted-foreground">minutos</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">100%</p>
            <p className="text-xs text-muted-foreground">gratuito</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Regras</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Leia cada questão com atenção antes de marcar.</li>
            <li>Você pode pular e voltar durante o diagnóstico.</li>
            <li>A correção e o gabarito aparecem apenas ao final.</li>
            <li>Preencha seus dados para liberar o resultado completo.</li>
          </ul>
        </div>

        <Button onClick={onStart} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? "Preparando..." : "Iniciar diagnóstico"}
        </Button>
      </CardContent>
    </Card>
  );
}
