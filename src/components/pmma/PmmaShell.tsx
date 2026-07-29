import type { ReactNode } from "react";

export function PmmaShell({
  progress,
  children,
}: {
  progress?: { current: number; total: number } | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold tracking-tight text-foreground">EDITAL</span>
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-lg font-extrabold leading-none text-primary-foreground">
              360
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Desafio PMMA</span>
        </div>
        {progress && progress.total > 0 ? (
          <div
            className="h-1.5 w-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
            aria-label="Progresso do desafio"
          >
            <div
              className="h-full bg-primary transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
            />
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">{children}</main>

      <footer className="mx-auto w-full max-w-2xl px-4 pb-10">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          A Edital360 é uma plataforma independente de preparação para concursos e não possui
          vínculo oficial com a PMMA, o Governo do Maranhão ou a banca organizadora.
        </p>
      </footer>
    </div>
  );
}
