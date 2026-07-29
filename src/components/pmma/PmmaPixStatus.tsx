import { useCallback, useEffect, useRef, useState } from "react";

/** Consulta o pagamento em intervalos curtos até ser aprovado. */
export function usePixPolling({
  enabled,
  check,
  onApproved,
  intervalMs = 3000,
}: {
  enabled: boolean;
  check: () => Promise<boolean>;
  onApproved: () => void;
  intervalMs?: number;
}) {
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [approved, setApproved] = useState(false);

  const checkRef = useRef(check);
  checkRef.current = check;
  const approvedRef = useRef(onApproved);
  approvedRef.current = onApproved;
  const busyRef = useRef(false);
  const doneRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (busyRef.current || doneRef.current) return;
    busyRef.current = true;
    setChecking(true);
    try {
      const ok = await checkRef.current();
      setAttempts((n) => n + 1);
      if (ok) {
        doneRef.current = true;
        setApproved(true);
        approvedRef.current();
      }
    } catch {
      setAttempts((n) => n + 1);
    } finally {
      busyRef.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    doneRef.current = false;
    void runCheck();
    const poll = window.setInterval(() => void runCheck(), intervalMs);
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, runCheck]);

  useEffect(() => {
    if (approved) doneRef.current = true;
  }, [approved]);

  return { checking, attempts, elapsed, approved, checkNow: runCheck };
}

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Painel animado "aguardando pagamento" exibido enquanto o Pix é consultado. */
export function PmmaPixWaiting({
  checking,
  attempts,
  elapsed,
  onCheckNow,
}: {
  checking: boolean;
  attempts: number;
  elapsed: number;
  onCheckNow: () => void;
}) {
  return (
    <div className="pmma-rise rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span className="pmma-radar absolute inset-0 rounded-full border border-accent/50" />
          <span className="pmma-radar pmma-delay-3 absolute inset-0 rounded-full border border-accent/40" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-base">
            <span className="pmma-spin block h-4 w-4 rounded-full border-2 border-accent/30 border-t-accent" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            {checking ? "Consultando pagamento..." : "Aguardando pagamento Pix"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A confirmação é automática. Pode manter esta tela aberta — assim que o Pix cair, o acesso
            é liberado na hora.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
            <span className="tabular-nums">⏱ {mmss(elapsed)}</span>
            <span>·</span>
            <span className="tabular-nums">{attempts} consulta(s)</span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <span className="pmma-progress-indeterminate block h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-accent to-primary" />
      </div>

      <button
        type="button"
        onClick={onCheckNow}
        disabled={checking}
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-foreground transition hover:bg-white/10 disabled:opacity-60"
      >
        {checking ? "VERIFICANDO..." : "JÁ PAGUEI — VERIFICAR AGORA"}
      </button>
    </div>
  );
}

/** Estado final: pagamento aprovado e acesso liberado. */
export function PmmaPixApproved({
  title = "Pagamento aprovado!",
  subtitle = "Acesso liberado. Redirecionando...",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="pmma-pop py-4 text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <span className="pmma-radar absolute inset-0 rounded-full border border-emerald-400/50" />
        <span className="pmma-radar pmma-delay-3 absolute inset-0 rounded-full border border-emerald-400/40" />
        <div className="pmma-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
            <path
              d="M8 16.5l5.5 5.5L24 11"
              fill="none"
              stroke="rgb(52 211 153)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pmma-check"
            />
          </svg>
        </div>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <span className="pmma-progress-fill block h-full rounded-full bg-emerald-400" />
      </div>
    </div>
  );
}
