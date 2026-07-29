import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, ArrowRight, RotateCcw } from "lucide-react";
import type { PmmaResult } from "@/lib/pmma.types";

const STATE_LABEL = {
  prioridade: { label: "Prioridade", className: "bg-destructive/20 text-destructive" },
  atencao: { label: "Atenção", className: "bg-accent/20 text-accent" },
  ponto_forte: { label: "Ponto forte", className: "bg-[#22c55e]/20 text-[#4ade80]" },
} as const;

const OFFER_TEXT: Record<string, string> = {
  base_inicial:
    "Você não precisa continuar estudando conteúdos soltos. Comece por uma sequência organizada e construa sua base passo a passo.",
  em_desenvolvimento:
    "Você não precisa continuar estudando conteúdos soltos. Comece por uma sequência organizada e construa sua base passo a passo.",
  caminho_certo:
    "Você já possui parte do conhecimento, mas precisa corrigir lacunas e transformar estudo irregular em evolução constante.",
  bom_desempenho:
    "Você demonstrou boa base. Agora, o objetivo é aumentar a precisão, revisar pontos específicos e continuar treinando.",
  avancado:
    "Você demonstrou boa base. Agora, o objetivo é aumentar a precisão, revisar pontos específicos e continuar treinando.",
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${String(s).padStart(2, "0")}s`;
}

export function PmmaResultView({
  result,
  offerHref,
  ctaVariant,
  onOfferClick,
  onWhatsappClick,
  onCorrectionsOpen,
  onRetake,
  canRetake = true,
  backHref = "/",
}: {
  result: PmmaResult;
  offerHref: string;
  ctaVariant: "A" | "B";
  onOfferClick: () => void;
  onWhatsappClick: () => void;
  onCorrectionsOpen: () => void;
  onRetake: () => void;
  /** Simulado gratuito conclui uma única vez: sem refazer, só voltar ao início. */
  canRetake?: boolean;
  backHref?: string;
}) {

  const [correctionsOpened, setCorrectionsOpened] = useState(false);
  const worst = result.worstDisciplines[0];
  const whatsappHref = result.whatsappNumber
    ? `https://wa.me/${result.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        "Olá! Concluí o Desafio PMMA da Edital360 e quero saber mais sobre o Preparatório Online PMMA.",
      )}`
    : null;

  return (
    <div className="space-y-5">
      <Card className="pmma-glass pmma-rise rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Seu resultado no Desafio PMMA</h1>
        {result.firstName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {result.firstName}, este é o retrato do seu desempenho neste teste.
          </p>
        ) : null}

        <div className="mt-5 rounded-2xl border border-white/10 bg-linear-to-br from-primary to-[#1d4ed8] p-5 text-white shadow-[0_18px_40px_-20px_var(--color-primary)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
            Aproveitamento
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-5xl font-black leading-none tabular-nums">
              {result.percentage}%
            </span>
            <span className="pb-1 text-sm opacity-90">
              {result.correct} de {result.total} questões
            </span>
          </div>
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide">
            Nível: {result.band.label}
          </p>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.band.text}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:text-left">
            <dt className="text-xs text-muted-foreground">Erros</dt>
            <dd className="mt-0.5 text-base font-bold tabular-nums">{result.wrong}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:text-left">
            <dt className="text-xs text-muted-foreground">Tempo total</dt>
            <dd className="mt-0.5 text-base font-bold tabular-nums">{formatDuration(result.durationSeconds)}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:text-left">
            <dt className="text-xs text-muted-foreground">Média/questão</dt>
            <dd className="mt-0.5 text-base font-bold tabular-nums">{result.averageSecondsPerQuestion}s</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:text-left">
            <dt className="text-xs text-muted-foreground">Melhor sequência</dt>
            <dd className="mt-0.5 text-base font-bold tabular-nums">{result.bestStreak}</dd>
          </div>
        </dl>

        {result.bonusAnswered ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Questão bônus: {result.bonusCorrect ? "acertou" : "errou"} (não entra no total).
          </p>
        ) : null}
      </Card>

      <Card className="pmma-glass pmma-rise pmma-delay-1 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold sm:text-xl">Seu mapa de desempenho</h2>
        <ul className="mt-4 space-y-3">
          {result.disciplines.map((d) => {
            const meta = STATE_LABEL[d.state];
            const pct = Math.round((d.correct / d.total) * 100);
            return (
              <li key={d.discipline}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{d.discipline}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {d.correct} de {d.total}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Você teve melhor desempenho em {result.bestDisciplines.join(" e ")}. Sua maior
          oportunidade de evolução está em {result.worstDisciplines.join(" e ")}.
        </p>
      </Card>

      <Card className="pmma-glass pmma-rise pmma-delay-2 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold sm:text-xl">O que este resultado indica</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {result.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      <Card className="pmma-glass pmma-rise pmma-delay-3 rounded-2xl p-2 sm:p-3">
        <Accordion
          type="single"
          collapsible
          onValueChange={(value) => {
            if (value && !correctionsOpened) {
              setCorrectionsOpened(true);
              onCorrectionsOpen();
            }
          }}
        >
          <AccordionItem value="review" className="border-none">
            <AccordionTrigger className="px-3 text-sm font-semibold">
              REVER TODAS AS QUESTÕES
            </AccordionTrigger>
            <AccordionContent className="space-y-4 px-3">
              {result.review.map((item) => (
                <div key={item.publicCode} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.discipline}</Badge>
                    <Badge variant={item.isCorrect ? "secondary" : "destructive"}>
                      {item.isCorrect ? "Acertou" : "Errou"}
                    </Badge>
                    {item.isBonus ? <Badge variant="secondary">Bônus</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{item.statement}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sua resposta: {item.selectedAnswer ? "CERTO" : "ERRADO"} · Gabarito:{" "}
                    {item.correctAnswer ? "CERTO" : "ERRADO"}
                  </p>
                  <p className="mt-2 text-sm">{item.explanation}</p>
                  <p className="mt-2 text-xs">
                    <span className="font-semibold">Ponto-chave: </span>
                    {item.keyPoint}
                  </p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card className="pmma-rise pmma-delay-4 relative overflow-hidden rounded-2xl border border-accent/40 bg-linear-to-br from-primary/25 via-primary/10 to-accent/15 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_60px_-30px_var(--color-accent)]">
        <div className="pointer-events-none pmma-float absolute -right-16 -top-16 size-48 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <span className="inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-bold tracking-wide text-accent">
          PREPARATÓRIO ONLINE PMMA 2026
        </span>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-[28px]">
          Transforme seus erros em aprovação na PMMA
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Você já sabe onde está perdendo pontos. O Preparatório Online PMMA da Edital360 entrega o
          conteúdo do edital organizado por módulos, com questões no estilo da banca e
          acompanhamento do seu progresso — estude pelo celular, no seu ritmo.
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed">{OFFER_TEXT[result.band.key]}</p>
        {worst ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Comece por <span className="font-semibold text-foreground">{worst}</span>: essa foi a
            matéria com o pior desempenho no seu simulado.
          </p>
        ) : null}

        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Todo o conteúdo do edital em módulos",
            "Questões e simulados no estilo da banca",
            "Acesso pelo celular e computador",
            "Acompanhamento de progresso",
            "Correções comentadas",
            "Estude no seu ritmo, quando quiser",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="mt-0.5 text-accent" aria-hidden>
                ✓
              </span>
              <span className="text-foreground/90">{item}</span>
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className="pmma-shine mt-5 h-14 w-full rounded-xl bg-accent text-base font-bold text-accent-foreground shadow-[0_16px_40px_-16px_var(--color-accent)] transition-transform hover:scale-[1.01] hover:bg-accent/90 active:scale-[0.98]">
          <a href={offerHref} target="_blank" rel="noopener noreferrer" onClick={onOfferClick}>
            {ctaVariant === "A" ? "QUERO O PREPARATÓRIO PMMA" : "QUERO ORGANIZAR MEUS ESTUDOS AGORA"}
            <ArrowRight className="ml-1 size-4" aria-hidden />
          </a>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Vagas e condições especiais para quem concluiu o simulado.
        </p>


        {whatsappHref ? (
          <Button asChild variant="outline" size="lg" className="mt-3 w-full rounded-xl border-white/15 bg-white/5">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onWhatsappClick}
            >
              <MessageCircle className="mr-1 size-4" aria-hidden />
              TIRAR UMA DÚVIDA NO WHATSAPP
            </a>
          </Button>
        ) : null}

        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={onRetake}>
          <RotateCcw className="mr-1 size-4" aria-hidden />
          Refazer o desafio
        </Button>
      </Card>
    </div>
  );
}
