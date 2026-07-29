import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startQuiz, saveAnswer, finishQuiz, getResult } from "@/lib/quiz.functions";
import { QuizIntro } from "@/components/quiz/QuizIntro";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { QuizLeadForm } from "@/components/quiz/QuizLeadForm";
import { QuizResult } from "@/components/quiz/QuizResult";
import { QuizLoading } from "@/components/quiz/QuizLoading";
import type { QuizMode, ResultSummary } from "@/lib/quiz.types";

export const Route = createFileRoute("/diagnostico-pmma/")({
  component: DiagnosticoPMMA,
  validateSearch: (search: Record<string, unknown>) => ({
    modo: search.modo === "simulado" ? "simulado" : "quiz",
  }),
  head: () => ({
    meta: [
      { title: "Diagnóstico PMMA — Edital360" },
      {
        name: "description",
        content:
          "Teste o seu conhecimento para o concurso da PMMA com o diagnóstico gratuito da Edital360.",
      },
      { property: "og:title", content: "Diagnóstico PMMA — Edital360" },
      {
        property: "og:description",
        content:
          "Teste o seu conhecimento para o concurso da PMMA com o diagnóstico gratuito da Edital360.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function DiagnosticoPMMA() {
  const { modo } = useSearch({ from: "/diagnostico-pmma/" }) as { modo: QuizMode };
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"intro" | "quiz" | "lead" | "result">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [result, setResult] = useState<ResultSummary | null>(null);

  const startQuizFn = useServerFn(startQuiz);
  const saveAnswerFn = useServerFn(saveAnswer);
  const finishQuizFn = useServerFn(finishQuiz);

  const startMutation = useMutation({
    mutationFn: startQuizFn,
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setPublicToken(data.publicToken);
      setPhase("quiz");
    },
  });

  const saveAnswerMutation = useMutation({
    mutationFn: saveAnswerFn,
  });

  const finishMutation = useMutation({
    mutationFn: finishQuizFn,
    onSuccess: (data) => {
      setResult(data);
      setPhase("result");
    },
  });

  const handleStart = () => {
    startMutation.mutate({ mode: modo });
  };

  const handleAnswer = (questionId: string, optionId: string | null) => {
    if (!attemptId) return;
    saveAnswerMutation.mutate({ attemptId, questionId, optionId });
  };

  const handleFinishQuiz = () => {
    if (!attemptId) return;
    setPhase("lead");
  };

  const handleLeadSubmit = (lead: {
    name: string;
    email: string;
    phone: string;
    city: string;
    consentPrivacy: boolean;
    consentMarketing: boolean;
  }) => {
    if (!attemptId) return;
    finishMutation.mutate({ attemptId, lead });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {phase === "intro" && (
          <QuizIntro mode={modo} onStart={handleStart} isLoading={startMutation.isPending} />
        )}
        {phase === "quiz" && attemptId && publicToken && (
          <QuizQuestion
            attemptId={attemptId}
            publicToken={publicToken}
            onAnswer={handleAnswer}
            onFinish={handleFinishQuiz}
            saving={saveAnswerMutation.isPending}
          />
        )}
        {phase === "lead" && (
          <QuizLeadForm onSubmit={handleLeadSubmit} isLoading={finishMutation.isPending} />
        )}
        {phase === "result" && result && publicToken && (
          <QuizResult result={result} publicToken={publicToken} />
        )}
        {(startMutation.isPending || finishMutation.isPending) && (
          <QuizLoading message={startMutation.isPending ? "Preparando o diagnóstico..." : "Calculando resultado..."} />
        )}
      </div>
    </main>
  );
}
