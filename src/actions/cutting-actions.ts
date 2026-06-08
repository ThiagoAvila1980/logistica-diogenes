"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { cuttingPlans, measurements, statusHistory } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import { isCuttingPhaseStatus, canOperateCuttingModule } from "@/lib/transport-gates";
import { requireRole } from "@/lib/auth/require-role";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { getServiceOrderById } from "@/lib/data/orders";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { aggregateCuttingStepsFromItems } from "@/lib/data/cutting-detail";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import { measurementTypePatchForEtapa } from "@/lib/workflow/measurement-actions";

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

  try {
    await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, step, done } = parsed.data;

  if (useMockData()) {
    const result = mockRepository.updateCuttingStep(osId, step, done);
    if (result.success) revalidateOSRoutes(osId);
    return result;
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    // Carrega itens atuais da medição
    const [meas] = await db
      .select({ items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!meas) return { success: false, message: "OS não encontrada" };

    const allItems = (meas.items as MeasurementLineItem[]) ?? [];
    const hasSentFlag = allItems.some((i) => i.sentToCutting === true);
    const cuttingItems = hasSentFlag
      ? allItems.filter((i) => i.sentToCutting === true)
      : allItems;
    const aggregate = aggregateCuttingStepsFromItems(cuttingItems);

    if (!canOperateCuttingModule(order.status as OsStatus, aggregate)) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    // Atualiza o item específico no array JSONB (preserva todos os items)
    const updatedItems = allItems.map((item) => {
      if (item.id !== itemId) return item;
      const prev = item.cuttingProgress ?? { corte: false, embalagem: false, acessorios: false, vidros: false };
      return { ...item, cuttingProgress: { ...prev, [step]: done } };
    });

    await db
      .update(measurements)
      .set({ items: updatedItems, updatedAt: new Date() })
      .where(eq(measurements.id, osId));

    const updatedCuttingItems = hasSentFlag
      ? updatedItems.filter((i) => i.sentToCutting === true)
      : updatedItems;
    const newAggregate = aggregateCuttingStepsFromItems(updatedCuttingItems);

    // Quando o primeiro vão tem corte feito, libera transporte em paralelo
    if (
      step === "corte" &&
      done &&
      newAggregate.corteFeito &&
      !aggregate.corteFeito &&
      isCuttingPhaseStatus(order.status as OsStatus)
    ) {
      await db.transaction(async (tx) => {
        await tx
          .update(measurements)
          .set({ etapa: "transporte_perfil", updatedAt: new Date() })
          .where(eq(measurements.id, osId));
        await tx.insert(statusHistory).values({
          measurementId: osId,
          fromStatus: order.status as OsStatus,
          toStatus: "transporte_perfil",
          metadata: { source: "cutting_unlock_transport_per_vao" },
        });
      });
    }

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[updateItemCuttingStep]", err);
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

  try {
    await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId } = parsed.data;

  if (useMockData()) {
    return { success: true };
  }

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
        metadata: { source: "cutting_advance_to_transport" },
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

  try {
    await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, notes } = parsed.data;
  const trimmedNotes = notes?.trim() || null;

  if (useMockData()) {
    const result = mockRepository.updateCuttingNotes(osId, trimmedNotes);
    if (result.success) revalidateOSRoutes(osId);
    return result;
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    const [meas] = await db
      .select({ items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    const items = (meas?.items as MeasurementLineItem[]) ?? [];
    const aggregate = aggregateCuttingStepsFromItems(items);

    if (!canOperateCuttingModule(order.status as OsStatus, aggregate)) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    const [existingPlan] = await db
      .select({ id: cuttingPlans.id })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1);

    if (existingPlan) {
      await db
        .update(cuttingPlans)
        .set({ cutterNotes: trimmedNotes })
        .where(eq(cuttingPlans.id, existingPlan.id));
    } else {
      await db.insert(cuttingPlans).values({
        idMedicao: osId,
        cutterNotes: trimmedNotes,
      });
    }

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

  try {
    await requireRole(["gerente", "admin"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, selectedItemIds } = parsed.data;
  const selectedSet = new Set(selectedItemIds);

  if (useMockData()) {
    const result = mockRepository.moveCard(osId, "cortes");
    if (!result.success) return result;
    revalidateOSRoutes(osId);
    return { success: true, notificationSummary: "Vãos enviados para o plano de corte (modo demo)." };
  }

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
        metadata: { source: "send_items_to_cutting", selectedItemIds },
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
