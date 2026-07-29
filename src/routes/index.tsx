import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PmmaBrandMark } from "@/components/pmma/PmmaBrandMark";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Simulados PM-MA 2026 | Estilo Cebraspe — Edital360";
const DESCRIPTION =
  "Entre ou crie sua conta para acessar os simulados PM-MA no estilo Cebraspe: mini simulado gratuito de 40 questões e simulados completos de 120 questões.";

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
  errorComponent: () => (
    <FallbackScreen text="Não foi possível carregar a página agora. Atualize em instantes." />
  ),
  notFoundComponent: () => <FallbackScreen text="Página não encontrada." />,
  component: HomePage,
});

function FallbackScreen({ text }: { text: string }) {
  return (
    <div className="pmma-theme flex min-h-[100dvh] items-center justify-center px-4">
      <div className="pmma-glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
        {text}
      </div>
    </div>
  );
}

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#131c2e] px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/40";


const labelClass = "text-sm font-medium text-foreground/90";

const STATS = [
  { value: "40", label: "Questões grátis" },
  { value: "120", label: "Por simulado" },
  { value: "8", label: "Matérias" },
];

function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        if (fullName.trim().length < 3) throw new Error("Informe seu nome completo.");
        const digits = whatsapp.replace(/\D/g, "");
        if (digits.length < 10) throw new Error("Informe um WhatsApp válido com DDD.");

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/painel`,
            data: { full_name: fullName.trim(), whatsapp: digits, phone: digits },
          },
        });
        if (signUpError) throw signUpError;
        const { data } = await supabase.auth.getSession();
        if (data.session) navigate({ to: "/painel", replace: true });
        else setMessage("Conta criada. Verifique seu e-mail para confirmar o acesso.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ to: "/painel", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pmma-theme min-h-[100dvh] w-full">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-5 sm:px-8 sm:py-6 lg:py-10">
        <header className="pmma-rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <PmmaBrandMark />
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:inline">
            Simulados PM-MA
          </span>
        </header>

        <main className="grid flex-1 grid-cols-1 items-center gap-6 py-5 sm:gap-10 sm:py-8 lg:grid-cols-2 lg:gap-14">
          {/* Apresentação */}
          <section className="pmma-rise space-y-4 sm:space-y-5">
            <div className="space-y-3 sm:space-y-4">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase leading-tight tracking-[0.16em] text-accent sm:text-[10px] sm:tracking-[0.2em]">
                Estilo Cebraspe · DE ACORDO COM O EDITAL
              </span>
              <h1 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Sua aprovação na PM-MA começa aqui
              </h1>
              <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground sm:text-base">
                Simulados de alto nível com correção comentada e diagnóstico por matéria. Treine no
                mesmo formato da banca.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t border-white/10 pt-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:px-4 sm:py-2.5"
                >
                  <p className="font-display text-xl font-bold text-accent sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="max-w-[5.5rem] text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground sm:text-[11px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>


          {/* Card de acesso */}
          <section className="pmma-rise pmma-delay-2 relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-linear-to-tr from-primary/25 to-accent/25 opacity-50 blur-2xl"
            />
            <div className="relative rounded-3xl border border-white/10 bg-[#0f172a] p-5 shadow-[0_30px_70px_-40px_rgb(2,6,23)] sm:rounded-[1.75rem] sm:p-9">
              <div className="mb-6 sm:mb-7">
                <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                  {mode === "signup" ? "Criar sua conta" : "Acesse sua conta"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {mode === "signup"
                    ? "Só nome, WhatsApp e e-mail para liberar seus simulados."
                    : "Entre para continuar seus estudos."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

                {mode === "signup" ? (
                  <>
                    <div>
                      <label htmlFor="fullName" className={labelClass}>
                        Nome completo
                      </label>
                      <input
                        id="fullName"
                        required
                        autoComplete="name"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="whatsapp" className={labelClass}>
                        WhatsApp (com DDD)
                      </label>
                      <input
                        id="whatsapp"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(98) 99999-9999"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </>
                ) : null}

                <div>
                  <label htmlFor="email" className={labelClass}>
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="password" className={labelClass}>
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {message ? <p className="text-sm text-success">{message}</p> : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-14 w-full rounded-xl bg-linear-to-r from-accent to-[#d97706] font-display text-sm font-extrabold uppercase tracking-[0.14em] text-accent-foreground shadow-[0_20px_46px_-20px_var(--color-accent)] transition hover:brightness-105 active:scale-[0.99]"
                >
                  {loading
                    ? "Aguarde..."
                    : mode === "signup"
                      ? "Criar conta e acessar"
                      : "Entrar na plataforma"}
                </Button>
              </form>

              <div className="relative py-5 sm:py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0f172a] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {mode === "signup" ? "Já é aluno?" : "Ainda não é aluno?"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setError(null);
                  setMessage(null);
                }}
                className="h-12 w-full rounded-xl border border-primary/30 font-display text-sm font-semibold text-foreground transition hover:bg-primary/10 active:scale-[0.99]"
              >
                {mode === "signup" ? "Entrar com minha conta" : "Criar conta gratuita"}
              </button>

            </div>
          </section>
        </main>

        <footer className="pb-4">
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
            A Edital360 é uma plataforma independente de preparação para concursos e não possui
            vínculo oficial com a PMMA, o Governo do Maranhão ou a banca organizadora.
          </p>
        </footer>
      </div>
    </div>
  );
}
