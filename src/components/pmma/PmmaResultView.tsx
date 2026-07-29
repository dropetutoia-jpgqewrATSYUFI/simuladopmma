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
  prioridade: { label: "Prioridade", className: "bg-destructive/15 text-destructive" },
  atencao: { label: "Atenção", className: "bg-warning/20 text-warning-foreground" },
  ponto_forte: { label: "Ponto forte", className: "bg-success/15 text-success" },
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
}: {
  result: PmmaResult;
  offerHref: string;
  ctaVariant: "A" | "B";
  onOfferClick: () => void;
  onWhatsappClick: () => void;
  onCorrectionsOpen: () => void;
  onRetake: () => void;
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
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-bold">Seu resultado no Desafio PMMA</h1>
        {result.firstName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {result.firstName}, este é o retrato do seu desempenho neste teste.
          </p>
        ) : null}

        <div className="mt-5 rounded-xl bg-primary p-5 text-primary-foreground">
          <p className="text-lg font-semibold">
            Você acertou {result.correct} de {result.total} questões
          </p>
          <p className="mt-1 text-sm opacity-90">Aproveitamento: {result.percentage}%</p>
          <p className="mt-1 text-sm font-bold tracking-wide">Nível: {result.band.label}</p>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.band.text}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Erros</dt>
            <dd className="font-semibold">{result.wrong}</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Tempo total</dt>
            <dd className="font-semibold">{formatDuration(result.durationSeconds)}</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Média/questão</dt>
            <dd className="font-semibold">{result.averageSecondsPerQuestion}s</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Melhor sequência</dt>
            <dd className="font-semibold">{result.bestStreak}</dd>
          </div>
        </dl>

        {result.bonusAnswered ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Questão bônus: {result.bonusCorrect ? "acertou" : "errou"} (não entra no total).
          </p>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold">Seu mapa de desempenho</h2>
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
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
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

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold">O que este resultado indica</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {result.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      <Card className="p-2 sm:p-3">
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
                <div key={item.publicCode} className="rounded-lg border border-border p-3">
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

      <Card className="border-primary/30 bg-primary/5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Agora transforme seus erros em um plano de estudo</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          O mini simulado mostrou onde você precisa melhorar. No Preparatório Online PMMA da
          Edital360, o conteúdo fica organizado por módulos para você estudar pelo celular ou
          computador, acompanhar seu progresso e praticar ao longo da preparação.
        </p>
        <p className="mt-3 text-sm leading-relaxed">{OFFER_TEXT[result.band.key]}</p>
        {worst ? (
          <p className="mt-2 text-sm leading-relaxed">
            Seu resultado indica que {worst} merece atenção especial. Dentro da plataforma, você
            poderá estudar essa matéria por etapas e acompanhar seu progresso.
          </p>
        ) : null}

        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li>• Plataforma online de estudos</li>
          <li>• Conteúdo organizado por módulos e disciplinas</li>
          <li>• Acesso pelo celular e computador</li>
          <li>• Acompanhamento de progresso</li>
          <li>• Questões e testes interativos</li>
          <li>• Banco de provas e simulados no estilo da banca</li>
        </ul>

        <Button asChild size="lg" className="mt-5 w-full">
          <a href={offerHref} target="_blank" rel="noopener noreferrer" onClick={onOfferClick}>
            {ctaVariant === "A" ? "CONHECER O PREPARATÓRIO PMMA" : "VER COMO ORGANIZAR MEUS ESTUDOS"}
            <ArrowRight className="ml-1 size-4" aria-hidden />
          </a>
        </Button>

        {whatsappHref ? (
          <Button asChild variant="outline" size="lg" className="mt-3 w-full">
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
