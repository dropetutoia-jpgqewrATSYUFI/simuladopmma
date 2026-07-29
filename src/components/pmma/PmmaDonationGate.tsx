import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { donationCheckPix, donationCreatePix } from "@/lib/donation.functions";

const PRESETS = [5, 10, 20, 50];

type Props = {
  sessionId: string;
  onUnlocked: () => void;
};

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PmmaDonationGate({ sessionId, onUnlocked }: Props) {
  const createPix = useServerFn(donationCreatePix);
  const checkPix = useServerFn(donationCheckPix);

  const [amount, setAmount] = useState<string>("5");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{
    id: string;
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
    amount: number;
  } | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  const numericAmount = Number(amount.replace(",", "."));

  useEffect(() => {
    if (!pix || paid) return;
    const tick = async () => {
      try {
        const status = await checkPix({ data: { donationId: pix.id, sessionId } });
        if (status.paid) {
          setPaid(true);
          if (pollRef.current) window.clearInterval(pollRef.current);
          window.setTimeout(onUnlocked, 1400);
        }
      } catch {
        /* keeps polling */
      }
    };
    pollRef.current = window.setInterval(tick, 4000);
    void tick();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [pix, paid, checkPix, sessionId, onUnlocked]);

  async function handleGenerate() {
    setError(null);
    if (!Number.isFinite(numericAmount) || numericAmount < 5) {
      setError("O valor mínimo da doação é R$ 5,00.");
      return;
    }
    setLoading(true);
    try {
      const created = await createPix({
        data: {
          sessionId,
          amount: Math.round(numericAmount * 100) / 100,
          email: email.trim() || undefined,
        },
      });
      setPix({
        id: created.id,
        qrCode: created.qrCode,
        qrCodeBase64: created.qrCodeBase64,
        ticketUrl: created.ticketUrl,
        amount: created.amount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!pix?.qrCode) return;
    await navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (paid) {
    return (
      <Card className="pmma-glass pmma-rise rounded-2xl p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
          ✅
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">Pagamento confirmado!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Muito obrigado por apoiar o conteúdo gratuito. Liberando seu novo simulado...
        </p>
      </Card>
    );
  }

  return (
    <Card className="pmma-glass pmma-rise rounded-2xl p-6">
      <span className="inline-flex rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
        Apoie a causa
      </span>
      <h2 className="mt-3 font-display text-xl font-bold leading-snug sm:text-2xl">
        Você já concluiu o simulado completo
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Nosso conteúdo é <strong className="text-foreground">100% gratuito</strong>, mas temos custos
        com hospedagem, site e domínio. Para refazer as 40 questões, faça uma doação via Pix de
        qualquer valor — a partir de <strong className="text-foreground">R$ 5,00</strong>. A liberação
        é automática assim que o Pix cair.
      </p>

      {!pix ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`h-11 flex-1 min-w-[72px] rounded-xl border text-sm font-bold transition ${
                  Number(amount) === value
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-white/10 bg-white/5 text-foreground hover:bg-white/10"
                }`}
              >
                {brl(value)}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="donation-amount" className="text-sm font-medium">
              Ou digite outro valor (R$)
            </label>
            <input
              id="donation-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              className="mt-1 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-foreground outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="donation-email" className="text-sm font-medium">
              E-mail para o comprovante <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="donation-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-foreground outline-none focus:border-accent"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button size="lg" className="w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? "GERANDO PIX..." : "GERAR PIX E APOIAR"}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Doação de <strong className="text-foreground">{brl(pix.amount)}</strong> — escaneie o QR
            Code ou copie o código abaixo.
          </p>

          {pix.qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code Pix da doação"
              className="mx-auto h-56 w-56 rounded-2xl bg-white p-2"
            />
          ) : null}

          {pix.qrCode ? (
            <>
              <p className="break-all rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {pix.qrCode}
              </p>
              <Button size="lg" className="w-full" onClick={handleCopy}>
                {copied ? "CÓDIGO COPIADO ✓" : "COPIAR CÓDIGO PIX"}
              </Button>
            </>
          ) : null}

          <p className="text-center text-xs text-muted-foreground">
            Aguardando confirmação automática do pagamento...
          </p>

          {pix.ticketUrl ? (
            <a
              href={pix.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-primary underline-offset-4 hover:underline"
            >
              Abrir comprovante no Mercado Pago
            </a>
          ) : null}
        </div>
      )}
    </Card>
  );
}
