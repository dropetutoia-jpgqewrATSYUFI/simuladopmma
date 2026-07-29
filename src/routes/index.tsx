import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { PmmaDonationGate } from "@/components/pmma/PmmaDonationGate";
import { PmmaQuestionCard } from "@/components/pmma/PmmaQuestionCard";
import { PmmaResultView } from "@/components/pmma/PmmaResultView";
import {
  pmmaStart,
  pmmaAnswer,
  pmmaFinish,
  pmmaTrack,
  pmmaCountAttempts,
} from "@/lib/pmma.functions";
import { pmmaAccessStatus } from "@/lib/donation.functions";
import type { PmmaAnswerFeedback, PmmaResult, PmmaStartResult } from "@/lib/pmma.types";

const STORAGE_KEY = "pmma:desafio:v1";
const SEEN_KEY = "pmma:seen:v1";
const SESSION_KEY = "pmma:session:v1";

const TITLE = "Desafio PMMA — Mini Simulado Gratuito | Edital360";
const DESCRIPTION =
  "Teste seus conhecimentos em questões de Certo ou Errado no estilo do concurso de Soldado da PMMA. Correção explicada na hora e diagnóstico personalizado.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimuladoPmmaPage,
});

type Stage = "intro" | "quiz" | "donation" | "milestone" | "bonus_offer" | "bonus" | "result";

type Persisted = {
  attemptId: string;
  index: number;
  start: PmmaStartResult;
  answered: string[];
  correctCount: number;
  streak: number;
};

