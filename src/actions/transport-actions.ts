"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { transportLogs, vehicles, measurements, users } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
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
import { recordVaoStepCompletion } from "@/lib/performance/scoring";

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

export type AssignDriverToVaoResult =
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

// ─── Action: atribuir veículo por vão ──────────────────────────────────────

const assignVehicleToVaoSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  vehicleId: z.string().uuid(),
});

export async function assignVehicleToVaoAction(
  raw: z.infer<typeof assignVehicleToVaoSchema>,
): Promise<AssignVehicleToTransportResult> {
  const parsed = assignVehicleToVaoSchema.safeParse(raw);
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

  const { osId, itemId, vehicleId } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();
    const [vehicle] = await db
      .select({ id: vehicles.id, active: vehicles.active })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.active, true)))
      .limit(1);

    if (!vehicle) {
      return { success: false, message: "Veículo não encontrado ou inativo" };
    }

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
            vehicleId,
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
    console.error("[assignVehicleToVao]", err);
    return { success: false, message: "Erro ao atribuir veículo" };
  }
}

/** @deprecated Use assignVehicleToVaoAction — veículo agora é por vão */
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

      const item = items.find((i) => i.id === itemId);
      if (!item) throw new WorkflowActionError("Vão não encontrado");

      // Verifica veículo atribuído ao vão
      const itemVehicleId = item.transportProgress?.vehicleId ?? null;
      const hasVehicle = Boolean(itemVehicleId);

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

      // Pontuação: transporte_vao ao marcar/desmarcar step=vidros (último step)
      if (step === "vidros") {
        const updatedItem = updatedItems.find((i) => i.id === itemId);
        await recordVaoStepCompletion(tx, {
          userId: updatedItem?.transportProgress?.driverId,
          measurementId: osId,
          itemId,
          eventType: "transporte_vao",
          idTipoEnvidracamento: updatedItem?.idTipoEnvidracamento,
          done,
        });
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

// ─── Action: atribuir motorista por vão ──────────────────────────────────────

const assignDriverToVaoSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  driverId: z.string().uuid().nullable(),
  scheduledTransportDate: z.string().nullable(),
});

export async function assignDriverToVaoAction(
  raw: z.infer<typeof assignDriverToVaoSchema>,
): Promise<AssignDriverToVaoResult> {
  const parsed = assignDriverToVaoSchema.safeParse(raw);
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

  const { osId, itemId, driverId, scheduledTransportDate } = parsed.data;

  if (scheduledTransportDate) {
    const d = new Date(scheduledTransportDate);
    if (isNaN(d.getTime())) return { success: false, message: "Data inválida" };
  }

  if (driverId) {
    const db = getDb();
    const [driver] = await db
      .select({ id: users.id, active: users.active, roles: users.roles })
      .from(users)
      .where(and(eq(users.id, driverId), eq(users.active, true)))
      .limit(1);

    if (!driver || !driver.roles.includes("motorista")) {
      return { success: false, message: "Motorista não encontrado ou inativo" };
    }
  }

  try {
    const db = getDb();
    const [orderRow] = await db
      .select({ etapa: measurements.etapa })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);
    if (!orderRow) return { success: false, message: "OS não encontrada" };

    const isLatePhase = isTransportOrLater(orderRow.etapa);

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

      if (!canOperateTransportModule(orderRow.etapa, cuttingSteps)) {
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
            driverId: driverId ?? null,
            scheduledTransportDate: scheduledTransportDate ?? null,
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
    logger.error("assignDriverToVaoAction failed", { osId, itemId, err });
    return { success: false, message: "Erro ao atribuir motorista ao vão" };
  }
}
