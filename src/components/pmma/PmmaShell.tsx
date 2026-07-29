import type { ReactNode } from "react";

export function PmmaShell({
  progress,
  children,
}: {
  progress?: { current: number; total: number } | null;
  children: ReactNode;
}) {
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div className="pmma-theme min-h-[100dvh]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-4 py-3 sm:gap-3">
          <div className="flex shrink-0 items-baseline gap-1">
            <span className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
              EDITAL
            </span>
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-base font-extrabold leading-none text-primary-foreground shadow-[0_0_20px_-4px_var(--color-primary)] sm:text-lg">
              360
            </span>
          </div>
          <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
            Desafio PMMA
          </span>
          {progress && progress.total > 0 ? (
            <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {Math.min(progress.current + 1, progress.total)}/{progress.total}
            </span>
          ) : null}
        </div>
        {progress && progress.total > 0 ? (
          <div
            className="h-1.5 w-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
            aria-label="Progresso do desafio"
          >
            <div
              className="h-full rounded-r-full bg-linear-to-r from-primary via-[#60a5fa] to-accent shadow-[0_0_14px_-2px_var(--color-primary)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-5 pb-[max(4rem,env(safe-area-inset-bottom))] sm:pt-8">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-2xl px-4 pb-10">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
          A Edital360 é uma plataforma independente de preparação para concursos e não possui
          vínculo oficial com a PMMA, o Governo do Maranhão ou a banca organizadora.
        </p>
      </footer>
    </div>
  );
}
