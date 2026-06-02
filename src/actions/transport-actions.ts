"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { transportLogs, cuttingPlans, vehicles } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
import { useMockData } from "@/lib/data/config";
import { vehicleMockStore } from "@/lib/data/admin-mock-store";
import {
  canOperateTransportModule,
  getTransportGates,
} from "@/lib/transport-gates";

const updateStepSchema = z.object({
  osId: z.string().uuid(),
  step: z.enum([
    "levarPerfilEstrutural",
    "levarPerfilTotal",
    "levarAcessorios",
    "levarVidros",
    "transporteConcluido",
  ]),
  done: z.boolean(),
});

const assignVehicleSchema = z.object({
  osId: z.string().uuid(),
  vehicleId: z.string().uuid(),
});

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

    const db = getDb();

    const [cutting] = await db
      .select({
        corteFeito: cuttingPlans.corteFeito,
        embalagemFeita: cuttingPlans.embalagemFeita,
        acessoriosFeitos: cuttingPlans.acessoriosFeitos,
        vidrosFeitos: cuttingPlans.vidrosFeitos,
      })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1);

    const cuttingSteps = cutting ?? {
      corteFeito:
        order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
      embalagemFeita:
        order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
      acessoriosFeitos:
        order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
      vidrosFeitos:
        order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
    };

    if (!canOperateTransportModule(order.status, cuttingSteps)) {
      return {
        success: false,
        message: "Aguardando conclusão do corte para liberar transporte",
      };
    }

    const [transport] = await db
      .select({
        levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
      })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    if (transport?.levarPerfilEstrutural) {
      return {
        success: false,
        message: "Não é possível alterar o veículo após iniciar a entrega",
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
          message:
            err instanceof Error ? err.message : "Veículo indisponível",
        };
      }
      revalidateOSRoutes(osId);
      return { success: true };
    }

    const [vehicle] = await db
      .select({ id: vehicles.id, active: vehicles.active })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.active, true)))
      .limit(1);

    if (!vehicle) {
      return { success: false, message: "Veículo não encontrado ou inativo" };
    }

    const { isVehicleInUseByOtherOsDb, assignVehicleToTransportDb } =
      await import("@/lib/data/vehicles-db");

    if (await isVehicleInUseByOtherOsDb(vehicleId, osId)) {
      return {
        success: false,
        message: "Este veículo já está em uso em outra OS",
      };
    }

    await assignVehicleToTransportDb(osId, vehicleId, session.userId);
    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[assignVehicleToTransport]", err);
    return { success: false, message: "Erro ao atribuir veículo" };
  }
}

export async function updateTransportStepAction(
  raw: z.infer<typeof updateStepSchema>,
): Promise<UpdateTransportStepResult> {
  const parsed = updateStepSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[updateTransportStepAction] validação falhou", parsed.error.flatten());
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  try {
    await requireRole(["admin", "gerente", "motorista"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, step, done } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    const [cutting] = await db
      .select({
        corteFeito: cuttingPlans.corteFeito,
        embalagemFeita: cuttingPlans.embalagemFeita,
        acessoriosFeitos: cuttingPlans.acessoriosFeitos,
        vidrosFeitos: cuttingPlans.vidrosFeitos,
      })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1);

    const cuttingSteps = cutting ?? {
      corteFeito: order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
      embalagemFeita: order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
      acessoriosFeitos: order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
      vidrosFeitos: order.status.startsWith("transporte_") ||
        order.status.startsWith("instalacao") ||
        order.status === "concluido",
    };

    if (!canOperateTransportModule(order.status, cuttingSteps)) {
      return {
        success: false,
        message: "Aguardando conclusão do corte para liberar transporte",
      };
    }

    const [transport] = await db
      .select({
        vehicleId: transportLogs.vehicleId,
        levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
        levarPerfilTotal: transportLogs.levarPerfilTotal,
        levarAcessorios: transportLogs.levarAcessorios,
        levarVidros: transportLogs.levarVidros,
        transporteConcluido: transportLogs.transporteConcluido,
      })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    const transportSteps = transport ?? {
      levarPerfilEstrutural: false,
      levarPerfilTotal: false,
      levarAcessorios: false,
      levarVidros: false,
      transporteConcluido: false,
    };

    if (done && step === "levarPerfilEstrutural" && !transport?.vehicleId) {
      return {
        success: false,
        message: "Selecione o veículo antes de iniciar a entrega",
        reason: "vehicle_required",
      };
    }

    if (done) {
      const gates = getTransportGates(cuttingSteps, transportSteps, {
        hasVehicle: Boolean(transport?.vehicleId),
      });
      const gate = gates[step];
      if (!gate.unlocked) {
        return {
          success: false,
          message: gate.lockedReason ?? "Etapa ainda bloqueada",
          reason: "gate_locked",
        };
      }
    }

    const fieldMap = {
      levarPerfilEstrutural: { levarPerfilEstrutural: done },
      levarPerfilTotal: { levarPerfilTotal: done },
      levarAcessorios: { levarAcessorios: done },
      levarVidros: { levarVidros: done },
      transporteConcluido: { transporteConcluido: done },
    } as const;

    const [existing] = await db
      .select({ id: transportLogs.id })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    if (existing) {
      await db
        .update(transportLogs)
        .set(fieldMap[step])
        .where(eq(transportLogs.id, existing.id));
    } else {
      await db.insert(transportLogs).values({
        idMedicao: osId,
        ...fieldMap[step],
      });
    }

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[updateTransportStep]", err);
    return { success: false, message: "Erro ao atualizar etapa" };
  }
}
