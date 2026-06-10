"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
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
import { Button } from "@/components/ui/button";
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
import { SendToCuttingDialog } from "@/components/field/send-to-cutting-dialog";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { StageProblemReport } from "@/components/workflow/stage-problem-report";
import { useScreenOrientationLock } from "@/hooks/use-screen-orientation-lock";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import type { MeasurementPriority } from "@/db/schema";
import { buildWhatsAppUrl } from "@/lib/phone-format";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { countItemPhotos, mergeLegacyDraftPhotos } from "@/lib/measurement/item-photos";
import { uploadPendingItemPhotos } from "@/lib/measurement/upload-item-photos-client";
import {
  formatDimensionsSummary,
  hasValidItemDimensions,
  sanitizeMeasurementItem,
} from "@/lib/measurement/dimensions";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";
import { cn } from "@/lib/utils";

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
  let items: MeasurementLineItem[];
  if (draft?.items?.length) {
    items = draft.items;
  } else if (draft?.largura || draft?.altura) {
    items = [
      {
        id: `${osId}-item-0`,
        idAmbiente: null,
        qty: 0,
        largura: draft.largura ?? 0,
        altura: draft.altura ?? 0,
        drawingUrl: null,
      },
    ];
  } else {
    items = [createEmptyMeasurementItem(`${osId}-item-0`)];
  }
  return sortMeasurementItemsOldestFirst(
    mergeLegacyDraftPhotos(items, draft?.photos ?? []),
  );
}

