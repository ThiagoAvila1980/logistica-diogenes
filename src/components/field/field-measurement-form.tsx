"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Ruler,
} from "lucide-react";
import {
  saveFieldMeasurement,
  type SaveFieldMeasurementResult,
} from "@/actions/field-actions";
import {
  MeasurementItemCard,
  createEmptyMeasurementItem,
} from "@/components/field/measurement-item-card";
import {
  MeasurementItemView,
  hasSavedMeasurementForView,
} from "@/components/field/measurement-item-view";
import { MeasurementTypeField } from "@/components/field/measurement-type-field";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusWizard } from "@/components/workflow/status-wizard";
import type { OrderDetail } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { FieldMeasurementDraft } from "@/lib/data/field";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  FINAL_MEASUREMENT_TYPE,
  getAllowedMeasurementActions,
  getMeasurementBadgeLabel,
  getMeasurementConfirmCopy,
  getMeasurementDimensionsHint,
  measurementTypeFromOsStatus,
  osStatusFromMeasurementType,
  type MeasurementDbType,
} from "@/lib/workflow/measurement-actions";
import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";

type DraftSnapshot = {
  items: MeasurementLineItem[];
  photoUrls: string[];
  notes: string;
  viewMode: boolean;
};

type FieldMeasurementFormProps = {
  order: OrderDetail;
  draftsByType: {
    orcamento?: FieldMeasurementDraft;
    final?: FieldMeasurementDraft;
  };
  canDelete?: boolean;
};

function resolveInitialItems(
  osId: string,
  draft?: FieldMeasurementDraft,
): MeasurementLineItem[] {
  if (draft?.items?.length) return draft.items;
  if (draft?.largura || draft?.altura) {
    return [
      {
        id: `${osId}-item-0`,
        qty: 0,
        largura: draft.largura ?? 0,
        altura: draft.altura ?? 0,
        drawingUrl: null,
      },
    ];
  }
  return [createEmptyMeasurementItem(`${osId}-item-0`)];
}

function snapshotFromDraft(
  osId: string,
  draft?: FieldMeasurementDraft,
): DraftSnapshot {
  const items = resolveInitialItems(osId, draft);
  return {
    items,
    photoUrls: draft?.photos ?? [],
    notes: draft?.notes ?? "",
    viewMode: hasSavedMeasurementForView(draft),
  };
}

