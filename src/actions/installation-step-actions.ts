"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { installationLogs, transportLogs, cuttingPlans } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
import {
  canOperateInstallationModule,
  getInstallationGates,
} from "@/lib/transport-gates";

const updateStepSchema = z.object({
  osId: z.string().uuid(),
  step: z.enum(["instalacaoEstruturalFeita", "instalacaoVidrosFeita"]),
  done: z.boolean(),
});

export type UpdateInstallationStepResult =
  | { success: true }
  | { success: false; message: string; reason?: "gate_locked" };

export async function updateInstallationStepAction(
  raw: z.infer<typeof updateStepSchema>,
): Promise<UpdateInstallationStepResult> {
  const parsed = updateStepSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Dados inválidos" };

  try {
    await requireRole(["admin", "gerente", "instalador"]);
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
      corteFeito: order.status.startsWith("instalacao") || order.status === "concluido",
      embalagemFeita: order.status.startsWith("instalacao") || order.status === "concluido",
      acessoriosFeitos: order.status.startsWith("instalacao") || order.status === "concluido",
    };

    if (!canOperateInstallationModule(order.status, cuttingSteps)) {
      return {
        success: false,
        message: "Aguardando conclusão do corte para liberar instalação",
      };
    }

    // Busca transport steps para calcular os gates
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

    // Verifica gate apenas ao marcar como feito
    if (done) {
      const gates = getInstallationGates(transportSteps, cuttingSteps);
      const gateKey =
        step === "instalacaoEstruturalFeita"
          ? "instalacaoEstrutural"
          : "instalacaoVidros";
      const gate = gates[gateKey];
      if (!gate.unlocked) {
        return {
          success: false,
          message: gate.lockedReason ?? "Etapa ainda bloqueada",
          reason: "gate_locked",
        };
      }
    }

    const fieldMap = {
      instalacaoEstruturalFeita: { instalacaoEstruturalFeita: done },
      instalacaoVidrosFeita: { instalacaoVidrosFeita: done },
    } as const;

    const [existing] = await db
      .select({ id: installationLogs.id })
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, osId))
      .limit(1);

    if (existing) {
      await db
        .update(installationLogs)
        .set(fieldMap[step])
        .where(eq(installationLogs.id, existing.id));
    } else {
      await db.insert(installationLogs).values({
        idMedicao: osId,
        ...fieldMap[step],
      });
    }

    revalidatePath(`/installation/${osId}`);
    revalidatePath("/installation");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updateInstallationStep]", err);
    return { success: false, message: "Erro ao atualizar etapa" };
  }
}
