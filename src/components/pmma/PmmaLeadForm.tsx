import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type LeadFormValues = {
  firstName: string;
  whatsapp: string;
  email: string;
  consent: boolean;
};

export const CONSENT_LABEL =
  "Concordo em receber meu resultado e informações sobre preparação para concursos pela Edital360. Posso cancelar quando quiser.";

export function PmmaLeadForm({
  onSubmit,
  submitting,
  serverError,
}: {
  onSubmit: (values: LeadFormValues) => void;
  submitting: boolean;
  serverError: string | null;
}) {
  const [values, setValues] = useState<LeadFormValues>({
    firstName: "",
    whatsapp: "",
    email: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormValues, string>>>({});

  function validate() {
    const next: Partial<Record<keyof LeadFormValues, string>> = {};
    if (values.firstName.trim().length < 2) next.firstName = "Informe seu primeiro nome.";
    const digits = values.whatsapp.replace(/\D/g, "").replace(/^55/, "");
    if (digits.length !== 10 && digits.length !== 11)
      next.whatsapp = "Informe o WhatsApp com DDD (ex.: 98 91234-5678).";
    else if (Number(digits.slice(0, 2)) < 11) next.whatsapp = "DDD inválido.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = "E-mail inválido.";
    if (!values.consent) next.consent = "É necessário aceitar para continuar.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <Card className="pmma-glass animate-fade-in rounded-2xl p-5 sm:p-6">
      <h2 className="text-xl font-bold">Você já começou seu diagnóstico</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Informe seus dados para salvar suas respostas e liberar a análise personalizada no final.
        Não será criada nenhuma conta.
      </p>

      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (validate()) onSubmit(values);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pmma-name">Primeiro nome</Label>
          <Input
            id="pmma-name"
            autoComplete="given-name"
            value={values.firstName}
            aria-invalid={Boolean(errors.firstName)}
            onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
          />
          {errors.firstName ? (
            <p className="text-xs text-destructive">{errors.firstName}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pmma-whatsapp">WhatsApp</Label>
          <Input
            id="pmma-whatsapp"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(98) 91234-5678"
            value={values.whatsapp}
            aria-invalid={Boolean(errors.whatsapp)}
            onChange={(e) => setValues((v) => ({ ...v, whatsapp: e.target.value }))}
          />
          {errors.whatsapp ? <p className="text-xs text-destructive">{errors.whatsapp}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pmma-email">E-mail (opcional)</Label>
          <Input
            id="pmma-email"
            type="email"
            autoComplete="email"
            value={values.email}
            aria-invalid={Boolean(errors.email)}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <Checkbox
            id="pmma-consent"
            checked={values.consent}
            onCheckedChange={(checked) =>
              setValues((v) => ({ ...v, consent: checked === true }))
            }
          />
          <Label htmlFor="pmma-consent" className="text-xs font-normal leading-relaxed">
            {CONSENT_LABEL}
          </Label>
        </div>
        {errors.consent ? <p className="text-xs text-destructive">{errors.consent}</p> : null}
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "SALVANDO..." : "SALVAR E CONTINUAR"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Sem senha, sem login e sem cobrança.
        </p>
      </form>
    </Card>
  );
}
