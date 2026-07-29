import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface QuizLeadFormProps {
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    city: string;
    consentPrivacy: boolean;
    consentMarketing: boolean;
  }) => void;
  isLoading: boolean;
}

export function QuizLeadForm({ onSubmit, isLoading }: QuizLeadFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 2) newErrors.name = "Informe o nome completo";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Informe um e-mail válido";
    if (!consentPrivacy) newErrors.consentPrivacy = "Você precisa aceitar a política de privacidade";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      consentPrivacy,
      consentMarketing,
    });
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Quase lá!</CardTitle>
        <CardDescription>
          Preencha seus dados para liberar o resultado completo do seu diagnóstico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              disabled={isLoading}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={isLoading}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(98) 99999-9999"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Luís"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consentPrivacy"
                checked={consentPrivacy}
                onCheckedChange={(checked) => setConsentPrivacy(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="consentPrivacy" className="text-sm font-normal leading-tight">
                Li e aceito a política de privacidade e o uso dos meus dados para gerar o resultado do diagnóstico.
              </Label>
            </div>
            {errors.consentPrivacy && <p className="text-xs text-destructive">{errors.consentPrivacy}</p>}

            <div className="flex items-start gap-3">
              <Checkbox
                id="consentMarketing"
                checked={consentMarketing}
                onCheckedChange={(checked) => setConsentMarketing(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="consentMarketing" className="text-sm font-normal leading-tight">
                Aceito receber comunicações da Edital360 sobre cursos, novidades e ofertas.
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading ? "Processando..." : "Ver meu resultado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
