"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import {
  createMeasurementFromPdf,
  type CreateMeasurementResult,
} from "@/actions/field-actions";
import { extractPdfHeaderFromFile } from "@/lib/pdf/extract-pdf-text-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { DateInput } from "@/components/ui/date-input";
import { formatBrPhone } from "@/lib/phone-format";
import { Textarea } from "@/components/ui/textarea";
import { MeasurementTypeField } from "@/components/field/measurement-type-field";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { MeasurementPriority } from "@/db/schema";

export function CreateMeasurementDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [budgetReference, setBudgetReference] = useState("");
  const [measurementType, setMeasurementType] = useState<"orcamento" | "final">(
    "orcamento",
  );
  const [specValues, setSpecValues] = useState({
    priority: "normal" as MeasurementPriority,
  });
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const submitCreate = useCallback(
    async (
      _prev: CreateMeasurementResult | null,
      formData: FormData,
    ): Promise<CreateMeasurementResult> => createMeasurementFromPdf(formData),
    [],
  );

  const [state, formAction, isPending] = useActionState<
    CreateMeasurementResult | null,
    FormData
  >(submitCreate, null);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.push(`/field/${state.osId}`);
    }
  }, [state, router]);

  async function handlePdfChange(file: File | null) {
    if (!file) {
      setPdfFileName(null);
      return;
    }

    setPdfFileName(file.name);
    setParsing(true);
    setPreviewWarning(null);

    try {
      const header = await extractPdfHeaderFromFile(file);

      const hasData =
        Boolean(header.clientName) ||
        Boolean(header.clientPhone) ||
        Boolean(header.budgetReference);

      setClientName(header.clientName ?? "");
      setClientPhone(formatBrPhone(header.clientPhone ?? ""));
      setBudgetReference(header.budgetReference ?? "");

      if (!hasData) {
        setPreviewWarning(
          "PDF lido, mas NOME, TELEFONE ou Nº não foram encontrados. Preencha manualmente.",
        );
      }
    } catch {
      setPreviewWarning("Erro ao ler o PDF. Preencha os dados manualmente.");
    } finally {
      setParsing(false);
    }
  }

  function clearPdfSelection() {
    setPdfFileName(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setClientName("");
      setClientPhone("");
      setBudgetReference("");
      setMeasurementType("orcamento");
      setSpecValues({
        priority: "normal",
      });
      setPreviewWarning(null);
      setPdfFileName(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Nova Medição
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6">
          <DialogTitle>Nova Medição</DialogTitle>
          <DialogDescription>
            Preencha os dados ou anexe o PDF — cliente, telefone e referência
            são lidos automaticamente do cabeçalho.
          </DialogDescription>
        </DialogHeader>

        {(state?.success === false || previewWarning) && (
          <Alert
            variant={state?.success === false ? "destructive" : "default"}
            className="mx-6 mt-4 shrink-0"
          >
            <AlertDescription>
              {state?.success === false ? state.message : previewWarning}
            </AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <MeasurementTypeField
              value={measurementType}
              onChange={setMeasurementType}
              disabled={isPending || parsing}
            />

            <div className="space-y-2">
              <Label htmlFor="meas-pdf">PDF do orçamento (opcional)</Label>

              {pdfFileName ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {parsing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pdfFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {parsing
                        ? "Lendo cabeçalho do PDF…"
                        : "Arquivo anexado — toque em trocar para substituir"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5"
                      disabled={isPending || parsing}
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      Trocar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isPending || parsing}
                      onClick={clearPdfSelection}
                      aria-label="Remover PDF"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="meas-pdf"
                  className={cn(
                    "flex min-h-[108px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 transition-colors",
                    (isPending || parsing) && "pointer-events-none opacity-50",
                    !isPending &&
                      !parsing &&
                      "hover:border-primary/50 hover:bg-muted/50 active:scale-[0.99]",
                  )}
                >
                  {parsing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-center text-sm font-medium">
                    {parsing ? "Lendo PDF…" : "Toque para enviar o PDF"}
                  </span>
                  <span className="text-center text-xs text-muted-foreground">
                    Preenche cliente, telefone e referência automaticamente
                  </span>
                </label>
              )}

              <input
                ref={pdfInputRef}
                id="meas-pdf"
                name="pdf"
                type="file"
                accept="application/pdf,.pdf"
                disabled={isPending || parsing}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void handlePdfChange(file);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meas-client-name">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="meas-client-name"
                name="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meas-client-phone">Telefone</Label>
              <PhoneInput
                id="meas-client-phone"
                name="clientPhone"
                value={clientPhone}
                onValueChange={setClientPhone}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meas-budget-ref">Nº do orçamento (referência)</Label>
              <Input
                id="meas-budget-ref"
                name="budgetReference"
                value={budgetReference}
                onChange={(e) => setBudgetReference(e.target.value)}
                placeholder="Ex.: ORC-2026-0042"
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meas-desc">Descrição do serviço</Label>
              <Textarea
                id="meas-desc"
                name="description"
                rows={2}
                placeholder="Ex.: Sacada envidraçada — 4 folhas"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meas-date">Data prevista (opcional)</Label>
              <DateInput
                id="meas-date"
                name="scheduledDate"
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Prioridade</p>
              <MeasurementSpecFields
                values={specValues}
                onChange={setSpecValues}
                disabled={isPending || parsing}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || parsing}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lendo PDF...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Criar medição
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