const MILESTONES: Record<number, string> = {
  4: "Você concluiu a primeira etapa",
  8: "Metade do desafio concluída",
  12: "Faltam poucas questões",
  14: "Seu diagnóstico está quase pronto",
};

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function SimuladoPmmaPage() {
  const start = useServerFn(pmmaStart);
  const answer = useServerFn(pmmaAnswer);
  const accessStatus = useServerFn(pmmaAccessStatus);
  const finish = useServerFn(pmmaFinish);
  const track = useServerFn(pmmaTrack);
  const countAttempts = useServerFn(pmmaCountAttempts);

  const [sessionId, setSessionId] = useState<string>("");
  const [stage, setStage] = useState<Stage>("intro");
  const [state, setState] = useState<Persisted | null>(null);
  const [feedback, setFeedback] = useState<PmmaAnswerFeedback | null>(null);
  const [result, setResult] = useState<PmmaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [resume, setResume] = useState<Persisted | null>(null);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
  const questionStartedAt = useRef<number>(Date.now());

  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const emit = useCallback(
    (eventName: string, attemptId?: string | null, data?: Record<string, unknown>) => {
      if (!sessionId) return;
      void track({
        data: {
          sessionId,
          attemptId: attemptId ?? null,
          eventName: eventName as never,
          data,
        },
      }).catch(() => undefined);
    },
    [sessionId, track],
  );

  useEffect(() => {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = randomId();
      localStorage.setItem(SESSION_KEY, sid);
    }
    setSessionId(sid);

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Persisted;
        if (parsed?.attemptId && parsed.start?.questions?.length) setResume(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    void accessStatus({ data: { sessionId: sid } })
      .then((status) => setBlocked(status.blocked))
      .catch(() => setBlocked(false));

    void countAttempts({ data: undefined })
      .then((count) => setAttemptsCount(count))
      .catch(() => setAttemptsCount(null));
  }, [countAttempts, accessStatus]);

  useEffect(() => {
    if (sessionId) emit("quiz_view");
  }, [sessionId, emit]);

  const persist = useCallback((next: Persisted) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const headlineVariant = state?.start.headlineVariant ?? "A";
  const questions = state?.start.questions ?? [];
  const total = questions.length;
  const currentQuestion = stage === "bonus" ? state?.start.bonusQuestion ?? null : questions[state?.index ?? 0] ?? null;

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const started = await start({
        data: {
          sessionId,
          utmSource: params.get("utm_source"),
          utmMedium: params.get("utm_medium"),
          utmCampaign: params.get("utm_campaign"),
          utmContent: params.get("utm_content"),
          partnerCode: params.get("partner") ?? params.get("aff"),
          deviceType: window.innerWidth < 768 ? "mobile" : "desktop",
          referrer: document.referrer || null,
          seenQuestionCodes: readSeen(),
        },
      });
      const next: Persisted = {
        attemptId: started.attemptId,
        index: 0,
        start: started,
        answered: [],
        correctCount: 0,
        streak: 0,
      };
      persist(next);
      setStage("quiz");
      questionStartedAt.current = Date.now();
      emit("question_view", started.attemptId, { order: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível iniciar agora.";
      if (message.includes("DONATION_REQUIRED")) {
        setBlocked(true);
        setStage("donation");
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(value: boolean) {
    if (!state || !currentQuestion) return;
    setLoading(true);
    setError(null);
    try {
      const response = await answer({
        data: {
          attemptId: state.attemptId,
          questionId: currentQuestion.id,
          answer: value,
          responseTimeSeconds: Math.round((Date.now() - questionStartedAt.current) / 1000),
        },
      });
      setFeedback(response);
      const seen = new Set(readSeen());
      seen.add(currentQuestion.publicCode);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));

      if (stage !== "bonus") {
        persist({
          ...state,
          answered: [...state.answered, currentQuestion.id],
          correctCount: state.correctCount + (response.isCorrect ? 1 : 0),
          streak: response.isCorrect ? state.streak + 1 : 0,
        });
      }
      emit("question_answered", state.attemptId, {
        code: currentQuestion.publicCode,
        correct: response.isCorrect,
      });
    } catch {
      setError(
        "Não foi possível salvar agora. Sua resposta ficou guardada neste dispositivo e será enviada quando a conexão voltar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function computeResult(attemptId: string) {
    setLoading(true);
    try {
      const summary = await finish({ data: { attemptId } });
      setResult(summary);
      setStage("result");
      localStorage.removeItem(STORAGE_KEY);
      emit("quiz_complete", attemptId);
      emit("result_view", attemptId, { band: summary.band.key });
      emit("offer_view", attemptId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível calcular o resultado.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!state) return;
    setFeedback(null);

    if (stage === "bonus") {
      void computeResult(state.attemptId);
      return;
    }

    const nextIndex = state.index + 1;

    if (nextIndex >= total) {
      persist({ ...state, index: nextIndex });
      if (state.start.bonusQuestion) {
        setStage("bonus_offer");
      } else {
        void computeResult(state.attemptId);
      }
      return;
    }


    persist({ ...state, index: nextIndex });
    const milestone = MILESTONES[nextIndex];
    if (milestone) {
      setMilestoneText(
        milestone,
      );
      setStage("milestone");
      window.setTimeout(() => {
        setStage("quiz");
        questionStartedAt.current = Date.now();
      }, 1000);
    } else {
      questionStartedAt.current = Date.now();
    }
    emit("next_question_click", state.attemptId, { order: nextIndex + 1 });
  }

  const progress =
    stage === "quiz" || stage === "milestone"
      ? { current: state?.index ?? 0, total }
      : null;

  // ---------- RENDER ----------

  if (resume && stage === "intro") {
    return (
      <PmmaShell>
        <Card className="pmma-glass pmma-rise rounded-2xl p-6">
          <h1 className="text-xl font-bold">Você parou na questão {resume.index + 1}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Deseja continuar de onde parou?</p>
          <div className="mt-5 space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setState(resume);
                setResume(null);
                setStage("quiz");
                questionStartedAt.current = Date.now();
                emit("quiz_resume", resume.attemptId);
              }}
            >
              CONTINUAR DE ONDE PAREI
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setResume(null);
              }}
            >
              RECOMEÇAR
            </Button>
          </div>
        </Card>
      </PmmaShell>
    );
  }

  if (stage === "intro" && !blocked) {
    return (
      <PmmaShell>
        <div className="space-y-6">
          <div className="pmma-rise space-y-4">
            <Badge className="rounded-full border-0 bg-accent/20 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-accent">
              SIMULADO ESTILO CEBRASPE
            </Badge>
            <h1 className="text-[30px] font-black leading-[1.1] tracking-tight sm:text-[42px]">
              {headlineVariant === "A"
                ? "Você está realmente preparado para as questões da PMMA?"
                : "Descubra agora quais matérias podem fazer você perder pontos na PMMA"}
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Responda ao simulado no formato Certo ou Errado, no estilo Cebraspe, receba uma
              explicação após cada resposta e descubra quais matérias precisam de mais atenção.
            </p>
          </div>

          <div className="pmma-rise pmma-delay-1 grid grid-cols-3 gap-2.5">
            {[
              { value: "40", label: "questões" },
              { value: "8", label: "matérias" },
              {
                value:
                  attemptsCount == null
                    ? "—"
                    : attemptsCount.toLocaleString("pt-BR"),
                label: attemptsCount == null ? "pessoas" : "pessoas já fizeram",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="pmma-glass rounded-2xl px-2 py-3 text-center"
              >
                <p className="text-2xl font-black tabular-nums text-primary sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <ul className="pmma-rise pmma-delay-2 grid gap-2 sm:grid-cols-2">
            {[
              "Formato Certo ou Errado, estilo Cebraspe",
              "Correção explicada na hora",
              "Resultado personalizado por matéria",
              "Acesso público e sem login",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] leading-snug text-foreground/90 sm:text-sm"
              >
                <span className="mt-px shrink-0 font-bold text-accent" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          {error ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="pmma-rise pmma-delay-3 space-y-2">
            <Button
              size="lg"
              className="pmma-shine h-16 w-full rounded-2xl bg-linear-to-r from-primary to-[#2563eb] text-base font-black tracking-wide shadow-[0_18px_44px_-16px_var(--color-primary)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
              disabled={loading}
              onClick={handleStart}
            >
              {loading ? "PREPARANDO..." : "COMEÇAR O DESAFIO"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Você começa agora. Não é necessário criar conta.
            </p>
          </div>
        </div>
      </PmmaShell>
    );
  }

  if (stage === "milestone") {
    return (
      <PmmaShell progress={progress}>
        <Card className="pmma-glass pmma-pop rounded-2xl p-8 text-center">
          <p className="text-lg font-bold sm:text-xl">{milestoneText}</p>
        </Card>
      </PmmaShell>
    );
  }

  if (stage === "donation" || (blocked && stage === "intro" && !resume)) {
    return (
      <PmmaShell>
        <PmmaDonationGate
          sessionId={sessionId}
          onUnlocked={() => {
            setBlocked(false);
            setStage("intro");
            void handleStart();
          }}
        />
      </PmmaShell>
    );
  }

  if (stage === "bonus_offer" && state) {
    return (
      <PmmaShell>
        <Card className="pmma-glass pmma-rise rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold">
            Quer responder uma questão bônus antes de ver o resultado?
          </h2>
          <div className="mt-5 space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                emit("bonus_accept", state.attemptId);
                setStage("bonus");
                questionStartedAt.current = Date.now();
              }}
            >
              SIM, QUERO O BÔNUS
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => {
                emit("bonus_skip", state.attemptId);
                void computeResult(state.attemptId);
              }}
            >
              VER MEU RESULTADO
            </Button>
          </div>
        </Card>
      </PmmaShell>
    );
  }

  if (stage === "result" && result && state) {
    const offer = new URL(result.offerUrl);
    offer.searchParams.set("utm_source", "quiz_pmma");
    offer.searchParams.set("utm_medium", "mini_simulado");
    offer.searchParams.set("utm_campaign", "desafio_pmma");
    offer.searchParams.set("utm_content", result.band.key);
    offer.searchParams.set("attempt_id", state.attemptId);
    const partner = params.get("partner") ?? params.get("aff");
    if (partner) offer.searchParams.set("partner", partner);

    return (
      <PmmaShell>
        <PmmaResultView
          result={result}
          offerHref={offer.toString()}
          ctaVariant={state.start.ctaVariant}
          onOfferClick={() => emit("offer_click", state.attemptId)}
          onWhatsappClick={() => emit("whatsapp_click", state.attemptId)}
          onCorrectionsOpen={() => emit("corrections_open", state.attemptId)}
          onRetake={() => {
            emit("retake_click", state.attemptId);
            setResult(null);
            setState(null);
            setBlocked(true);
            setStage("donation");
          }}
        />
      </PmmaShell>
    );
  }

  if ((stage === "quiz" || stage === "bonus") && state && currentQuestion) {
    return (
      <PmmaShell progress={progress}>
        {error ? (
          <p className="mb-3 rounded-lg bg-warning/15 p-3 text-sm text-warning-foreground">{error}</p>
        ) : null}
        <PmmaQuestionCard
          question={currentQuestion}
          index={state.index + 1}
          total={total}
          feedback={feedback}
          streak={state.streak}
          submitting={loading}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      </PmmaShell>
    );
  }

  return (
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        {error ?? "Carregando seu desafio..."}
      </Card>
    </PmmaShell>
  );
}
