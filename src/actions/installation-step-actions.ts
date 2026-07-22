"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS, stepCheckAction } from "@/lib/audit/actions";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import { installationLogs, measurements } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import {
  aggregateCuttingStepsFromItems,
  aggregateInstallationStepsFromItems,
  effectiveCuttingSteps,
  isInstallationOrLater,
  isVaoInstallationStepsComplete,
} from "@/lib/workflow/aggregates";
import { WorkflowActionError } from "@/lib/workflow/errors";
import { logger } from "@/lib/logger";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { recordVaoStepCompletion } from "@/lib/performance/scoring";

export type UpdateInstallationStepResult =
  | { success: true }
  | { success: false; message: string; reason?: "gate_locked" };

export type CompleteInstallationVaoResult =
  | { success: true }
  | { success: false; message: string };

// ─── Action: atualizar etapa de instalação por vão ───────────────────────────

const updateItemInstallationStepSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  step: z.enum(["estrutural", "vidros", "acabamento"]),
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

  let session;
  try {
    session = await requireRole(["admin", "gerente", "instalador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, step, done } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();
    const isLatePhase = isInstallationOrLater(order.status);

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

      if (!canOperateInstallationModule(order.status, cuttingSteps)) {
        throw new WorkflowActionError(
          "Aguardando conclusão do corte para liberar instalação",
        );
      }

      const item = items.find((i) => i.id === itemId);
      if (!item) throw new WorkflowActionError("Vão não encontrado");

      // Verifica gate por vão ao marcar como feito
      if (done) {
        const cut = item.cuttingProgress ?? { corte: false, embalagem: false, acessorios: false, vidros: false };
        const trans = item.transportProgress ?? { perfilEstrutural: false, perfilTotal: false, acessorios: false, vidros: false };

        if (step === "estrutural") {
          const estruturalOk = cut.corte || isLatePhase;
          if (!estruturalOk) {
            throw new WorkflowActionError(
              "Aguardando corte deste vão ser concluído",
              "gate_locked",
            );
          }
        }

        if (step === "vidros") {
          const vidrosOk = trans.vidros || isLatePhase;
          if (!vidrosOk) {
            throw new WorkflowActionError(
              "Aguardando entrega dos vidros pelo motorista",
              "gate_locked",
            );
          }
        }

        if (step === "acabamento") {
          const inst = item.installationProgress ?? { estrutural: false, vidros: false, acabamento: false };
          const acabamentoOk = inst.vidros || isLatePhase;
          if (!acabamentoOk) {
            throw new WorkflowActionError(
              "Aguardando instalação dos vidros deste vão",
              "gate_locked",
            );
          }
        }
      }

      // Atualiza o item no JSONB
      let wasConcluded = false;
      const updatedItems = items.map((i) => {
        if (i.id !== itemId) return i;
        const prev = i.installationProgress ?? { estrutural: false, vidros: false, acabamento: false };
        wasConcluded = prev.concluido === true;
        const next = { ...prev, [step]: done };
        if (!done) {
          next.concluido = false;
        }
        return { ...i, installationProgress: next };
      });

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));

      // Sincroniza o aggregate no installation_logs
      const newAggregate = aggregateInstallationStepsFromItems(updatedItems);

      const [existingLog] = await tx
        .select({ id: installationLogs.id })
        .from(installationLogs)
        .where(eq(installationLogs.idMedicao, osId))
        .limit(1);

      const logFields = {
        instalacaoEstruturalFeita: newAggregate.instalacaoEstruturalFeita,
        instalacaoVidrosFeita: newAggregate.instalacaoVidrosFeita,
        instalacaoAcabamentoFeito: newAggregate.instalacaoAcabamentoFeito,
      };

      if (existingLog) {
        await tx.update(installationLogs).set(logFields).where(eq(installationLogs.id, existingLog.id));
      } else {
        await tx.insert(installationLogs).values({ idMedicao: osId, ...logFields });
      }

      // Reverte pontuação se o vão estava confirmado e alguma etapa foi desmarcada
      if (wasConcluded && !done) {
        const updatedItem = updatedItems.find((i) => i.id === itemId);
        await recordVaoStepCompletion(tx, {
          userId: updatedItem?.installationProgress?.installerId,
          measurementId: osId,
          itemId,
          eventType: "instalacao_vao",
          idTipoEnvidracamento: updatedItem?.idTipoEnvidracamento,
          done: false,
        });
      }

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: stepCheckAction("installation", done),
        measurementId: osId,
        itemId,
        payload: { step, done },
      });
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return {
        success: false,
        message: err.message,
        reason: err.reason === "gate_locked" ? "gate_locked" : undefined,
      };
    }
    logger.error("updateItemInstallationStep failed", { osId, itemId, step, err });
    return { success: false, message: "Erro ao atualizar etapa de instalação" };
  }
}

// ─── Action: confirmar conclusão de vão na instalação ────────────────────────

const completeInstallationVaoSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
});

export async function completeInstallationVaoAction(
  raw: z.infer<typeof completeInstallationVaoSchema>,
): Promise<CompleteInstallationVaoResult> {
  const parsed = completeInstallationVaoSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente", "instalador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();
    const isLatePhase = isInstallationOrLater(order.status);

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

      if (!canOperateInstallationModule(order.status, cuttingSteps)) {
        throw new WorkflowActionError(
          "Aguardando conclusão do corte para liberar instalação",
        );
      }

      const item = items.find((i) => i.id === itemId);
      if (!item) throw new WorkflowActionError("Vão não encontrado");

      if (!isVaoInstallationStepsComplete(item)) {
        throw new WorkflowActionError(
          "Conclua todas as fases do vão antes de confirmar",
        );
      }

      if (item.installationProgress?.concluido === true) {
        throw new WorkflowActionError("Este vão já foi concluído");
      }

      const updatedItems = items.map((i) => {
        if (i.id !== itemId) return i;
        const prev = i.installationProgress ?? { estrutural: false, vidros: false, acabamento: false };
        return {
          ...i,
          installationProgress: {
            ...prev,
            concluido: true,
            // Garante atribuição ao quem concluiu (filtro de /concluded).
            installerId: prev.installerId ?? session.userId,
          },
        };
      });

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));

      const updatedItem = updatedItems.find((i) => i.id === itemId);
      await recordVaoStepCompletion(tx, {
        userId: updatedItem?.installationProgress?.installerId,
        measurementId: osId,
        itemId,
        eventType: "instalacao_vao",
        idTipoEnvidracamento: updatedItem?.idTipoEnvidracamento,
        done: true,
      });

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.INSTALLATION_VAO_COMPLETED,
        measurementId: osId,
        itemId,
        payload: { concluido: true },
      });
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return { success: false, message: err.message };
    }
    logger.error("completeInstallationVao failed", { osId, itemId, err });
    return { success: false, message: "Erro ao concluir vão" };
  }
}