export function FieldMeasurementForm({
  order,
  draftsByType,
  canDelete = false,
}: FieldMeasurementFormProps) {
  const initialType =
    measurementTypeFromOsStatus(order.status) ?? FINAL_MEASUREMENT_TYPE;
  const initialDraft = draftsByType[initialType];

  const [measurementType, setMeasurementType] =
    useState<MeasurementDbType>(initialType);
  const [draftCache, setDraftCache] = useState<
    Partial<Record<MeasurementDbType, DraftSnapshot>>
  >({});
  const [items, setItems] = useState<MeasurementLineItem[]>(() =>
    resolveInitialItems(order.id, initialDraft),
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(() => {
    const initialItems = resolveInitialItems(order.id, initialDraft);
    return initialItems[0]?.id ?? null;
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    initialDraft?.photos ?? [],
  );
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unsavedDrawingsOpen, setUnsavedDrawingsOpen] = useState(false);
  const [drawingDirtyById, setDrawingDirtyById] = useState<
    Record<string, boolean>
  >({});
  const [viewMode, setViewMode] = useState(() =>
    hasSavedMeasurementForView(initialDraft),
  );
  const formRef = useRef<HTMLFormElement>(null);

  const orderContext = { status: order.status };
  const allowedActions = getAllowedMeasurementActions(orderContext);
  const confirmCopy = getMeasurementConfirmCopy(measurementType);
  const wizardStatus = osStatusFromMeasurementType(measurementType);

  const activeHeaderDraft =
    draftsByType.orcamento ?? draftsByType.final ?? undefined;

  const applySnapshot = useCallback((snapshot: DraftSnapshot) => {
    setItems(snapshot.items);
    setPhotoUrls(snapshot.photoUrls);
    setNotes(snapshot.notes);
    setViewMode(snapshot.viewMode);
    setExpandedItemId(snapshot.items[0]?.id ?? null);
    setPendingFiles([]);
    setDrawingDirtyById({});
  }, []);

  const submitWithPhotos = useCallback(
    async (
      _prev: SaveFieldMeasurementResult | null,
      formData: FormData,
    ): Promise<SaveFieldMeasurementResult> => {
      photoUrls.forEach((url) => formData.append("existingPhotos", url));
      pendingFiles.forEach((file) => formData.append("photos", file));
      formData.set("items", JSON.stringify(items));
      formData.set("measurementType", measurementType);
      formData.set("notes", notes);
      const result = await saveFieldMeasurement(formData);
      if (result.success) {
        setConfirmOpen(false);
        setViewMode(true);
        setDrawingDirtyById({});
      }
      return result;
    },
    [photoUrls, pendingFiles, items, measurementType, notes],
  );

  const [state, formAction, isPending] = useActionState<
    SaveFieldMeasurementResult | null,
    FormData
  >(submitWithPhotos, null);

  const handleMeasurementTypeChange = useCallback(
    (nextType: MeasurementDbType) => {
      if (nextType === measurementType || isPending) return;

      setDraftCache((prev) => ({
        ...prev,
        [measurementType]: {
          items,
          photoUrls,
          notes,
          viewMode,
        },
      }));

      const cached = draftCache[nextType];
      const fromServer = snapshotFromDraft(order.id, draftsByType[nextType]);
      applySnapshot(cached ?? fromServer);
      setMeasurementType(nextType);
    },
    [
      measurementType,
      isPending,
      items,
      photoUrls,
      notes,
      viewMode,
      draftCache,
      draftsByType,
      order.id,
      applySnapshot,
    ],
  );

  function addItem() {
    const newItem = createEmptyMeasurementItem(
      `${order.id}-item-${Date.now()}`,
    );
    setItems((prev) => [newItem, ...prev]);
    setExpandedItemId(newItem.id);
  }

  function updateItem(index: number, next: MeasurementLineItem) {
    setItems((prev) => prev.map((item, i) => (i === index ? next : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => {
      const removed = prev[index];
      if (removed) {
        setDrawingDirtyById((dirty) => {
          if (!dirty[removed.id]) return dirty;
          const next = { ...dirty };
          delete next[removed.id];
          return next;
        });
        setExpandedItemId((current) => {
          if (current !== removed.id) return current;
          const remaining = prev.filter((_, i) => i !== index);
          return remaining[0]?.id ?? null;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function setItemExpanded(itemId: string, expanded: boolean) {
    setExpandedItemId(expanded ? itemId : null);
  }

  function handleConfirmSave() {
    formRef.current?.requestSubmit();
  }

  function setItemDrawingDirty(itemId: string, dirty: boolean) {
    setDrawingDirtyById((prev) => {
      if (!dirty) {
        if (!prev[itemId]) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: true };
    });
  }

  const unsavedDrawingItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => drawingDirtyById[item.id]);

  function handleRequestSaveMeasurement() {
    if (unsavedDrawingItems.length > 0) {
      setUnsavedDrawingsOpen(true);
      const first = unsavedDrawingItems[0]!;
      document
        .getElementById(`measurement-item-${first.item.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setConfirmOpen(true);
  }

  const hasValidItem = items.some(
    (item) => item.qty > 0 && item.largura > 0 && item.altura > 0,
  );

  const validItems = items.filter(
    (item) => item.qty > 0 && item.largura > 0 && item.altura > 0,
  );

  const currentDraft = draftsByType[measurementType];
  const displayCliente =
    activeHeaderDraft?.cliente ?? currentDraft?.cliente ?? order.clientName;
  const displayTelefone =
    activeHeaderDraft?.telefone ?? currentDraft?.telefone ?? order.clientPhone;
  const displayNumeroOrcamento = getOrderDisplayNumber({
    number: order.number,
    budgetReference: order.budgetReference,
    numeroOrcamento:
      activeHeaderDraft?.numeroOrcamento ?? currentDraft?.numeroOrcamento,
  });

  return (
    <div className="flex flex-col gap-4 pb-24">
      <section className="rounded-xl border bg-card px-4 py-4 shadow-sm sm:px-6">
        <div className="flex items-start gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
          >
            <Link href="/field" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <dl className="min-w-0 flex-1 space-y-2 text-center text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="font-medium">{displayCliente}</dd>
            </div>
            {displayTelefone && (
              <div>
                <dt className="text-xs text-muted-foreground">Telefone</dt>
                <dd>
                  <a
                    href={`tel:${displayTelefone.replace(/\D/g, "")}`}
                    className="inline-flex items-center justify-center gap-2 text-primary underline-offset-2 hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {displayTelefone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Orçamento</dt>
              <dd className="font-medium tabular-nums">
                {displayNumeroOrcamento}
              </dd>
            </div>
          </dl>

          <div className="mt-0.5 flex shrink-0 flex-col items-end gap-2">
            <Badge variant="secondary" className="text-xs">
              {getMeasurementBadgeLabel(measurementType)}
            </Badge>
            {canDelete && (
              <DeleteMeasurementDialog
                osId={order.id}
                displayNumber={displayNumeroOrcamento}
                clientName={displayCliente ?? order.clientName}
              />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <StatusWizard
          currentStatus={wizardStatus}
          measurementFlow={order.measurementFlow}
        />
      </section>

      {state?.success === false && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.success && (
        <Alert variant="success">
          <AlertTitle>Salvo</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form ref={formRef} action={formAction} className="space-y-6">
        <input type="hidden" name="osId" value={order.id} />
        <input type="hidden" name="measurementType" value={measurementType} />

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <MeasurementTypeField
            value={measurementType}
            onChange={handleMeasurementTypeChange}
            disabled={isPending || allowedActions.length === 0}
          />
        </section>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">Medições</h2>
              <p className="text-xs text-muted-foreground">
                {viewMode
                  ? "Visualização dos desenhos e dimensões registrados."
                  : getMeasurementDimensionsHint(measurementType)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {hasSavedMeasurementForView(currentDraft) && (
                <Button
                  type="button"
                  variant={viewMode ? "default" : "outline"}
                  size="sm"
                  className="h-10 gap-1"
                  onClick={() => setViewMode((v) => !v)}
                  disabled={isPending}
                >
                  {viewMode ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </>
                  ) : (
                    "Visualizar"
                  )}
                </Button>
              )}
              {!viewMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1"
                  onClick={addItem}
                  disabled={isPending}
                >
                  <Plus className="h-4 w-4" />
                  Nova medição
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {viewMode
              ? items.map((item, index) => (
                  <MeasurementItemView
                    key={item.id}
                    item={item}
                    index={index}
                  />
                ))
              : items.map((item, index) => (
                  <MeasurementItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    expanded={expandedItemId === item.id}
                    canRemove={items.length > 1}
                    disabled={isPending}
                    onChange={(next) => updateItem(index, next)}
                    onRemove={() => removeItem(index)}
                    onExpandedChange={(expanded) =>
                      setItemExpanded(item.id, expanded)
                    }
                    onDrawingDirtyChange={(dirty) =>
                      setItemDrawingDirty(item.id, dirty)
                    }
                  />
                ))}
          </div>
        </div>

        <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <PhotoUpload
            label="Fotos"
            hint="Fotos gerais da visita — vinculadas ao tipo de medição selecionado acima."
            osId={order.id}
            scope="measurements"
            existingUrls={photoUrls}
            mode="form"
            disabled={isPending}
            onUrlsChange={setPhotoUrls}
            onFilesChange={setPendingFiles}
          />
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Recortes, nivelamento, impedimentos..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 min-h-[100px] text-base"
          />
        </section>

        {allowedActions.length > 0 && !viewMode ? (
          <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-30 border-t bg-card/95 p-3 backdrop-blur md:static md:mt-2 md:rounded-xl md:border md:p-4 md:shadow-sm">
            <div className="mx-auto max-w-3xl">
              <Button
                type="button"
                className="h-12 w-full text-base"
                onClick={handleRequestSaveMeasurement}
                disabled={isPending || !hasValidItem}
              >
                <Ruler className="mr-2 h-4 w-4" />
                Salvar {getMeasurementBadgeLabel(measurementType).toLowerCase()}
              </Button>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTitle>Medição indisponível</AlertTitle>
            <AlertDescription>
              Esta OS não está em etapa que permita registrar medição.
            </AlertDescription>
          </Alert>
        )}
      </form>

      <Dialog
        open={unsavedDrawingsOpen}
        onOpenChange={(open) => {
          if (!open) setUnsavedDrawingsOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              Desenho não salvo
            </DialogTitle>
            <DialogDescription>
              Antes de registrar a medição, salve cada desenho no quadro usando o
              botão <span className="font-medium">Salvar</span> na barra lateral
              do desenho.
            </DialogDescription>
          </DialogHeader>

          <ul className="list-inside list-disc space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            {unsavedDrawingItems.map(({ index }) => (
              <li key={index}>Medição {index + 1}</li>
            ))}
          </ul>

          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setUnsavedDrawingsOpen(false)}
            >
              Voltar e salvar desenhos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirmOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmCopy.title}</DialogTitle>
            <DialogDescription>{confirmCopy.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-mono font-medium">{displayNumeroOrcamento}</p>
              <p className="text-muted-foreground">{order.clientName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {getMeasurementBadgeLabel(measurementType)}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="font-medium">Itens de medição</p>
              <ul className="mt-2 space-y-2">
                {validItems.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-dashed pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">
                      Medição {index + 1}
                    </span>
                    <span className="font-mono tabular-nums">
                      {item.qty} × {item.largura} × {item.altura} mm
                    </span>
                    <span className="w-full text-xs text-muted-foreground">
                      {item.drawingUrl ? "Com desenho" : "Sem desenho"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-muted-foreground">
              {photoUrls.length + pendingFiles.length} foto(s) anexada(s)
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                confirmCopy.confirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
