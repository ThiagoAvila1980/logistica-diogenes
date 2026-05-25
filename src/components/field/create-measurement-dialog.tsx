"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus } from "lucide-react";
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
    if (!file) return;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Medição</DialogTitle>
          <DialogDescription>
            Preencha os dados manualmente ou anexe o PDF do orçamento — o
            sistema lê o cabeçalho para preenchimento automático de cliente,
            telefone e número de referência.
          </DialogDescription>
        </DialogHeader>

        {(state?.success === false || previewWarning) && (
          <Alert variant={state?.success === false ? "destructive" : "default"}>
            <AlertDescription>
              {state?.success === false ? state.message : previewWarning}
            </AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="space-y-4">
          <MeasurementTypeField
            value={measurementType}
            onChange={setMeasurementType}
            disabled={isPending || parsing}
          />

          <div className="space-y-2">
            <Label htmlFor="meas-pdf">PDF do orçamento (opcional)</Label>
            <Input
              ref={pdfInputRef}
              id="meas-pdf"
              name="pdf"
              type="file"
              accept="application/pdf,.pdf"
              disabled={isPending || parsing}
              className="h-11"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handlePdfChange(file);
              }}
            />
            {parsing && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Lendo cabeçalho do PDF…
              </p>
            )}
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

          <DialogFooter>
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
                  Criando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
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
