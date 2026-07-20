"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  checkPrintAgentHealth,
  clearPrintAgentUrl,
  getPrintAgentPrinter,
  getPrintAgentToken,
  getPrintAgentUrl,
  hasPrintAgentConfigured,
  listPrintAgentPrinters,
  savePrintAgentPrinter,
  savePrintAgentToken,
  savePrintAgentUrl,
} from "@/lib/labels/network-print";
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

type Step = "setup" | "confirm" | "done";

function LabelPrinterSetupDialog({
  open,
  onOpenChange,
  osId,
  itemId,
  vaoNumber,
}: SetupProps) {
  const [agentUrl, setAgentUrl] = useState("");
  const [token, setToken] = useState("");
  const [printer, setPrinter] = useState("");
  const [printers, setPrinters] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [step, setStep] = useState<Step>("setup");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadPrinters = useCallback(async (url: string) => {
    const list = await listPrintAgentPrinters(url);
    setPrinters(list);
    return list;
  }, []);

  const testAgent = useCallback(
    async (urlOverride?: string) => {
      const url = (urlOverride ?? agentUrl).trim();
      setBusy(true);
      setStatus(null);
      setLocalError(null);
      setSuccessMsg(null);
      try {
        if (!url) {
          setLocalError(
            "Informe a URL do agente (ex.: http://192.168.15.165:9101).",
          );
          setPrinters([]);
          return;
        }
        savePrintAgentUrl(url);
        savePrintAgentToken(token);
        setStatus("Testando conexão com o agente...");
        const health = await checkPrintAgentHealth(url);
        if (!health.ok) {
          setStatus(null);
          setLocalError(health.message);
          setPrinters([]);
          return;
        }
        setStatus(`${health.message} Buscando impressoras...`);
        try {
          const list = await loadPrinters(url);
          if (list.length === 0) {
            setStatus(
              "Agente online, mas nenhuma impressora foi encontrada no Windows.",
            );
          } else {
            setStatus(
              `Agente online. ${list.length} impressora(s) encontrada(s). Toque numa impressora e confirme.`,
            );
            const saved = getPrintAgentPrinter();
            if (saved && list.includes(saved)) {
              setPrinter(saved);
            } else if (list.length === 1) {
              setPrinter(list[0]);
              savePrintAgentPrinter(list[0]);
            }
          }
        } catch (err) {
          setLocalError(
            err instanceof Error
              ? err.message
              : "Não foi possível listar impressoras no PC.",
          );
          setPrinters([]);
        }
      } finally {
        setBusy(false);
      }
    },
    [agentUrl, token, loadPrinters],
  );

  useEffect(() => {
    if (!open) return;
    const url = getPrintAgentUrl();
    setAgentUrl(url);
    setToken(getPrintAgentToken());
    setPrinter(getPrintAgentPrinter());
    setStatus(null);
    setLocalError(null);
    setSuccessMsg(null);
    setPrinters([]);
    setStep("setup");
    if (url) {
      void testAgent(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, [open]);

  async function askConfirm() {
    setLocalError(null);
    setSuccessMsg(null);
    setPreviewUrl(null);
    if (!agentUrl.trim()) {
      setLocalError("Informe a URL do agente.");
      return;
    }
    if (!printer.trim()) {
      setLocalError("Selecione uma impressora na lista antes de imprimir.");
      return;
    }
    savePrintAgentUrl(agentUrl);
    savePrintAgentToken(token);
    savePrintAgentPrinter(printer);
    setStep("confirm");
    setPreviewLoading(true);
    try {
      const label = await fetchLabelRaw(osId, itemId, { preview: true });
      if (!label.ok) {
        setLocalError(label.message);
        return;
      }
      setPreviewUrl(label.previewDataUrl);
    } catch {
      setLocalError("Não foi possível gerar a prévia da etiqueta.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function confirmAndPrint() {
    setPrinting(true);
    setLocalError(null);
    setStatus("Enviando etiqueta para a impressora...");
    try {
      const result = await fetchAndPrintVaoLabel(osId, itemId);
      if (!result.ok) {
        setStatus(null);
        setLocalError(result.message);
        setStep("setup");
        return;
      }
      setStatus(null);
      setSuccessMsg(
        `Etiqueta do vão ${vaoNumber} enviada para "${result.printer ?? printer}". Verifique se a impressora imprimiu.`,
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
            {step === "confirm"
              ? "Confirme os dados antes de enviar à impressora."
              : step === "done"
                ? "Resultado do envio."
                : "PC Windows na rede com a impressora USB e o agente rodando."}
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
          {status && !localError && step !== "done" && (
            <p className="text-sm text-muted-foreground">{status}</p>
          )}

          {step === "confirm" && (
            <div className="space-y-4 rounded-lg border bg-muted/40 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                Confirma a impressão?
              </p>

              <div className="overflow-hidden rounded-md border bg-white p-2">
                {previewLoading ? (
                  <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
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

              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  Vão:{" "}
                  <span className="font-medium text-foreground">
                    {vaoNumber}
                  </span>
                </li>
                <li>
                  Impressora:{" "}
                  <span className="font-medium text-foreground">{printer}</span>
                </li>
                <li>
                  Agente:{" "}
                  <span className="font-medium text-foreground break-all">
                    {agentUrl}
                  </span>
                </li>
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={printing}
                  onClick={() => {
                    setPreviewUrl(null);
                    setStep("setup");
                  }}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={printing || previewLoading}
                  onClick={() => void confirmAndPrint()}
                >
                  {printing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sim, imprimir
                </Button>
              </div>
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
                  setStep("setup");
                }}
              >
                Imprimir outra
              </Button>
            </div>
          )}

          {step === "setup" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="label-agent-url">
                  URL do agente (PC da impressora)
                </label>
                <Input
                  id="label-agent-url"
                  placeholder="http://192.168.15.165:9101"
                  value={agentUrl}
                  onChange={(e) => setAgentUrl(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void testAgent()}
                disabled={busy || !agentUrl.trim()}
                className="w-full"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Buscar impressoras
              </Button>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Impressoras disponíveis</p>
                {busy && printers.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Consultando o PC...
                  </div>
                ) : null}
                {!busy && printers.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                    Nenhuma impressora listada ainda. Preencha a URL e toque em
                    &quot;Buscar impressoras&quot;.
                  </p>
                ) : null}
                {printers.length > 0 ? (
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                    {printers.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          onClick={() => {
                            setPrinter(name);
                            savePrintAgentPrinter(name);
                            setLocalError(null);
                            setSuccessMsg(null);
                          }}
                          className={cn(
                            "flex w-full items-center rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/5",
                            printer === name &&
                              "border-primary/40 bg-primary/5 font-medium",
                          )}
                        >
                          {name}
                          {printer === name ? (
                            <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="label-agent-token"
                >
                  Token (opcional)
                </label>
                <Input
                  id="label-agent-token"
                  type="password"
                  placeholder="só se o agente usar LABEL_PRINT_TOKEN"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <Button
                type="button"
                onClick={askConfirm}
                disabled={printing || busy || !agentUrl.trim() || !printer.trim()}
                className="w-full"
              >
                Continuar para confirmar
              </Button>

              {hasPrintAgentConfigured() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    clearPrintAgentUrl();
                    setAgentUrl("");
                    setPrinters([]);
                    setPrinter("");
                    setStatus(null);
                    setLocalError(null);
                    setSuccessMsg(null);
                  }}
                >
                  Limpar URL salva neste aparelho
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                1) Selecione a impressora na lista → 2) Continuar → 3) Confirme
                com &quot;Sim, imprimir&quot;.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
