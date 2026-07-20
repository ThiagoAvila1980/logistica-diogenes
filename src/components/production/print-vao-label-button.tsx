"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  fetchAndPrintVaoLabel,
  fetchLabelRaw,
} from "@/lib/labels/print-label";
import { cn } from "@/lib/utils";

type Props = {
  osId: string;
  itemId: string;
  vaoNumber: number;
  className?: string;
};

export function PrintVaoLabelButton({
  osId,
  itemId,
  vaoNumber,
  className,
}: Props) {
  const [setupOpen, setSetupOpen] = useState(false);

  const handlePrint = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSetupOpen(true);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("h-8 w-8 shrink-0", className)}
        title={`Imprimir etiqueta — Vão ${vaoNumber}`}
        aria-label={`Imprimir etiqueta do vão ${vaoNumber}`}
        onClick={handlePrint}
      >
        <Tag className="h-4 w-4" />
      </Button>

      <LabelPrinterSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        osId={osId}
        itemId={itemId}
        vaoNumber={vaoNumber}
      />
    </>
  );
}

type SetupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  osId: string;
  itemId: string;
  vaoNumber: number;
};

type Step = "confirm" | "printing" | "done";

function LabelPrinterSetupDialog({
  open,
  onOpenChange,
  osId,
  itemId,
  vaoNumber,
}: SetupProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [step, setStep] = useState<Step>("confirm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setSuccessMsg(null);
    setStatus(null);
    setStep("confirm");
    setPreviewUrl(null);
    setPreviewLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const label = await fetchLabelRaw(osId, itemId, { preview: true });
        if (cancelled) return;
        if (!label.ok) {
          setLocalError(label.message);
          return;
        }
        setPreviewUrl(label.previewDataUrl);
      } catch {
        if (!cancelled) {
          setLocalError("Não foi possível gerar a prévia da etiqueta.");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, osId, itemId]);

  async function confirmAndPrint() {
    setPrinting(true);
    setLocalError(null);
    setSuccessMsg(null);
    setStep("printing");
    setStatus("Na fila — aguardando o PC da impressora...");
    try {
      const result = await fetchAndPrintVaoLabel(osId, itemId, {
        timeoutMs: 60_000,
        pollMs: 1_200,
      });
      if (!result.ok) {
        setStatus(null);
        setLocalError(result.message);
        setStep("confirm");
        return;
      }
      setStatus(null);
      setSuccessMsg(
        `Etiqueta do vão ${vaoNumber} impressa. Verifique o papel na Thermal LABEL.`,
      );
      setStep("done");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="border-b px-5 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Imprimir etiqueta
          </DialogTitle>
          <DialogDescription>
            {step === "printing"
              ? "Aguardando o PC da impressora..."
              : step === "done"
                ? "Resultado do envio."
                : "Confirme a prévia e envie para a impressora da fábrica."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {localError && (
            <Alert variant="destructive">
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}
          {successMsg && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}
          {status && !localError && step === "printing" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status}
            </p>
          )}

          {(step === "confirm" || step === "printing") && (
            <div className="space-y-4 rounded-lg border bg-muted/40 px-4 py-4">
              <div className="overflow-hidden rounded-md border bg-white p-2">
                {previewLoading ? (
                  <div className="flex h-48 items-center gap-2 justify-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando prévia...
                  </div>
                ) : previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL da prévia
                  <img
                    src={previewUrl}
                    alt={`Prévia da etiqueta do vão ${vaoNumber}`}
                    className="mx-auto max-h-72 w-auto max-w-full object-contain"
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Prévia indisponível — você ainda pode imprimir.
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Vão{" "}
                <span className="font-medium text-foreground">{vaoNumber}</span>
                . O pedido vai para o PC com a impressora USB (agente ligado).
              </p>

              {step === "confirm" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={printing}
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={printing || previewLoading}
                    onClick={() => void confirmAndPrint()}
                  >
                    Imprimir agora
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Se nada sair em ~1 minuto, confira se o{" "}
                  <code className="rounded bg-muted px-1">impressao.bat</code>{" "}
                  está aberto no PC da impressora.
                </p>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSuccessMsg(null);
                  setLocalError(null);
                  setStep("confirm");
                }}
              >
                Imprimir outra
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
