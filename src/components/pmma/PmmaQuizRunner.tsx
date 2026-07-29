import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { PmmaDonationGate } from "@/components/pmma/PmmaDonationGate";
import { PmmaQuestionCard } from "@/components/pmma/PmmaQuestionCard";
import { PmmaResultView } from "@/components/pmma/PmmaResultView";
import {
  pmmaStart,
  pmmaStartOwned,
  pmmaAnswer,
  pmmaFinish,
  pmmaTrack,
} from "@/lib/pmma.functions";
import type { PmmaAnswerFeedback, PmmaResult, PmmaStartResult } from "@/lib/pmma.types";

const SEEN_KEY = "pmma:seen:v1";
const SESSION_KEY = "pmma:session:v1";

type Stage = "intro" | "quiz" | "donation" | "milestone" | "result";

type Persisted = {
  attemptId: string;
  index: number;
  start: PmmaStartResult;
  answered: string[];
  correctCount: number;
  streak: number;
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

export function PmmaQuizRunner({
  campaignSlug,
  paid,
  title,
  subtitle,
}: {
  campaignSlug: string;
  paid: boolean;
  title: string;
  subtitle: string;
}) {
  const storageKey = `pmma:run:${campaignSlug}`;
  const startFree = useServerFn(pmmaStart);
  const startOwned = useServerFn(pmmaStartOwned);
  const answer = useServerFn(pmmaAnswer);
  const finish = useServerFn(pmmaFinish);
  const track = useServerFn(pmmaTrack);

  const [sessionId, setSessionId] = useState<string>("");
  const [stage, setStage] = useState<Stage>("intro");
  const [state, setState] = useState<Persisted | null>(null);
  const [feedback, setFeedback] = useState<PmmaAnswerFeedback | null>(null);
  const [result, setResult] = useState<PmmaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [resume, setResume] = useState<Persisted | null>(null);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const questionStartedAt = useRef<number>(Date.now());
  const autoStarted = useRef(false);

  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const emit = useCallback(
    (eventName: string, attemptId?: string | null, data?: Record<string, unknown>) => {
      if (!sessionId) return;
      void track({
        data: { sessionId, attemptId: attemptId ?? null, eventName: eventName as never, data },
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

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Persisted;
        if (parsed?.attemptId && parsed.start?.questions?.length) setResume(parsed);
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Persisted) => {
      setState(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const questions = state?.start.questions ?? [];
  const total = questions.length;
  const currentQuestion = questions[state?.index ?? 0] ?? null;

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        sessionId: sessionId || randomId(),
        campaignSlug,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        utmContent: params.get("utm_content"),
        partnerCode: params.get("partner") ?? params.get("aff"),
        deviceType: (window.innerWidth < 768 ? "mobile" : "desktop") as "mobile" | "desktop",
        referrer: document.referrer || null,
        seenQuestionCodes: paid ? [] : readSeen(),
      };
      // Usuários logados (inclusive admins) iniciam pela via autenticada.
      const { data: session } = await supabase.auth.getSession();
      const useOwned = paid || Boolean(session.session);
      const started = useOwned ? await startOwned({ data: payload }) : await startFree({ data: payload });

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
        setStage("donation");
      } else if (message.includes("PURCHASE_REQUIRED") || message.includes("LOGIN_REQUIRED")) {
        setLocked(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignSlug, emit, paid, params, persist, sessionId, startFree, startOwned]);

  // Simulado começa direto: o convite de início acontece na página anterior.
  useEffect(() => {
    if (!sessionId || autoStarted.current || resume || stage !== "intro") return;
    autoStarted.current = true;
    void handleStart();
  }, [sessionId, resume, stage, handleStart]);

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
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-400)));

      persist({
        ...state,
        answered: [...state.answered, currentQuestion.id],
        correctCount: state.correctCount + (response.isCorrect ? 1 : 0),
        streak: response.isCorrect ? state.streak + 1 : 0,
      });
      emit("question_answered", state.attemptId, {
        code: currentQuestion.publicCode,
        correct: response.isCorrect,
      });
    } catch {
      setError("Não foi possível salvar agora. Tente novamente em instantes.");
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
      localStorage.removeItem(storageKey);
      emit("quiz_complete", attemptId);
      emit("result_view", attemptId, { band: summary.band.key });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível calcular o resultado.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!state) return;
    setFeedback(null);
    const nextIndex = state.index + 1;

    if (nextIndex >= total) {
      persist({ ...state, index: nextIndex });
      void computeResult(state.attemptId);
      return;
    }

    persist({ ...state, index: nextIndex });
    const quarter = Math.floor(total / 4);
    if (quarter > 0 && nextIndex % quarter === 0 && nextIndex < total) {
      setMilestoneText(`${Math.round((nextIndex / total) * 100)}% concluído. Continue!`);
      setStage("milestone");
      window.setTimeout(() => {
        setStage("quiz");
        questionStartedAt.current = Date.now();
      }, 900);
    } else {
      questionStartedAt.current = Date.now();
    }
    emit("next_question_click", state.attemptId, { order: nextIndex + 1 });
  }

  const progress = stage === "quiz" || stage === "milestone" ? { current: state?.index ?? 0, total } : null;

  if (locked) {
    return (
      <PmmaShell>
        <Card className="pmma-glass pmma-rise rounded-2xl p-6 text-center">
          <Badge className="rounded-full border-0 bg-accent/20 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-accent">
            ACESSO BLOQUEADO
          </Badge>
          <h1 className="mt-4 font-display text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este simulado é liberado após a compra. O desbloqueio é imediato assim que o Pix é
            confirmado.
          </p>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link to="/painel">IR PARA MEU PAINEL</Link>
          </Button>
        </Card>
      </PmmaShell>
    );
  }

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
                localStorage.removeItem(storageKey);
                setResume(null);
                autoStarted.current = true;
                void handleStart();
              }}
            >
              RECOMEÇAR
            </Button>
          </div>
        </Card>
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

  if (stage === "donation") {
    return (
      <PmmaShell>
        <PmmaDonationGate
          sessionId={sessionId}
          onUnlocked={() => {
            setStage("intro");
            void handleStart();
          }}
        />
      </PmmaShell>
    );
  }

  if (stage === "result" && result && state) {
    const offer = new URL(result.offerUrl);
    offer.searchParams.set("utm_source", "quiz_pmma");
    offer.searchParams.set("utm_medium", campaignSlug);
    offer.searchParams.set("utm_campaign", "simulados_pmma");
    offer.searchParams.set("utm_content", result.band.key);
    offer.searchParams.set("attempt_id", state.attemptId);

    return (
      <PmmaShell>
        <PmmaResultView
          result={result}
          offerHref={offer.toString()}
          ctaVariant={state.start.ctaVariant}
          onOfferClick={() => emit("offer_click", state.attemptId)}
          onWhatsappClick={() => emit("whatsapp_click", state.attemptId)}
          onCorrectionsOpen={() => emit("corrections_open", state.attemptId)}
          canRetake={paid}
          backHref={isAuthed ? "/painel" : "/"}
          onRetake={() => {
            emit("retake_click", state.attemptId);
            setResult(null);
            setState(null);
            autoStarted.current = false;
            setStage("intro");
          }}

        />
      </PmmaShell>
    );
  }

  if (stage === "quiz" && state && currentQuestion) {
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
      <Card className="pmma-glass rounded-2xl p-8 text-center">
        <h1 className="font-display text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? subtitle}</p>
        {error ? (
          <Button size="lg" className="mt-5 w-full" onClick={() => void handleStart()}>
            TENTAR NOVAMENTE
          </Button>
        ) : null}
      </Card>
    </PmmaShell>
  );
}
