"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Ruler,
  XCircle,
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
import { MeasurementPhotosSection } from "@/components/field/measurement-photos-section";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { SendToCuttingButton } from "@/components/field/send-to-cutting-button";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { StageProblemReport } from "@/components/workflow/stage-problem-report";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";
import { useScreenOrientationLock } from "@/hooks/use-screen-orientation-lock";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import type { MeasurementPriority } from "@/db/schema";

type FieldMeasurementFormProps = {
  order: OrderDetail;
  draftsByType: {
    orcamento?: FieldMeasurementDraft;
    final?: FieldMeasurementDraft;
  };
  lookups: MeasurementLookups;
  canDelete?: boolean;
  canSendToCutting?: boolean;
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
        idAmbiente: null,
        qty: 0,
        largura: draft.largura ?? 0,
        altura: draft.altura ?? 0,
        drawingUrl: null,
      },
    ];
  }
  return [createEmptyMeasurementItem(`${osId}-item-0`)];
}

function applyDraftSnapshot(
  osId: string,
  draft: FieldMeasurementDraft | undefined,
  setters: {
    setItems: (items: MeasurementLineItem[]) => void;
    setPhotoUrls: (urls: string[]) => void;
    setNotes: (notes: string) => void;
    setExpandedItemId: (id: string | null) => void;
    setPendingFiles: (files: File[]) => void;
    setDrawingDirtyById: (value: Record<string, boolean>) => void;
  },
) {
  const nextItems = resolveInitialItems(osId, draft);
  setters.setItems(nextItems);
  setters.setPhotoUrls(filterDisplayableUploadUrls(draft?.photos ?? []));
  setters.setNotes(draft?.notes ?? "");
  setters.setExpandedItemId(null);
  setters.setPendingFiles([]);
  setters.setDrawingDirtyById({});
}

