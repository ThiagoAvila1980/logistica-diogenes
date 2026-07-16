"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { cuttingPlans, measurements, statusHistory } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import { isCuttingPhaseStatus } from "@/lib/transport-gates";
import { requireRole } from "@/lib/auth/require-role";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS, stepCheckAction } from "@/lib/audit/actions";
import { getServiceOrderById } from "@/lib/data/orders";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  aggregateCuttingStepsFromItems,
  canOperateCuttingForItems,
  selectCuttingLineItems,
} from "@/lib/workflow/aggregates";
import { WorkflowActionError } from "@/lib/workflow/errors";
import { logger } from "@/lib/logger";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import { measurementTypePatchForEtapa } from "@/lib/workflow/measurement-actions";
import {
  findActiveCortador,
  recordVaoStepCompletion,
} from "@/lib/performance/scoring";
import { saveBase64Drawing } from "@/lib/upload/save-base64-image";
import { isDrawingDataUrl } from "@/lib/upload/canvas-export";
import { resolveUploadDisplayUrl } from "@/lib/upload/resolve-display-url";
import type { DrawingItem } from "@/lib/workflow/schemas";

// ─── Helpers ────────────────────────────────────────────────────────────────

export type UpdateCuttingStepResult =
  | { success: true }
  | { success: false; message: string };

// ─── Action: atualizar etapa de corte por vão ────────────────────────────────

const updateItemStepSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  step: z.enum(["corte", "embalagem", "acessorios", "vidros"]),
  done: z.boolean(),
});

export async function updateItemCuttingStepAction(
  raw: z.infer<typeof updateItemStepSchema>,
): Promise<UpdateCuttingStepResult> {
  const parsed = updateItemStepSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[updateItemCuttingStepAction] validação falhou", parsed.error.flatten());
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, step, done } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    // Leitura + escrita na mesma transação com lock de linha (FOR UPDATE),
    // evitando lost update quando dois operadores editam vãos da mesma OS.
    await db.transaction(async (tx) => {
      const [meas] = await tx
        .select({ items: measurements.items, etapa: measurements.etapa })
        .from(measurements)
        .where(eq(measurements.id, osId))
        .for("update")
        .limit(1);

      if (!meas) throw new WorkflowActionError("OS não encontrada");

      const status = meas.etapa as OsStatus;
      const allItems = (meas.items as MeasurementLineItem[]) ?? [];

      if (!canOperateCuttingForItems(status, allItems)) {
        throw new WorkflowActionError("OS não está em etapa de corte");
      }

      // Atualiza o item específico no array JSONB (preserva todos os items)
      const updatedItems = allItems.map((item) => {
        if (item.id !== itemId) return item;
        const prev = item.cuttingProgress ?? {
          corte: false, embalagem: false, acessorios: false, vidros: false,
        };
        return { ...item, cuttingProgress: { ...prev, [step]: done } };
      });

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: stepCheckAction("cutting", done),
        measurementId: osId,
        itemId,
        payload: { step, done },
      });

      const updatedCuttingItems = selectCuttingLineItems(updatedItems);
      const newAggregate = aggregateCuttingStepsFromItems(updatedCuttingItems);
      const aggregate = aggregateCuttingStepsFromItems(
        selectCuttingLineItems(allItems),
      );

      // Pontuação: corte_vao ao marcar/desmarcar step=corte
      if (step === "corte") {
        const cortadorId = done ? await findActiveCortador(tx) : null;
        const updatedItem = updatedItems.find((i) => i.id === itemId);
        await recordVaoStepCompletion(tx, {
          userId: cortadorId,
          measurementId: osId,
          itemId,
          eventType: "corte_vao",
          idTipoEnvidracamento: updatedItem?.idTipoEnvidracamento,
          done,
        });
      }

      // Quando o primeiro vão tem corte feito, libera transporte em paralelo
      if (
        step === "corte" &&
        done &&
        newAggregate.corteFeito &&
        !aggregate.corteFeito &&
        isCuttingPhaseStatus(status)
      ) {
        await tx
          .update(measurements)
          .set({ etapa: "transporte_perfil", updatedAt: new Date() })
          .where(eq(measurements.id, osId));
        await tx.insert(statusHistory).values({
          measurementId: osId,
          fromStatus: status,
          toStatus: "transporte_perfil",
          changedById: session.userId,
          metadata: { source: "cutting_unlock_transport_per_vao" },
        });
        
        await recordAuditEvent(tx, {
          actorId: session.userId,
          action: AUDIT_ACTIONS.OS_STAGE_CHANGED,
          measurementId: osId,
          payload: {
            fromStatus: status,
            toStatus: "transporte_perfil",
            source: "cutting_unlock_transport_per_vao",
          },
        });
      }
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return { success: false, message: err.message };
    }
    logger.error("updateItemCuttingStep failed", { osId, itemId, step, err });
    return { success: false, message: "Erro ao atualizar etapa" };
  }
}