function applyDraftSnapshot(
  osId: string,
  draft: FieldMeasurementDraft | undefined,
  setters: {
    setItems: (items: MeasurementLineItem[]) => void;
    setExpandedItemId: (id: string | null) => void;
    setPendingFilesByItemId: (value: Record<string, File[]>) => void;
    setDrawingDirtyById: (value: Record<string, boolean>) => void;
  },
  options?: { expandFirstItem?: boolean },
) {
  const nextItems = resolveInitialItems(osId, draft);
  setters.setItems(nextItems);
  setters.setExpandedItemId(
    options?.expandFirstItem ? (nextItems[0]?.id ?? null) : null,
  );
  setters.setPendingFilesByItemId({});
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
  const initialItems = resolveInitialItems(order.id, initialDraft);
  const initialViewMode = hasSavedMeasurementForView(initialDraft);

  const [measurementType, setMeasurementType] =
    useState<MeasurementDbType>(initialType);
  const [items, setItems] = useState<MeasurementLineItem[]>(initialItems);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(() =>
    initialViewMode ? null : (initialItems[0]?.id ?? null),
  );
  const [pendingFilesByItemId, setPendingFilesByItemId] = useState<
    Record<string, File[]>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveResultOpen, setSaveResultOpen] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveFieldMeasurementResult | null>(
    null,
  );
  const [drawingDirtyById, setDrawingDirtyById] = useState<
    Record<string, boolean>
  >({});
  const [pendingDrawingEdit, setPendingDrawingEdit] = useState<{
    itemId: string;
    drawingId: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState(initialViewMode);
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
    (
      draft?: FieldMeasurementDraft,
      options?: { expandFirstItem?: boolean },
    ) => {
      applyDraftSnapshot(
        order.id,
        draft,
        {
          setItems,
          setExpandedItemId,
          setPendingFilesByItemId,
          setDrawingDirtyById,
        },
        options,
      );
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
      const itemsToSubmit = items
        .filter(hasValidItemDimensions)
        .map(sanitizeMeasurementItem);

      const uploaded = await uploadPendingItemPhotos(
        order.id,
        itemsToSubmit,
        pendingFilesByItemId,
      );
      if (!uploaded.success) {
        const failure = { success: false as const, message: uploaded.message };
        setSaveResult(failure);
        setSaveResultOpen(true);
        return failure;
      }

      formData.set("items", JSON.stringify(uploaded.items));
      formData.set("measurementType", measurementType);
      const result = await saveFieldMeasurement(formData);
      setConfirmOpen(false);
      setSaveResult(result);
      setSaveResultOpen(true);
      if (result.success) {
        setDrawingDirtyById({});
        setPendingFilesByItemId({});
      }
      return result;
    },
    [order.id, pendingFilesByItemId, items, measurementType],
  );

  const [, formAction, isPending] = useActionState<
    SaveFieldMeasurementResult | null,
    FormData
  >(submitWithPhotos, null);

  const handleMeasurementTypeChange = useCallback(
    (nextType: MeasurementDbType) => {
      if (nextType === measurementType || isPending) return;
      setMeasurementType(nextType);
      if (!viewMode) {
        const targetDraft = draftsByType[nextType];
        // Só há um registro por OS; ao promover orçamento → final o draft do outro
        // tipo costuma não existir — manter itens em edição evita formulário vazio.
        if (hasSavedMeasurementForView(targetDraft)) {
          applyCurrentDraftSnapshot(targetDraft, {
            expandFirstItem: true,
          });
        }
      }
    },
    [measurementType, isPending, viewMode, draftsByType, applyCurrentDraftSnapshot],
  );

  function handleToggleViewMode() {
    setViewMode((current) => {
      const next = !current;
      if (next) {
        applyCurrentDraftSnapshot(draftsByType[measurementType]);
      } else {
        applyCurrentDraftSnapshot(draftsByType[measurementType], {
          expandFirstItem: true,
        });
      }
      return next;
    });
  }

  function handleCancelOperation() {
    if (isPending) return;

    setConfirmOpen(false);

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
    setItems((prev) => [...prev, newItem]);
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
        setPendingFilesByItemId((pending) => {
          if (!pending[removed.id]) return pending;
          const next = { ...pending };
          delete next[removed.id];
          return next;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function setItemExpanded(itemId: string, expanded: boolean) {
    setExpandedItemId(expanded ? itemId : null);
  }

  function handleDrawingEditRequest(itemId: string, drawingId: string) {
    setViewMode(false);
    setExpandedItemId(itemId);
    setPendingDrawingEdit({ itemId, drawingId });
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

  function handleSaveResultDismiss() {
    const succeeded = saveResult?.success === true;
    setSaveResultOpen(false);
    if (succeeded) {
      router.push("/field");
      router.refresh();
    }
  }

  function handleRequestSaveMeasurement() {
    setConfirmOpen(true);
  }

  const hasValidItem = items.some(hasValidItemDimensions);

  const validItems = items.filter(hasValidItemDimensions);

  const totalPhotoCount = validItems.reduce(
    (sum, item) =>
      sum +
      countItemPhotos(item, (pendingFilesByItemId[item.id] ?? []).length),
    0,
  );

  const currentDraft = draftsByType[measurementType];
  const isCurrentTypeMeasured = hasSavedMeasurementForView(currentDraft);
  const showMeasurementTypeSelector = !isCurrentTypeMeasured || !viewMode;
  const displayCliente =
    activeHeaderDraft?.cliente ?? currentDraft?.cliente ?? order.clientName;
  const displayTelefone =
    activeHeaderDraft?.telefone ?? currentDraft?.telefone ?? order.clientPhone;
  const whatsAppUrl = displayTelefone
    ? buildWhatsAppUrl(displayTelefone)
    : null;
  const displayNumeroOrcamento = getOrderDisplayNumber({
    number: order.number,
    budgetReference: order.budgetReference,
    numeroOrcamento:
      activeHeaderDraft?.numeroOrcamento ?? currentDraft?.numeroOrcamento,
  });
  return (
    <div className="flex flex-col gap-4 mobile-form-offset md:pb-0">
      <section className="relative rounded-xl border bg-card p-4 shadow-sm">
        {canDelete && (
          <div className="absolute right-1 top-1 z-10 sm:right-2 sm:top-2">
            <DeleteMeasurementDialog
              osId={order.id}
              displayNumber={displayNumeroOrcamento}
              clientName={displayCliente ?? order.clientName}
            />
          </div>
        )}

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

          <div className={cn("min-w-0 flex-1", canDelete && "pr-8")}>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold leading-tight text-primary">
                {displayCliente}
              </p>
              <p className="font-mono text-xl tabular-nums text-muted-foreground">
                {displayNumeroOrcamento}
              </p>
            </div>

            {displayTelefone && (
              <div className="mt-2.5">
                {whatsAppUrl ? (
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                    aria-label={`Abrir WhatsApp de ${displayTelefone}`}
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    {displayTelefone}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {displayTelefone}
                  </span>
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
                    onDrawingClick={
                      allowedActions.length > 0
                        ? (drawingId) =>
                            handleDrawingEditRequest(item.id, drawingId)
                        : undefined
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
                    osId={order.id}
                    pendingFiles={pendingFilesByItemId[item.id] ?? []}
                    onPendingFilesChange={(files) =>
                      setPendingFilesByItemId((prev) => ({
                        ...prev,
                        [item.id]: files,
                      }))
                    }
                    onDrawingFullscreenChange={handleDrawingFullscreenChange}
                    initialActiveDrawingId={
                      pendingDrawingEdit?.itemId === item.id
                        ? pendingDrawingEdit.drawingId
                        : null
                    }
                    onInitialActiveDrawingApplied={() =>
                      setPendingDrawingEdit(null)
                    }
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

        {canSendToCutting && order.status === "medicao_final" ? (
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm text-muted-foreground">
              Medição final registrada. Escolha quais vãos enviar para o plano
              de corte.
            </p>
            <SendToCuttingDialog
              osId={order.id}
              osNumber={displayNumeroOrcamento}
              clientName={displayCliente}
              orderStatus={order.status}
              items={validItems}
              lookups={lookups}
            />
          </section>
        ) : null}

        {allowedActions.length > 0 && !viewMode ? (
          <div className="mobile-action-bar fixed inset-x-0 z-30 border-t bg-card/95 p-3 backdrop-blur md:static md:mt-2 md:rounded-xl md:border md:p-4 md:shadow-sm">
            <div className="flex gap-2">
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
                Salvar Medição
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
                      {formatDimensionsSummary(item)}
                    </span>
                    <span className="w-full text-xs text-muted-foreground">
                      {item.drawingUrl ? "Com desenho" : "Sem desenho"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-muted-foreground">
              {totalPhotoCount} foto(s) anexada(s)
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
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
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
