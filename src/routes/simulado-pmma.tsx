import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PmmaShell } from "@/components/pmma/PmmaShell";
import { PmmaLeadForm, type LeadFormValues } from "@/components/pmma/PmmaLeadForm";
import { PmmaQuestionCard } from "@/components/pmma/PmmaQuestionCard";
import { PmmaResultView } from "@/components/pmma/PmmaResultView";
import { pmmaStart, pmmaAnswer, pmmaCaptureLead, pmmaFinish, pmmaTrack } from "@/lib/pmma.functions";
import type { PmmaAnswerFeedback, PmmaResult, PmmaStartResult } from "@/lib/pmma.types";

const STORAGE_KEY = "pmma:desafio:v1";
const SEEN_KEY = "pmma:seen:v1";
const SESSION_KEY = "pmma:session:v1";

const TITLE = "Desafio PMMA — Mini Simulado Gratuito | Edital360";
const DESCRIPTION =
  "Teste seus conhecimentos em questões de Certo ou Errado no estilo do concurso de Soldado da PMMA. Correção explicada na hora e diagnóstico personalizado.";

export const Route = createFileRoute("/simulado-pmma")({
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

type Stage = "intro" | "quiz" | "lead" | "milestone" | "bonus_offer" | "bonus" | "result";

type Persisted = {
  attemptId: string;
  index: number;
  leadCaptured: boolean;
  start: PmmaStartResult;
  answered: string[];
  correctCount: number;
  streak: number;
};

const MILESTONES: Record<number, string> = {
  4: "Você concluiu a primeira etapa",
  7: "Metade do desafio concluída",
  10: "Faltam poucas questões",
  12: "Seu diagnóstico está quase pronto",
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
  const capture = useServerFn(pmmaCaptureLead);
  const finish = useServerFn(pmmaFinish);
  const track = useServerFn(pmmaTrack);

  const [sessionId, setSessionId] = useState<string>("");
  const [stage, setStage] = useState<Stage>("intro");
  const [state, setState] = useState<Persisted | null>(null);
  const [feedback, setFeedback] = useState<PmmaAnswerFeedback | null>(null);
  const [result, setResult] = useState<PmmaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [resume, setResume] = useState<Persisted | null>(null);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
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
  }, []);

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
        leadCaptured: false,
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
      setError(err instanceof Error ? err.message : "Não foi possível iniciar agora.");
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
    const captureAt = state.start.campaign.leadCaptureAfterQuestion;

    if (!state.leadCaptured && nextIndex === captureAt) {
      persist({ ...state, index: nextIndex });
      setStage("lead");
      emit("lead_form_view", state.attemptId);
      return;
    }

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
        firstName && nextIndex === 7 ? `${firstName}, você chegou à metade.` : milestone,
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

  async function handleLead(values: LeadFormValues) {
    if (!state) return;
    setLoading(true);
    setLeadError(null);
    emit("lead_form_submit", state.attemptId);
    try {
      await capture({
        data: {
          attemptId: state.attemptId,
          firstName: values.firstName,
          whatsapp: values.whatsapp,
          email: values.email || undefined,
          consent: true,
        },
      });
      setFirstName(values.firstName.trim());
      persist({ ...state, leadCaptured: true });
      setStage("quiz");
      questionStartedAt.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar agora.";
      setLeadError(message);
      emit("lead_form_error", state.attemptId, { message });
    } finally {
      setLoading(false);
    }
  }

  const progress =
    stage === "quiz" || stage === "lead" || stage === "milestone"
      ? { current: state?.index ?? 0, total }
      : null;

  // ---------- RENDER ----------

  if (resume && stage === "intro") {
    return (
      <PmmaShell>
        <Card className="pmma-glass animate-fade-in rounded-2xl p-6">
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

  if (stage === "intro") {
    return (
      <PmmaShell>
        <div className="space-y-5">
          <Badge className="bg-accent text-accent-foreground">MINI SIMULADO GRATUITO</Badge>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            {headlineVariant === "A"
              ? "Você está realmente preparado para as questões da PMMA?"
              : "Descubra agora quais matérias podem fazer você perder pontos na PMMA"}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Responda ao desafio no formato Certo ou Errado, receba uma explicação após cada
            resposta e descubra quais matérias precisam de mais atenção.
          </p>

          <ul className="space-y-2 text-sm">
            <li>• 14 questões por tentativa</li>
            <li>• 7 matérias diferentes</li>
            <li>• Correção explicada na hora</li>
            <li>• Resultado personalizado</li>
            <li>• Acesso público e sem login</li>
          </ul>

          <Card className="animate-fade-in rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Questão 1 de 14</p>
            <p className="mt-2 text-base font-semibold">Certo ou Errado?</p>
            <p className="mt-1 text-sm text-muted-foreground">Responda e veja a explicação</p>
          </Card>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button size="lg" className="h-14 w-full text-base" disabled={loading} onClick={handleStart}>
            {loading ? "PREPARANDO..." : "COMEÇAR O DESAFIO"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Você começa agora. Não é necessário criar conta.
          </p>
        </div>
      </PmmaShell>
    );
  }

  if (stage === "milestone") {
    return (
      <PmmaShell progress={progress}>
        <Card className="pmma-glass animate-fade-in rounded-2xl p-8 text-center">
          <p className="text-lg font-semibold">{milestoneText}</p>
        </Card>
      </PmmaShell>
    );
  }

  if (stage === "lead") {
    return (
      <PmmaShell progress={progress}>
        <PmmaLeadForm onSubmit={handleLead} submitting={loading} serverError={leadError} />
      </PmmaShell>
    );
  }

  if (stage === "bonus_offer" && state) {
    return (
      <PmmaShell>
        <Card className="pmma-glass animate-fade-in rounded-2xl p-6 text-center">
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
            setStage("intro");
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
