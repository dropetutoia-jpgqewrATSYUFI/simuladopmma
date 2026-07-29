import type { ReactNode } from "react";
import { PmmaBrandMark } from "@/components/pmma/PmmaBrandMark";
import { PmmaSiteFooter } from "@/components/pmma/PmmaSiteFooter";
import { PmmaWhatsAppBubble } from "@/components/pmma/PmmaWhatsAppBubble";

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
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <PmmaBrandMark />
          {progress && progress.total > 0 ? (
            <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {Math.min(progress.current + 1, progress.total)}/{progress.total}
            </span>
          ) : (
            <span className="ml-auto shrink-0 truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Desafio PMMA
            </span>
          )}
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

      <footer className="mx-auto w-full max-w-2xl px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]">
        <PmmaSiteFooter />
      </footer>

      <PmmaWhatsAppBubble />
    </div>
  );
}
