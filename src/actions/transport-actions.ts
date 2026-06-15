"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { transportLogs, vehicles, measurements } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
import { useMockData } from "@/lib/data/config";
import { vehicleMockStore } from "@/lib/data/admin-mock-store";
import { canOperateTransportModule } from "@/lib/transport-gates";
import {
  aggregateCuttingStepsFromItems,
  aggregateTransportStepsFromItems,
  effectiveCuttingSteps,
  isTransportOrLater,
} from "@/lib/workflow/aggregates";
import { WorkflowActionError } from "@/lib/workflow/errors";
import { logger } from "@/lib/logger";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpdateTransportStepResult =
  | { success: true }
  | {
      success: false;
      message: string;
      reason?: "gate_locked" | "vehicle_required";
    };

export type UpdateTransportNotesResult =
  | { success: true }
  | { success: false; message: string };

export type AssignVehicleToTransportResult =
  | { success: true }
  | { success: false; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadMeasurementItems(osId: string): Promise<MeasurementLineItem[]> {
  const db = getDb();
  const [row] = await db
    .select({ items: measurements.items })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);
  return (row?.items as MeasurementLineItem[]) ?? [];
}

// ─── Action: atribuir veículo ────────────────────────────────────────────────

const assignVehicleSchema = z.object({
  osId: z.string().uuid(),
  vehicleId: z.string().uuid(),
});

export async function assignVehicleToTransportAction(
  raw: z.infer<typeof assignVehicleSchema>,
): Promise<AssignVehicleToTransportResult> {
  const parsed = assignVehicleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Requisição inválida. Recarregue a página e tente novamente.",
    };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente", "motorista"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, vehicleId } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const items = await loadMeasurementItems(osId);
    const cuttingSteps = effectiveCuttingSteps(
      aggregateCuttingStepsFromItems(items),
      isTransportOrLater(order.status),
    );

    if (!canOperateTransportModule(order.status, cuttingSteps)) {
      return {
        success: false,
        message: "Aguardando conclusão do corte para liberar transporte",
      };
    }

    if (useMockData()) {
      const vehicle = vehicleMockStore.getById(vehicleId);
      if (!vehicle?.active) {
        return { success: false, message: "Veículo não encontrado ou inativo" };
      }
      try {
        vehicleMockStore.assignToTransport(osId, vehicleId);
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Veículo indisponível",
        };
      }
      revalidateOSRoutes(osId);
      return { success: true };
    }

    const db = getDb();
    const [vehicle] = await db
      .select({ id: vehicles.id, active: vehicles.active })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.active, true)))
      .limit(1);

    if (!vehicle) {
      return { success: false, message: "Veículo não encontrado ou inativo" };
    }

    const { assignVehicleToTransportDb } = await import("@/lib/data/vehicles-db");
    await assignVehicleToTransportDb(osId, vehicleId, session.userId);
    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[assignVehicleToTransport]", err);
    return { success: false, message: "Erro ao atribuir veículo" };
  }
}

// ─── Action: atualizar etapa de transporte por vão ───────────────────────────

const updateItemTransportStepSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  step: z.enum(["perfilEstrutural", "perfilTotal", "acessorios", "vidros"]),
  done: z.boolean(),
});

