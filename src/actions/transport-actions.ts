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
import { aggregateCuttingStepsFromItems } from "@/lib/data/cutting-detail";
import { aggregateTransportStepsFromItems } from "@/lib/data/transport-detail";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpdateTransportStepResult =
  | { success: true }
  | {
      success: false;
      message: string;
      reason?: "gate_locked" | "vehicle_required";
    };

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
    const cuttingAggregate = aggregateCuttingStepsFromItems(items);

    const isLatePhase =
      order.status.startsWith("transporte_") ||
      order.status.startsWith("instalacao") ||
      order.status === "concluido";

    const cuttingSteps = {
      corteFeito: cuttingAggregate.corteFeito || isLatePhase,
      embalagemFeita: cuttingAggregate.embalagemFeita || isLatePhase,
      acessoriosFeitos: cuttingAggregate.acessoriosFeitos || isLatePhase,
      vidrosFeitos: cuttingAggregate.vidrosFeitos || isLatePhase,
    };

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

    const items = await loadMeasurementItems(osId);
    const cuttingAggregate = aggregateCuttingStepsFromItems(items);

    const isLatePhase =
      order.status.startsWith("transporte_") ||
      order.status.startsWith("instalacao") ||
      order.status === "concluido";

    const cuttingSteps = {
      corteFeito: cuttingAggregate.corteFeito || isLatePhase,
      embalagemFeita: cuttingAggregate.embalagemFeita || isLatePhase,
      acessoriosFeitos: cuttingAggregate.acessoriosFeitos || isLatePhase,
      vidrosFeitos: cuttingAggregate.vidrosFeitos || isLatePhase,
    };

    if (!canOperateTransportModule(order.status, cuttingSteps)) {
      return { success: false, message: "Aguardando conclusão do corte para liberar transporte" };
    }

    // Busca o veículo atribuído
    const [trans] = await db
      .select({ vehicleId: transportLogs.vehicleId })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    const hasVehicle = Boolean(trans?.vehicleId);

    // Verifica gate por vão
    const item = items.find((i) => i.id === itemId);
    if (!item) return { success: false, message: "Vão não encontrado" };

    if (done) {
      const cutProg = item.cuttingProgress ?? {
        corte: false, embalagem: false, acessorios: false, vidros: false,
      };

      if (step === "perfilEstrutural") {
        if (!cutProg.corte && !isLatePhase) {
          return { success: false, message: "Aguardando corte deste vão ser concluído", reason: "gate_locked" };
        }
        if (!hasVehicle) {
          return { success: false, message: "Selecione o veículo antes de iniciar a entrega", reason: "vehicle_required" };
        }
      }
      if (step === "perfilTotal" && !cutProg.embalagem && !isLatePhase) {
        return { success: false, message: "Aguardando embalagem deste vão ser concluída", reason: "gate_locked" };
      }
      if (step === "acessorios" && !cutProg.acessorios && !isLatePhase) {
        return { success: false, message: "Aguardando acessórios deste vão serem separados", reason: "gate_locked" };
      }
      if (step === "vidros" && !cutProg.vidros && !isLatePhase) {
        return { success: false, message: "Aguardando vidros deste vão serem separados", reason: "gate_locked" };
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

    await db
      .update(measurements)
      .set({ items: updatedItems, updatedAt: new Date() })
      .where(eq(measurements.id, osId));

    // Atualiza o aggregate no transport_logs para manter compatibilidade com installation gates
    const newAggregate = aggregateTransportStepsFromItems(updatedItems);
    const [existingLog] = await db
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
      await db.update(transportLogs).set(logFields).where(eq(transportLogs.id, existingLog.id));
    } else {
      await db.insert(transportLogs).values({ idMedicao: osId, ...logFields });
    }

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[updateItemTransportStep]", err);
    return { success: false, message: "Erro ao atualizar etapa de transporte" };
  }
}
