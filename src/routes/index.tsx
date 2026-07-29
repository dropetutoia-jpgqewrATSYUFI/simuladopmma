import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PmmaShell } from "@/components/pmma/PmmaShell";
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
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Não foi possível carregar a página agora. Atualize em instantes.
      </Card>
    </PmmaShell>
  ),
  notFoundComponent: () => (
    <PmmaShell>
      <Card className="pmma-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Página não encontrada.
      </Card>
    </PmmaShell>
  ),
  component: HomePage,
});

const inputClass =
  "mt-1 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-foreground outline-none transition focus:border-primary focus:bg-white/10";

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
    <PmmaShell>
      <div className="space-y-8">
        <header className="pmma-rise space-y-4 text-center">
          <Badge className="rounded-full border-0 bg-accent/20 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-accent">
            SIMULADOS PM-MA · ESTILO CEBRASPE
          </Badge>
          <h1 className="text-[30px] font-black leading-[1.1] tracking-tight sm:text-[42px]">
            Sua preparação para a PM-MA começa aqui
          </h1>
          <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Entre na sua conta para acessar o mini simulado gratuito de 40 questões e os simulados
            completos de 120 questões, com correção comentada e diagnóstico por matéria.
          </p>
        </header>

        <div className="pmma-rise pmma-delay-1 grid grid-cols-3 gap-2.5">
          {[
            { value: "Certo/Errado", label: "formato Cebraspe" },
            { value: "8", label: "matérias" },
            { value: "40", label: "questões grátis" },
          ].map((stat) => (
            <div key={stat.label} className="pmma-glass rounded-2xl px-2 py-3 text-center">
              <p className="text-lg font-black text-primary sm:text-2xl">{stat.value}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <Card className="pmma-glass pmma-rise pmma-delay-2 rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            {mode === "signup" ? "Criar conta rápida" : "Entrar na sua conta"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Só nome, e-mail e WhatsApp para liberar seus simulados."
              : "Acesse seu painel e continue treinando para a PM-MA."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <>
                <div>
                  <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Nome completo
                  </label>
                  <input
                    id="fullName"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="whatsapp" className="text-sm font-medium text-foreground">
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
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="pmma-shine h-14 w-full rounded-2xl bg-linear-to-r from-primary to-[#2563eb] text-base font-black tracking-wide shadow-[0_18px_44px_-16px_var(--color-primary)]"
            >
              {loading ? "AGUARDE..." : mode === "signup" ? "CRIAR CONTA E ACESSAR" : "ENTRAR"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
              setMessage(null);
            }}
            className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {mode === "signup" ? "Já tenho conta — entrar" : "Não tenho conta — criar agora"}
          </button>
        </Card>
      </div>
    </PmmaShell>
  );
}
