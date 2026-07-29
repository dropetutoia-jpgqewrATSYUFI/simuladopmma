import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | Simulados PM-MA" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Acesse sua conta para fazer os simulados PM-MA e acompanhar seu desempenho.",
      },
    ],
  }),
});

const inputClass =
  "mt-1 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-foreground outline-none focus:border-primary";

function AuthPage() {
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pmma-glass pmma-rise w-full max-w-md rounded-2xl p-6 sm:p-8">
        <Link to="/" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          ← Voltar aos simulados
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
          {mode === "signup" ? "Criar conta rápida" : "Entrar na sua conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Só nome, e-mail e WhatsApp para acessar seus simulados."
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

          <Button type="submit" size="lg" className="h-14 w-full rounded-2xl" disabled={loading}>
            {loading ? "AGUARDE..." : mode === "signup" ? "CRIAR CONTA" : "ENTRAR"}
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
      </div>
    </main>
  );
}
