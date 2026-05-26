"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { transportLogs, cuttingPlans } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
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
    "transporteConcluido",
  ]),
  done: z.boolean(),
});

export type UpdateTransportStepResult =
  | { success: true }
  | { success: false; message: string; reason?: "gate_locked" };

export async function updateTransportStepAction(
  raw: z.infer<typeof updateStepSchema>,
): Promise<UpdateTransportStepResult> {
  const parsed = updateStepSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Dados inválidos" };

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
        levarPerfilTotal: transportLogs.levarPerfilTotal,
        levarAcessorios: transportLogs.levarAcessorios,
        transporteConcluido: transportLogs.transporteConcluido,
      })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    const transportSteps = transport ?? {
      levarPerfilEstrutural: false,
      levarPerfilTotal: false,
      levarAcessorios: false,
      transporteConcluido: false,
    };

    if (done) {
      const gates = getTransportGates(cuttingSteps, transportSteps);
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

    revalidatePath(`/logistics/${osId}`);
    revalidatePath("/logistics");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updateTransportStep]", err);
    return { success: false, message: "Erro ao atualizar etapa" };
  }
}
