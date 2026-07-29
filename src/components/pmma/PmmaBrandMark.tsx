import { Link } from "@tanstack/react-router";

export function PmmaBrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const isSm = size === "sm";
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-3"
      aria-label="Edital360 — ir para a página inicial dos simulados"
    >
      <span className="flex h-9 w-1 flex-col gap-1" aria-hidden="true">
        <span className="flex-1 rounded-full bg-accent" />
        <span className="flex-1 rounded-full bg-primary" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-display font-extrabold tracking-tight text-foreground ${
            isSm ? "text-lg" : "text-xl sm:text-2xl"
          }`}
        >
          Edital<span className="text-accent">360</span>
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
          Concursos Públicos
        </span>
      </span>
    </Link>
  );
}
