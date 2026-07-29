import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { getResult } from "@/lib/quiz.functions";
import { QuizLoading } from "./QuizLoading";

interface QuizQuestionProps {
  attemptId: string;
  publicToken: string;
  onAnswer: (questionId: string, optionId: string | null) => void;
  onFinish: () => void;
  saving: boolean;
}

export function QuizQuestion({
  attemptId,
  publicToken,
  onAnswer,
  onFinish,
  saving,
}: QuizQuestionProps) {
  const getResultFn = useServerFn(getResult);
  const { data, isLoading } = useQuery({
    queryKey: ["quiz-questions", attemptId],
    queryFn: async () => {
      // Busca as questões e respostas já salvas para montar o estado
      const res = await getResultFn({ data: { publicToken } });
      return res;
    },
    staleTime: Infinity,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});

  if (isLoading || !data) {
    return <QuizLoading message="Carregando questões..." />;
  }

  // O getResult não retorna questões. Precisamos buscar as questões de outra forma.
  // Por simplicidade, vamos buscar as questões via server function separada.
  // TODO: implementar getQuestions server function
  return (
    <Card>
      <CardHeader>
        <CardTitle>Questão {currentIndex + 1}</CardTitle>
        <CardDescription>Implementação em andamento — buscar questões da tentativa.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Token: {publicToken}
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}>
          Anterior
        </Button>
        <Button onClick={onFinish} disabled={saving}>
          Finalizar
        </Button>
      </CardFooter>
    </Card>
  );
}
