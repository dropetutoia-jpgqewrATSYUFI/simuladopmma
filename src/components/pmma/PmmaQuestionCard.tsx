import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import type { PmmaAnswerFeedback, PmmaPublicQuestion } from "@/lib/pmma.types";

export function PmmaQuestionCard({
  question,
  index,
  total,
  feedback,
  streak,
  onAnswer,
  onNext,
  submitting,
}: {
  question: PmmaPublicQuestion;
  index: number;
  total: number;
  feedback: PmmaAnswerFeedback | null;
  streak: number;
  onAnswer: (answer: boolean) => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const locked = feedback !== null || submitting;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {question.isBonus ? "Questão bônus" : `Questão ${index} de ${total}`}
        </Badge>
        <Badge variant="outline">{question.discipline}</Badge>
        {streak >= 2 && !feedback ? (
          <span className="text-xs font-medium text-success">{streak} acertos seguidos</span>
        ) : null}
      </div>

      {question.topic ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
          {question.topic}
        </p>
      ) : null}

      <p className="mt-2 text-base leading-relaxed sm:text-lg">{question.statement}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          type="button"
          size="lg"
          variant={feedback && feedback.correctAnswer ? "default" : "outline"}
          className="h-14 text-base font-semibold"
          disabled={locked}
          onClick={() => onAnswer(true)}
        >
          CERTO
        </Button>
        <Button
          type="button"
          size="lg"
          variant={feedback && !feedback.correctAnswer ? "default" : "outline"}
          className="h-14 text-base font-semibold"
          disabled={locked}
          onClick={() => onAnswer(false)}
        >
          ERRADO
        </Button>
      </div>

      {feedback ? (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            feedback.isCorrect
              ? "border-success/40 bg-success/10"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.isCorrect ? (
              <CheckCircle2 className="size-5 text-success" aria-hidden />
            ) : (
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
            )}
            <h3 className="font-semibold">
              {feedback.isCorrect ? "Você acertou!" : "Não foi dessa vez"}
            </h3>
          </div>

          {!feedback.isCorrect ? (
            <p className="mt-2 text-sm font-medium">
              A resposta correta é {feedback.correctAnswer ? "CERTO" : "ERRADO"}
            </p>
          ) : null}

          <p className="mt-2 text-sm leading-relaxed">{feedback.feedback}</p>

          <div className="mt-3 flex gap-2 rounded-lg bg-info/10 p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Ponto-chave: </span>
              {feedback.keyPoint}
            </p>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {feedback.isCorrect
              ? "Boa! Mantenha a precisão nas próximas."
              : "Agora você já sabe como a banca pode tentar confundir."}
          </p>

          {feedback.nextDiscipline ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Próxima: {feedback.nextDiscipline}
            </p>
          ) : null}

          <Button type="button" size="lg" className="mt-4 w-full" onClick={onNext}>
            ENTENDI, PRÓXIMA QUESTÃO
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
