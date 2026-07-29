import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Lightbulb, Flame } from "lucide-react";
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
  const chosen = feedback ? (feedback.isCorrect ? feedback.correctAnswer : !feedback.correctAnswer) : null;

  function optionClass(value: boolean) {
    if (!feedback) {
      return "border-white/15 bg-white/5 text-foreground hover:border-primary/60 hover:bg-primary/10";
    }
    if (feedback.correctAnswer === value) {
      return "border-[#22c55e]/60 bg-[#22c55e]/15 text-[#4ade80]";
    }
    if (chosen === value) {
      return "border-destructive/60 bg-destructive/15 text-destructive";
    }
    return "border-white/10 bg-white/5 text-muted-foreground";
  }

  return (
    <Card
      key={question.id}
      className="pmma-glass animate-fade-in rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="rounded-full border-0 bg-primary/15 text-primary">
          {question.isBonus ? "Questão bônus" : `Questão ${index} de ${total}`}
        </Badge>
        <Badge variant="outline" className="rounded-full border-white/15 text-muted-foreground">
          {question.discipline}
        </Badge>
        {streak >= 2 && !feedback ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
            <Flame className="size-3.5" aria-hidden />
            {streak} acertos seguidos
          </span>
        ) : null}
      </div>

      {question.topic ? (
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          {question.topic}
        </p>
      ) : null}

      {question.baseText ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Texto-base
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{question.baseText}</p>
        </div>
      ) : null}

      <p className="mt-4 text-base leading-relaxed text-foreground/95 sm:text-lg">
        {question.statement}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`h-14 rounded-xl border text-base font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-100 motion-reduce:transition-none ${optionClass(true)} ${locked ? "" : "active:scale-[0.98]"}`}
          disabled={locked}
          onClick={() => onAnswer(true)}
        >
          CERTO
        </button>
        <button
          type="button"
          className={`h-14 rounded-xl border text-base font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-100 motion-reduce:transition-none ${optionClass(false)} ${locked ? "" : "active:scale-[0.98]"}`}
          disabled={locked}
          onClick={() => onAnswer(false)}
        >
          ERRADO
        </button>
      </div>

      {feedback ? (
        <div
          className={`mt-5 animate-fade-in rounded-2xl border p-4 ${
            feedback.isCorrect
              ? "border-[#22c55e]/40 bg-[#22c55e]/10"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.isCorrect ? (
              <CheckCircle2 className="size-5 text-[#4ade80]" aria-hidden />
            ) : (
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
            )}
            <h3 className={`font-semibold ${feedback.isCorrect ? "text-[#4ade80]" : "text-destructive"}`}>
              {feedback.isCorrect ? "Você acertou!" : "Não foi dessa vez"}
            </h3>
          </div>

          {!feedback.isCorrect ? (
            <p className="mt-2 text-sm font-medium">
              A resposta correta é {feedback.correctAnswer ? "CERTO" : "ERRADO"}
            </p>
          ) : null}

          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{feedback.feedback}</p>

          <div className="mt-3 flex gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold text-accent">Ponto-chave: </span>
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

          <Button
            type="button"
            size="lg"
            className="mt-4 w-full rounded-xl font-semibold shadow-[0_10px_30px_-12px_var(--color-primary)]"
            onClick={onNext}
          >
            ENTENDI, PRÓXIMA QUESTÃO
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
