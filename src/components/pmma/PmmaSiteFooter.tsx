const SITE = "https://edital360.com";

const LINKS: { label: string; href: string }[] = [
  { label: "Início", href: SITE },
  { label: "Inscrições abertas", href: `${SITE}/inscricoes-abertas` },
  { label: "Notícias", href: `${SITE}/noticias` },
  { label: "Sobre", href: `${SITE}/sobre` },
  { label: "Contato", href: `${SITE}/contato` },
];

export function PmmaSiteFooter() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-center sm:px-8">
      <p className="font-display text-sm font-bold tracking-tight text-foreground">
        Edital<span className="text-accent">360</span>
      </p>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-muted-foreground">
        Editais, cursos e apostilas para concursos públicos. Somos uma equipe de servidores,
        jornalistas e desenvolvedores que transforma o cenário confuso dos editais em informação
        clara, útil e confiável.
      </p>

      <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-medium text-foreground/80 underline-offset-4 transition hover:text-accent hover:underline"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground/80">
        A Edital360 é uma plataforma independente de preparação para concursos e não possui vínculo
        oficial com a PMMA, o Governo do Maranhão ou a banca organizadora.
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        © {new Date().getFullYear()} Edital360 — Todos os direitos reservados.
      </p>
    </div>
  );
}
