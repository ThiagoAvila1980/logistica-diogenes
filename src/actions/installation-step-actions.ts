"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { installationLogs, measurements } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import { aggregateCuttingStepsFromItems } from "@/lib/data/cutting-detail";
import { aggregateInstallationStepsFromItems } from "@/lib/data/installation-detail";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export type UpdateInstallationStepResult =
  | { success: true }
  | { success: false; message: string; reason?: "gate_locked" };

// ─── Action: atualizar etapa de instalação por vão ───────────────────────────

const updateItemInstallationStepSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  step: z.enum(["estrutural", "vidros"]),
  done: z.boolean(),
});

export async function updateItemInstallationStepAction(
  raw: z.infer<typeof updateItemInstallationStepSchema>,
): Promise<UpdateInstallationStepResult> {
  const parsed = updateItemInstallationStepSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[updateItemInstallationStepAction] validação falhou", parsed.error.flatten());
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  try {
    await requireRole(["admin", "gerente", "instalador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, step, done } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    const [meas] = await db
      .select({ items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!meas) return { success: false, message: "OS não encontrada" };

    const items = (meas.items as MeasurementLineItem[]) ?? [];
    const cuttingAggregate = aggregateCuttingStepsFromItems(items);

    const isLatePhase =
      order.status.startsWith("instalacao") || order.status === "concluido";

    const cuttingSteps = {
      corteFeito: cuttingAggregate.corteFeito || isLatePhase,
      embalagemFeita: cuttingAggregate.embalagemFeita || isLatePhase,
      acessoriosFeitos: cuttingAggregate.acessoriosFeitos || isLatePhase,
      vidrosFeitos: cuttingAggregate.vidrosFeitos || isLatePhase,
    };

    if (!canOperateInstallationModule(order.status, cuttingSteps)) {
      return { success: false, message: "Aguardando conclusão do corte para liberar instalação" };
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) return { success: false, message: "Vão não encontrado" };

    // Verifica gate por vão ao marcar como feito
    if (done) {
      const cut = item.cuttingProgress ?? { corte: false, embalagem: false, acessorios: false, vidros: false };
      const trans = item.transportProgress ?? { perfilEstrutural: false, perfilTotal: false, acessorios: false, vidros: false };

      if (step === "estrutural") {
        const estruturalOk = cut.corte || isLatePhase;
        if (!estruturalOk) {
          return {
            success: false,
            message: "Aguardando corte deste vão ser concluído",
            reason: "gate_locked",
          };
        }
      }

      if (step === "vidros") {
        const vidrosOk =
          cut.vidros || trans.vidros || cut.acessorios || trans.acessorios || isLatePhase;
        if (!vidrosOk) {
          return {
            success: false,
            message: "Aguardando vidros ou acessórios deste vão serem entregues",
            reason: "gate_locked",
          };
        }
      }
    }

    // Atualiza o item no JSONB
    const updatedItems = items.map((i) => {
      if (i.id !== itemId) return i;
      const prev = i.installationProgress ?? { estrutural: false, vidros: false };
      return { ...i, installationProgress: { ...prev, [step]: done } };
    });

    await db
      .update(measurements)
      .set({ items: updatedItems, updatedAt: new Date() })
      .where(eq(measurements.id, osId));

    // Sincroniza o aggregate no installation_logs
    const newAggregate = aggregateInstallationStepsFromItems(updatedItems);

    const [existingLog] = await db
      .select({ id: installationLogs.id })
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, osId))
      .limit(1);

    const logFields = {
      instalacaoEstruturalFeita: newAggregate.instalacaoEstruturalFeita,
      instalacaoVidrosFeita: newAggregate.instalacaoVidrosFeita,
    };

    if (existingLog) {
      await db.update(installationLogs).set(logFields).where(eq(installationLogs.id, existingLog.id));
    } else {
      await db.insert(installationLogs).values({ idMedicao: osId, ...logFields });
    }

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[updateItemInstallationStep]", err);
    return { success: false, message: "Erro ao atualizar etapa de instalação" };
  }
}