const advanceToTransportSchema = z.object({
  osId: z.string().uuid(),
});

export type AdvanceToTransportResult =
  | { success: true }
  | { success: false; message: string };

export async function advanceCuttingToTransportAction(
  raw: z.infer<typeof advanceToTransportSchema>,
): Promise<AdvanceToTransportResult> {
  const parsed = advanceToTransportSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[advanceCuttingToTransportAction] validação falhou", parsed.error.flatten());
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    // Verifica se todos os vãos têm todas as etapas concluídas
    const [meas] = await db
      .select({ items: measurements.items, etapa: measurements.etapa })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!meas) return { success: false, message: "OS não encontrada" };

    const allItems = (meas.items as MeasurementLineItem[]) ?? [];
    // Considera apenas vãos enviados para o corte (ou todos se nenhum tiver flag)
    const hasSentFlag = allItems.some((i) => i.sentToCutting === true);
    const items = hasSentFlag
      ? allItems.filter((i) => i.sentToCutting === true)
      : allItems;
    const aggregate = aggregateCuttingStepsFromItems(items);

    if (
      !aggregate.corteFeito ||
      !aggregate.embalagemFeita ||
      !aggregate.acessoriosFeitos ||
      !aggregate.vidrosFeitos
    ) {
      return { success: false, message: "Conclua todas as etapas de todos os vãos antes de avançar" };
    }

    // Se já está em transporte/instalação, apenas redireciona
    if (
      (meas.etapa as OsStatus).startsWith("transporte_") ||
      (meas.etapa as OsStatus).startsWith("instalacao") ||
      meas.etapa === "concluido"
    ) {
      return { success: true };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(measurements)
        .set({ etapa: "transporte_perfil", updatedAt: new Date() })
        .where(eq(measurements.id, osId));
      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus: meas.etapa as OsStatus,
        toStatus: "transporte_perfil",
        changedById: session.userId,
        metadata: { source: "cutting_advance_to_transport" },
      });
      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.OS_STAGE_CHANGED,
        measurementId: osId,
        payload: {
          fromStatus: meas.etapa as OsStatus,
          toStatus: "transporte_perfil",
          source: "cutting_advance_to_transport",
        },
      });
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[advanceCuttingToTransport]", err);
    return { success: false, message: "Erro ao avançar para transporte" };
  }
}

const updateCuttingNotesSchema = z.object({
  osId: z.string().uuid(),
  notes: z.string().max(2000).nullable(),
});

export type UpdateCuttingNotesResult =
  | { success: true }
  | { success: false; message: string };

export async function updateCuttingNotesAction(
  raw: z.infer<typeof updateCuttingNotesSchema>,
): Promise<UpdateCuttingNotesResult> {
  const parsed = updateCuttingNotesSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[updateCuttingNotesAction] validação falhou", parsed.error.flatten());
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, notes } = parsed.data;
  const trimmedNotes = notes?.trim() || null;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    const [meas] = await db
      .select({ items: measurements.items, etapa: measurements.etapa })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!meas) return { success: false, message: "OS não encontrada" };

    await db.transaction(async (tx) => {
      const [existingPlan] = await tx
        .select({ id: cuttingPlans.id })
        .from(cuttingPlans)
        .where(eq(cuttingPlans.idMedicao, osId))
        .limit(1);

      if (existingPlan) {
        await tx
          .update(cuttingPlans)
          .set({ cutterNotes: trimmedNotes })
          .where(eq(cuttingPlans.id, existingPlan.id));
      } else {
        await tx.insert(cuttingPlans).values({
          idMedicao: osId,
          cutterNotes: trimmedNotes,
        });
      }

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.CUTTING_NOTES_UPDATED,
        measurementId: osId,
        payload: { notes: trimmedNotes },
      });
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[updateCuttingNotes]", err);
    return { success: false, message: "Erro ao salvar observações" };
  }
}

// ─── Action: enviar vãos selecionados para o plano de corte ─────────────────

const sendItemsToCuttingSchema = z.object({
  osId: z.string().uuid(),
  selectedItemIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um vão"),
});

export type SendItemsToCuttingResult =
  | { success: true; notificationSummary?: string }
  | { success: false; message: string };