export function FieldMeasurementForm({
  order,
  draftsByType,
  lookups,
  canDelete = false,
  canSendToCutting = false,
}: FieldMeasurementFormProps) {
  const router = useRouter();
  const initialType =
    measurementTypeFromOsStatus(order.status) ?? FINAL_MEASUREMENT_TYPE;
  const initialDraft =
    draftsByType[initialType] ??
    draftsByType.orcamento ??
    draftsByType.final;

  const [measurementType, setMeasurementType] =
    useState<MeasurementDbType>(initialType);
  const [items, setItems] = useState<MeasurementLineItem[]>(() =>
    resolveInitialItems(order.id, initialDraft),
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(() =>
    filterDisplayableUploadUrls(initialDraft?.photos ?? []),
  );
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveResultOpen, setSaveResultOpen] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveFieldMeasurementResult | null>(
    null,
  );
  const [unsavedDrawingsOpen, setUnsavedDrawingsOpen] = useState(false);
  const [drawingDirtyById, setDrawingDirtyById] = useState<
    Record<string, boolean>
  >({});
  const [drawingFullscreenItemIds, setDrawingFullscreenItemIds] = useState<
    Set<string>
  >(() => new Set());
  const [viewMode, setViewMode] = useState(() =>
    hasSavedMeasurementForView(initialDraft),
  );
  const [specValues, setSpecValues] = useState({
    priority: order.priority,
  });
  const formRef = useRef<HTMLFormElement>(null);

  const { relockPage, lockLandscape } = useScreenOrientationLock(!viewMode);

  function handleDrawingFullscreenChange(fullscreen: boolean) {
    if (fullscreen) {
      lockLandscape();
      return;
    }
    relockPage();
  }

  const orderContext = { etapa: order.status };
  const allowedActions = getAllowedMeasurementActions(orderContext);
  const confirmCopy = getMeasurementConfirmCopy(measurementType);
  const wizardStatus = osStatusFromMeasurementType(measurementType);

  const activeHeaderDraft =
    draftsByType.orcamento ?? draftsByType.final ?? undefined;

  const applyCurrentDraftSnapshot = useCallback(
    (draft?: FieldMeasurementDraft) => {
      applyDraftSnapshot(order.id, draft, {
        setItems,
        setPhotoUrls,
        setNotes,
        setExpandedItemId,
        setPendingFiles,
        setDrawingDirtyById,
      });
      setPhotosExpanded(false);
    },
    [order.id],
  );

  useEffect(() => {
    if (!viewMode) return;
    applyCurrentDraftSnapshot(draftsByType[measurementType]);
  }, [draftsByType, measurementType, viewMode, applyCurrentDraftSnapshot]);

  const submitWithPhotos = useCallback(
    async (
      _prev: SaveFieldMeasurementResult | null,
      formData: FormData,
    ): Promise<SaveFieldMeasurementResult> => {
      photoUrls.forEach((url) => formData.append("existingPhotos", url));
      pendingFiles.forEach((file) => formData.append("photos", file));
      const itemsToSubmit = items.filter(
        (item) => item.qty > 0 && item.largura > 0 && item.altura > 0,
      );
      formData.set("items", JSON.stringify(itemsToSubmit));
      formData.set("measurementType", measurementType);
      formData.set("notes", notes);
      const result = await saveFieldMeasurement(formData);
      setConfirmOpen(false);
      setSaveResult(result);
      setSaveResultOpen(true);
      if (result.success) {
        setDrawingDirtyById({});
        setPendingFiles([]);
      }
      return result;
    },
    [photoUrls, pendingFiles, items, measurementType, notes],
  );

  const [, formAction, isPending] = useActionState<
    SaveFieldMeasurementResult | null,
    FormData
  >(submitWithPhotos, null);

  const handleMeasurementTypeChange = useCallback(
    (nextType: MeasurementDbType) => {
      if (nextType === measurementType || isPending) return;
      setMeasurementType(nextType);
    },
    [measurementType, isPending],
  );

  function handleToggleViewMode() {
    setViewMode((current) => {
      const next = !current;
      if (next) {
        applyCurrentDraftSnapshot(draftsByType[measurementType]);
      }
      return next;
    });
  }

  function handleCancelOperation() {
    if (isPending) return;

    setConfirmOpen(false);
    setUnsavedDrawingsOpen(false);

    if (isCurrentTypeMeasured) {
      applyCurrentDraftSnapshot(draftsByType[measurementType]);
      setViewMode(true);
      return;
    }

    router.push("/field");
  }

  function addItem() {
    const newItem = createEmptyMeasurementItem(
      `${order.id}-item-${Date.now()}`,
    );
    setItems((prev) => [newItem, ...prev]);
    setExpandedItemId(newItem.id);
    setDrawingFullscreenItemIds((prev) => new Set(prev).add(newItem.id));
  }

  function clearDrawingFullscreenItem(itemId: string) {
    setDrawingFullscreenItemIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
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
        clearDrawingFullscreenItem(removed.id);
        setExpandedItemId((current) =>
          current !== removed.id ? current : null,
        );
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

  function handleSaveResultDismiss() {
    const succeeded = saveResult?.success === true;
    setSaveResultOpen(false);
    if (succeeded) {
      router.push("/field");
      router.refresh();
    }
  }

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
  const isCurrentTypeMeasured = hasSavedMeasurementForView(currentDraft);
  const showMeasurementTypeSelector = !isCurrentTypeMeasured || !viewMode;
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
  const photoCount = viewMode
    ? filterDisplayableUploadUrls(photoUrls).length
    : photoUrls.length + pendingFiles.length;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-2">
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

          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">
                {displayCliente}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {displayNumeroOrcamento}
              </p>
            </div>

            {(displayTelefone || canDelete) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {displayTelefone && (
                  <a
                    href={`tel:${displayTelefone.replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {displayTelefone}
                  </a>
                )}
                {canDelete && (
                  <DeleteMeasurementDialog
                    osId={order.id}
                    displayNumber={displayNumeroOrcamento}
                    clientName={displayCliente ?? order.clientName}
                  />
                )}
              </div>
            )}

            <div className="mt-3">
              <MeasurementSpecFields
                values={specValues}
                onChange={setSpecValues}
                readOnly={viewMode}
                disabled={isPending}
              />
            </div>

            <div className="mt-3">
              <StageProblemReport osId={order.id} stage="measurement" />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card p-3 shadow-sm md:p-4">
        <StatusWizard currentStatus={wizardStatus} />
        {showMeasurementTypeSelector && (
          <div className="mt-3 flex justify-center border-t pt-3">
            <MeasurementTypeField
              variant="status"
              value={measurementType}
              onChange={handleMeasurementTypeChange}
              disabled={isPending || allowedActions.length === 0}
            />
          </div>
        )}
      </section>

      <form ref={formRef} action={formAction} className="space-y-6">
        <input type="hidden" name="osId" value={order.id} />
        <input type="hidden" name="measurementType" value={measurementType} />
        <input type="hidden" name="priority" value={specValues.priority} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">Medições</h2>
              <p className="text-xs text-muted-foreground">
                {viewMode
                  ? "Desenhos e dimensões registrados."
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
                  onClick={handleToggleViewMode}
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
                    lookups={lookups}
                    expanded={expandedItemId === item.id}
                    onExpandedChange={(expanded) =>
                      setItemExpanded(item.id, expanded)
                    }
                  />
                ))
              : items.map((item, index) => (
                  <MeasurementItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    lookups={lookups}
                    expanded={expandedItemId === item.id}
                    canRemove={items.length > 1}
                    disabled={isPending}
                    initialDrawingFullscreen={drawingFullscreenItemIds.has(
                      item.id,
                    )}
                    onDrawingFullscreenApplied={() =>
                      clearDrawingFullscreenItem(item.id)
                    }
                    onDrawingFullscreenChange={handleDrawingFullscreenChange}
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

        <MeasurementPhotosSection
          expanded={photosExpanded}
          onExpandedChange={setPhotosExpanded}
          photoCount={photoCount}
        >
          {viewMode ? (
            <PhotoGallery urls={photoUrls} showLabel={false} />
          ) : (
            <PhotoUpload
              hint="Fotos gerais da visita — vinculadas ao tipo selecionado no cabeçalho ao salvar."
              osId={order.id}
              scope="measurements"
              existingUrls={photoUrls}
              mode="form"
              disabled={isPending}
              showLabel={false}
              onUrlsChange={setPhotoUrls}
              onFilesChange={setPendingFiles}
            />
          )}
        </MeasurementPhotosSection>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="notes">Observações</Label>
          {viewMode ? (
            <p className="mt-2 min-h-[100px] whitespace-pre-wrap text-sm text-muted-foreground">
              {notes.trim() || "Nenhuma observação registrada."}
            </p>
          ) : (
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Recortes, nivelamento, impedimentos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 min-h-[100px] text-base"
            />
          )}
        </section>

        {canSendToCutting && order.status === "medicao_final" ? (
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm text-muted-foreground">
              Medição final registrada. Envie para o plano de corte quando estiver
              pronta — mesma regra do arraste no kanban (Final → Cortes).
            </p>
            <SendToCuttingButton
              osId={order.id}
              osNumber={displayNumeroOrcamento}
              clientName={displayCliente}
              orderStatus={order.status}
            />
          </section>
        ) : null}

        {allowedActions.length > 0 && !viewMode ? (
          <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-30 border-t bg-card/95 p-3 backdrop-blur md:static md:mt-2 md:rounded-xl md:border md:p-4 md:shadow-sm">
            <div className="mx-auto flex max-w-3xl gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 text-base"
                onClick={handleCancelOperation}
                disabled={isPending}
              >
                Cancelar operação
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 text-base"
                onClick={handleRequestSaveMeasurement}
                disabled={isPending || !hasValidItem}
              >
                <Ruler className="mr-2 h-4 w-4" />
                Salvar {getMeasurementBadgeLabel(measurementType).toLowerCase()}
              </Button>
            </div>
          </div>
        ) : allowedActions.length === 0 ? (
          <Alert>
            <AlertTitle>Medição indisponível</AlertTitle>
            <AlertDescription>
              Esta OS não está em etapa que permita registrar medição.
            </AlertDescription>
          </Alert>
        ) : null}
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
                      {resolveLookupLabel(lookups.ambientes, item.idAmbiente ?? null) ||
                        `Medição ${index + 1}`}
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

      <Dialog
        open={saveResultOpen}
        onOpenChange={(open) => {
          if (!open) handleSaveResultDismiss();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {saveResult?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  Medição salva
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  Não foi possível salvar
                </>
              )}
            </DialogTitle>
            <DialogDescription>{saveResult?.message}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto"
              variant={saveResult?.success ? "default" : "outline"}
              onClick={handleSaveResultDismiss}
            >
              {saveResult?.success ? "Ir para medições" : "Voltar e corrigir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
