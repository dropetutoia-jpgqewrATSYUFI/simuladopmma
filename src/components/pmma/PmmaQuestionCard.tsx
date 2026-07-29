import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Lightbulb, Flame, ArrowRight } from "lucide-react";
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
  const chosen = feedback
    ? feedback.isCorrect
      ? feedback.correctAnswer
      : !feedback.correctAnswer
    : null;

  function optionClass(value: boolean) {
    if (!feedback) {
      return "border-white/15 bg-white/[0.06] text-foreground hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_10px_30px_-18px_var(--color-primary)]";
    }
    if (feedback.correctAnswer === value) {
      return "border-[#22c55e]/60 bg-[#22c55e]/15 text-[#4ade80] shadow-[0_0_0_1px_rgb(34_197_94/25%)]";
    }
    if (chosen === value) {
      return "border-destructive/60 bg-destructive/15 text-destructive";
    }
    return "border-white/10 bg-white/[0.03] text-muted-foreground opacity-70";
  }

  return (
    <Card key={question.id} className="pmma-glass pmma-rise rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="rounded-full border-0 bg-primary/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary">
          {question.isBonus ? "Questão bônus" : `Questão ${index} de ${total}`}
        </Badge>
        <Badge
          variant="outline"
          className="max-w-[60%] truncate rounded-full border-white/15 px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          {question.discipline}
        </Badge>
        {streak >= 2 && !feedback ? (
          <span className="pmma-pop ml-auto inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
            <Flame className="size-3.5" aria-hidden />
            {streak} seguidas
          </span>
        ) : null}
      </div>

      {question.topic ? (
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-accent sm:text-[11px]">
          {question.topic}
        </p>
      ) : null}

      {question.baseText ? (
        <div className="mt-3 rounded-xl border-l-2 border-l-primary/60 border-y border-r border-white/10 bg-white/[0.04] p-3.5 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Texto-base
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/85 sm:text-sm">
            {question.baseText}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-[17px] font-medium leading-[1.55] text-foreground sm:text-lg sm:leading-relaxed">
        {question.statement}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
        <button
          type="button"
          className={`h-14 rounded-xl border text-[15px] font-bold tracking-wide transition-all duration-200 select-none disabled:cursor-not-allowed disabled:opacity-100 motion-reduce:transition-none sm:h-16 sm:text-base ${optionClass(true)} ${locked ? "" : "active:scale-[0.97]"}`}
          disabled={locked}
          onClick={() => onAnswer(true)}
        >
          CERTO
        </button>
        <button
          type="button"
          className={`h-14 rounded-xl border text-[15px] font-bold tracking-wide transition-all duration-200 select-none disabled:cursor-not-allowed disabled:opacity-100 motion-reduce:transition-none sm:h-16 sm:text-base ${optionClass(false)} ${locked ? "" : "active:scale-[0.97]"}`}
          disabled={locked}
          onClick={() => onAnswer(false)}
        >
          ERRADO
        </button>
      </div>

      {submitting && !feedback ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">Corrigindo...</p>
      ) : null}

      {feedback ? (
        <div
          className={`pmma-pop mt-5 rounded-2xl border p-4 ${
            feedback.isCorrect
              ? "border-[#22c55e]/40 bg-[#22c55e]/10"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.isCorrect ? (
              <CheckCircle2 className="size-5 shrink-0 text-[#4ade80]" aria-hidden />
            ) : (
              <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden />
            )}
            <h3
              className={`text-base font-bold ${feedback.isCorrect ? "text-[#4ade80]" : "text-destructive"}`}
            >
              {feedback.isCorrect ? "Você acertou!" : "Não foi dessa vez"}
            </h3>
            {!feedback.isCorrect ? (
              <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
                Gabarito: {feedback.correctAnswer ? "CERTO" : "ERRADO"}
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/90 sm:text-sm">
            {feedback.feedback}
          </p>

          <div className="mt-3 flex gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-[13px] leading-relaxed sm:text-sm">
              <span className="font-semibold text-accent">Ponto-chave: </span>
              {feedback.keyPoint}
            </p>
          </div>

          {feedback.nextDiscipline ? (
            <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Próxima: {feedback.nextDiscipline}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="mt-4 h-14 w-full rounded-xl bg-linear-to-r from-primary to-[#2563eb] text-[15px] font-bold shadow-[0_14px_34px_-16px_var(--color-primary)] transition-transform active:scale-[0.98]"
            onClick={onNext}
          >
            PRÓXIMA QUESTÃO
            <ArrowRight className="ml-1 size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