export async function sendItemsToCuttingAction(
  raw: z.infer<typeof sendItemsToCuttingSchema>,
): Promise<SendItemsToCuttingResult> {
  const parsed = sendItemsToCuttingSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Requisição inválida";
    return { success: false, message: msg };
  }

  let session;
  try {
    session = await requireRole(["gerente", "admin"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, selectedItemIds } = parsed.data;
  const selectedSet = new Set(selectedItemIds);

  try {
    const db = getDb();

    const [meas] = await db
      .select({ id: measurements.id, etapa: measurements.etapa, items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!meas) return { success: false, message: "OS não encontrada" };

    const fromStatus = meas.etapa as OsStatus;
    const allowed = getAllowedTransitions(fromStatus);
    if (!allowed.includes("cortes")) {
      return { success: false, message: `Transição não permitida: ${fromStatus} → cortes` };
    }

    // Marca apenas os vãos selecionados; desmarca os demais (permite reedição futura)
    const currentItems = (meas.items as MeasurementLineItem[]) ?? [];
    const updatedItems: MeasurementLineItem[] = currentItems.map((item) => ({
      ...item,
      sentToCutting: selectedSet.has(item.id) ? true : (item.sentToCutting ?? false),
    }));

    await db.transaction(async (tx) => {
      await tx
        .update(measurements)
        .set({
          items: updatedItems,
          etapa: "cortes",
          updatedAt: sql`NOW()`,
          ...measurementTypePatchForEtapa("cortes"),
        })
        .where(eq(measurements.id, osId));

      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus,
        toStatus: "cortes",
        changedById: session.userId,
        metadata: { source: "send_items_to_cutting", selectedItemIds },
      });

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.CUTTING_ITEMS_SENT,
        measurementId: osId,
        payload: { selectedItemIds },
      });
    });

    revalidateOSRoutes(osId);
    const count = selectedItemIds.length;
    return {
      success: true,
      notificationSummary:
        count === 1
          ? "1 vão enviado para o plano de corte."
          : `${count} vãos enviados para o plano de corte.`,
    };
  } catch (err) {
    console.error("[sendItemsToCutting]", err);
    return { success: false, message: "Erro ao enviar para o corte" };
  }
}

const LEGACY_DRAWING_ID = "__legacy__";

const updateItemDrawingSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  drawingId: z.string().min(1),
  imageDataUrl: z.string().min(1),
});

export type UpdateItemDrawingResult =
  | { success: true; url: string }
  | { success: false; message: string };

export async function updateItemDrawingAction(
  raw: z.infer<typeof updateItemDrawingSchema>,
): Promise<UpdateItemDrawingResult> {
  const parsed = updateItemDrawingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Requisição inválida. Recarregue a página e tente novamente.",
    };
  }

  let session;
  try {
    session = await requireRole(["admin"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, drawingId, imageDataUrl } = parsed.data;

  if (!isDrawingDataUrl(imageDataUrl)) {
    return { success: false, message: "Formato de imagem inválido." };
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const savedUrl = await saveBase64Drawing(imageDataUrl, osId);
    const db = getDb();

    await db.transaction(async (tx) => {
      const [meas] = await tx
        .select({ items: measurements.items })
        .from(measurements)
        .where(eq(measurements.id, osId))
        .for("update")
        .limit(1);

      if (!meas) throw new WorkflowActionError("OS não encontrada");

      const items = (meas.items as MeasurementLineItem[]) ?? [];
      const itemIndex = items.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) throw new WorkflowActionError("Vão não encontrado");

      const item = items[itemIndex]!;
      let nextDrawings: DrawingItem[] | undefined = item.drawings;
      let nextDrawingUrl: string | null | undefined = item.drawingUrl ?? null;

      if (item.drawings && item.drawings.length > 0) {
        const targetId =
          drawingId === LEGACY_DRAWING_ID ? item.drawings[0]!.id : drawingId;
        const hasTarget = item.drawings.some((d) => d.id === targetId);
        if (!hasTarget) throw new WorkflowActionError("Desenho não encontrado");

        nextDrawings = item.drawings.map((d) =>
          d.id === targetId ? { ...d, url: savedUrl } : d,
        );
        nextDrawingUrl = nextDrawings[0]?.url ?? null;
      } else if (drawingId === LEGACY_DRAWING_ID || !item.drawingUrl) {
        nextDrawingUrl = savedUrl;
      } else {
        throw new WorkflowActionError("Desenho não encontrado");
      }

      const updatedItems = [...items];
      updatedItems[itemIndex] = {
        ...item,
        drawingUrl: nextDrawingUrl,
        drawings: nextDrawings,
      };

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.CUTTING_DRAWING_UPDATED,
        measurementId: osId,
        itemId,
        payload: { drawingId },
      });
    });

    const displayUrl = await resolveUploadDisplayUrl(savedUrl);
    revalidateOSRoutes(osId);
    return { success: true, url: displayUrl };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return { success: false, message: err.message };
    }
    logger.error("updateItemDrawingAction failed", { osId, itemId, drawingId, err });
    return { success: false, message: "Erro ao salvar desenho" };
  }
}
