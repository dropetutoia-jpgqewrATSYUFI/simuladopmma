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

      <div className="mt-5 space-y-1 text-[11px] leading-relaxed text-muted-foreground/80">
        <p className="font-medium text-foreground/90">
          CONNEX TECNOLOGIA E SERVIÇOS DIGITAIS INOVA SIMPLES (I.S.)
        </p>
        <p>CNPJ: 59.102.026/0001-93</p>
        <p>
          <a
            href="mailto:suporte@edital360.com"
            className="underline-offset-2 transition hover:text-accent hover:underline"
          >
            suporte@edital360.com
          </a>
          {" · "}
          <a
            href="https://wa.me/5598991884014"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 transition hover:text-accent hover:underline"
          >
            WhatsApp (98) 99188-4014
          </a>
        </p>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/80">
        A Edital360 é uma plataforma independente de preparação para concursos e não possui vínculo
        oficial com a PMMA, o Governo do Maranhão ou a banca organizadora.
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        © {new Date().getFullYear()} Edital360 — Todos os direitos reservados.
      </p>
    </div>
  );
}
