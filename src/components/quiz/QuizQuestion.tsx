import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getQuestions, saveAnswer } from "@/lib/quiz.functions";
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
  const getQuestionsFn = useServerFn(getQuestions);
  const saveAnswerFn = useServerFn(saveAnswer);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-questions", attemptId],
    queryFn: () => getQuestionsFn({ data: { attemptId } }),
    staleTime: Infinity,
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  if (isLoading || !data) {
    return <QuizLoading message="Carregando questões..." />;
  }

  const { questions, answers } = data;
  const total = questions.length;
  const currentQuestion = questions[currentIndex];

  const selectedAnswer = answers.find((a) => a.question_id === currentQuestion.id);
  const selectedOptionId = selectedAnswer?.option_id ?? undefined;

  const handleSelect = async (optionId: string) => {
    onAnswer(currentQuestion.id, optionId);
  };

  const handleClear = async () => {
    await saveAnswerFn({ data: { attemptId, questionId: currentQuestion.id, optionId: null } });
    onAnswer(currentQuestion.id, null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Questão {currentIndex + 1} <span className="text-muted-foreground">/ {total}</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {Math.round(((currentIndex + 1) / total) * 100)}%
          </span>
        </div>
        <CardDescription>
          {currentQuestion.discipline} • {currentQuestion.difficulty}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-base leading-relaxed text-foreground">
          {currentQuestion.statement}
        </div>

        <RadioGroup
          value={selectedOptionId}
          onValueChange={handleSelect}
          className="space-y-3"
          disabled={saving}
        >
          {currentQuestion.options.map((option) => (
            <div
              key={option.id}
              className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm font-normal">
                {option.label}. {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {selectedOptionId && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Limpar resposta
          </button>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0 || saving}
        >
          Anterior
        </Button>
        {currentIndex < total - 1 ? (
          <Button
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            disabled={saving}
          >
            Próxima
          </Button>
        ) : (
          <Button onClick={onFinish} disabled={saving}>
            Finalizar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