export async function updateItemTransportStepAction(
  raw: z.infer<typeof updateItemTransportStepSchema>,
): Promise<UpdateTransportStepResult> {
  const parsed = updateItemTransportStepSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[updateItemTransportStepAction] validação falhou", parsed.error.flatten());
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  try {
    await requireRole(["admin", "gerente", "motorista"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, step, done } = parsed.data;

  if (useMockData()) {
    // mock simplificado
    revalidateOSRoutes(osId);
    return { success: true };
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();
    const isLatePhase = isTransportOrLater(order.status);

    // Leitura + escrita na mesma transação com lock de linha (FOR UPDATE),
    // evitando lost update quando dois operadores editam vãos da mesma OS.
    await db.transaction(async (tx) => {
      const [meas] = await tx
        .select({ items: measurements.items })
        .from(measurements)
        .where(eq(measurements.id, osId))
        .for("update")
        .limit(1);

      if (!meas) throw new WorkflowActionError("OS não encontrada");

      const items = (meas.items as MeasurementLineItem[]) ?? [];
      const cuttingSteps = effectiveCuttingSteps(
        aggregateCuttingStepsFromItems(items),
        isLatePhase,
      );

      if (!canOperateTransportModule(order.status, cuttingSteps)) {
        throw new WorkflowActionError(
          "Aguardando conclusão do corte para liberar transporte",
        );
      }

      // Busca o veículo atribuído
      const [trans] = await tx
        .select({ vehicleId: transportLogs.vehicleId })
        .from(transportLogs)
        .where(eq(transportLogs.idMedicao, osId))
        .limit(1);

      const hasVehicle = Boolean(trans?.vehicleId);

      // Verifica gate por vão
      const item = items.find((i) => i.id === itemId);
      if (!item) throw new WorkflowActionError("Vão não encontrado");

      if (done) {
        const cutProg = item.cuttingProgress ?? {
          corte: false, embalagem: false, acessorios: false, vidros: false,
        };

        if (step === "perfilEstrutural") {
          if (!cutProg.corte && !isLatePhase) {
            throw new WorkflowActionError("Aguardando corte deste vão ser concluído", "gate_locked");
          }
          if (!hasVehicle) {
            throw new WorkflowActionError("Selecione o veículo antes de iniciar a entrega", "vehicle_required");
          }
        }
        if (step === "perfilTotal" && !cutProg.embalagem && !isLatePhase) {
          throw new WorkflowActionError("Aguardando embalagem deste vão ser concluída", "gate_locked");
        }
        if (step === "acessorios" && !cutProg.acessorios && !isLatePhase) {
          throw new WorkflowActionError("Aguardando acessórios deste vão serem separados", "gate_locked");
        }
        if (step === "vidros" && !cutProg.vidros && !isLatePhase) {
          throw new WorkflowActionError("Aguardando vidros deste vão serem separados", "gate_locked");
        }
      }

      // Atualiza o item no JSONB
      const updatedItems = items.map((i) => {
        if (i.id !== itemId) return i;
        const prev = i.transportProgress ?? {
          perfilEstrutural: false, perfilTotal: false, acessorios: false, vidros: false,
        };
        return { ...i, transportProgress: { ...prev, [step]: done } };
      });

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));

      // Atualiza o aggregate no transport_logs (compat. com installation gates)
      const newAggregate = aggregateTransportStepsFromItems(updatedItems);
      const [existingLog] = await tx
        .select({ id: transportLogs.id })
        .from(transportLogs)
        .where(eq(transportLogs.idMedicao, osId))
        .limit(1);

      const logFields = {
        levarPerfilEstrutural: newAggregate.levarPerfilEstrutural,
        levarPerfilTotal: newAggregate.levarPerfilTotal,
        levarAcessorios: newAggregate.levarAcessorios,
        levarVidros: newAggregate.levarVidros,
        transporteConcluido: newAggregate.transporteConcluido,
        updatedAt: new Date(),
      };

      if (existingLog) {
        await tx.update(transportLogs).set(logFields).where(eq(transportLogs.id, existingLog.id));
      } else {
        await tx.insert(transportLogs).values({ idMedicao: osId, ...logFields });
      }
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return { success: false, message: err.message, reason: err.reason };
    }
    logger.error("updateItemTransportStep failed", { osId, itemId, step, err });
    return { success: false, message: "Erro ao atualizar etapa de transporte" };
  }
}

// ─── Action: observações de transporte por vão ───────────────────────────────

const updateItemTransportNotesSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  observacoes: z.string().max(2000).nullable(),
});

export async function updateItemTransportNotesAction(
  raw: z.infer<typeof updateItemTransportNotesSchema>,
): Promise<UpdateTransportNotesResult> {
  const parsed = updateItemTransportNotesSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Requisição inválida. Recarregue a página e tente novamente.",
    };
  }

  try {
    await requireRole(["admin", "gerente", "motorista"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, observacoes } = parsed.data;
  const trimmedNotes = observacoes?.trim() || null;

  if (useMockData()) {
    const { mockRepository } = await import("@/lib/data/mock-repository");
    const result = mockRepository.updateItemTransportNotes(
      osId,
      itemId,
      trimmedNotes,
    );
    if (!result.success) return result;
    revalidateOSRoutes(osId);
    return { success: true };
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();
    const isLatePhase = isTransportOrLater(order.status);

    await db.transaction(async (tx) => {
      const [meas] = await tx
        .select({ items: measurements.items })
        .from(measurements)
        .where(eq(measurements.id, osId))
        .for("update")
        .limit(1);

      if (!meas) throw new WorkflowActionError("OS não encontrada");

      const items = (meas.items as MeasurementLineItem[]) ?? [];
      const cuttingSteps = effectiveCuttingSteps(
        aggregateCuttingStepsFromItems(items),
        isLatePhase,
      );

      if (!canOperateTransportModule(order.status, cuttingSteps)) {
        throw new WorkflowActionError(
          "Aguardando conclusão do corte para liberar transporte",
        );
      }

      const itemExists = items.some((item) => item.id === itemId);
      if (!itemExists) throw new WorkflowActionError("Vão não encontrado");

      const updatedItems = items.map((item) => {
        if (item.id !== itemId) return item;
        const prev = item.transportProgress ?? {
          perfilEstrutural: false,
          perfilTotal: false,
          acessorios: false,
          vidros: false,
        };
        return {
          ...item,
          transportProgress: {
            ...prev,
            observacoes: trimmedNotes ?? undefined,
          },
        };
      });

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return { success: false, message: err.message };
    }
    logger.error("updateItemTransportNotes failed", { osId, itemId, err });
    return { success: false, message: "Erro ao salvar observações" };
  }
}
