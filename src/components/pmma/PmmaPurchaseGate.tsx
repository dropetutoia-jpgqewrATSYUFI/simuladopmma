import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkSimuladoPix, createSimuladoPix } from "@/lib/purchase.functions";
import { PmmaPixApproved, PmmaPixWaiting, usePixPolling } from "./PmmaPixStatus";
import type { SimuladoCatalogItem } from "@/lib/pmma.types";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PmmaPurchaseGate({
  simulado,
  onUnlocked,
}: {
  simulado: SimuladoCatalogItem;
  onUnlocked: () => void;
}) {
  const createPix = useServerFn(createSimuladoPix);
  const checkPix = useServerFn(checkSimuladoPix);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [pix, setPix] = useState<{
    id: string;
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
    amount: number;
  } | null>(null);

  const polling = usePixPolling({
    enabled: Boolean(pix) && !paid,
    check: async () => {
      if (!pix) return false;
      const status = await checkPix({ data: { purchaseId: pix.id } });
      return Boolean(status.paid);
    },
    onApproved: () => {
      setPaid(true);
      window.setTimeout(onUnlocked, 1800);
    },
  });

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const created = await createPix({ data: { campaignSlug: simulado.slug } });
      setPix({
        id: created.id,
        qrCode: created.qrCode,
        qrCodeBase64: created.qrCodeBase64,
        ticketUrl: created.ticketUrl,
        amount: created.amount,
      });
      if (created.paid) {
        setPaid(true);
        window.setTimeout(onUnlocked, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o Pix agora.");
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
      <Card className="pmma-glass rounded-2xl p-6">
        <PmmaPixApproved subtitle="Acesso liberado. Abrindo seu simulado..." />
      </Card>
    );
  }

  return (
    <Card className="pmma-glass rounded-2xl p-6">
      <h3 className="font-display text-lg font-bold">{simulado.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pagamento único de <strong className="text-foreground">{brl(simulado.priceCents)}</strong> via
        Pix. O acesso é liberado automaticamente na hora da confirmação.
      </p>

      {!pix ? (
        <div className="mt-5 space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button size="lg" className="h-14 w-full rounded-2xl" onClick={handleGenerate} disabled={loading}>
            {loading ? "GERANDO PIX..." : `GERAR PIX DE ${brl(simulado.priceCents)}`}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {pix.qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt={`QR Code Pix do ${simulado.name}`}
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
          <PmmaPixWaiting
            checking={polling.checking}
            attempts={polling.attempts}
            elapsed={polling.elapsed}
            notFoundYet={polling.notFoundYet}
            onCheckNow={polling.checkNow}
          />
          {pix.ticketUrl ? (
            <a
              href={pix.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-primary underline-offset-4 hover:underline"
            >
              Abrir cobrança no Mercado Pago
            </a>
          ) : null}
        </div>
      )}
    </Card>
  );
}
