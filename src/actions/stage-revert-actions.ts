"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  installationLogs,
  measurements,
  statusHistory,
  transportLogs,
} from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import { authErrorMessage, AuthError } from "@/lib/auth/auth-error";
import { requireRole } from "@/lib/auth/require-role";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { reverseWorkEvent } from "@/lib/performance/scoring";
import {
  aggregateInstallationStepsFromItems,
  aggregateTransportStepsFromItems,
} from "@/lib/workflow/aggregates";
import { WorkflowActionError } from "@/lib/workflow/errors";
import { measurementTypePatchForEtapa } from "@/lib/workflow/measurement-actions";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  clearVaoProgressForPhase,
  getRevertablePhase,
  PHASE_LABEL,
  PHASE_REVERT_TARGET,
  PREVIOUS_PHASE_LABEL,
  vaoHasProgressForPhase,
  type RevertablePhase,
} from "@/lib/workflow/stage-revert";
import { buildVaoItemSubtitle, getVaoNumber } from "@/lib/measurement/vao-item-subtitle";
import { logger } from "@/lib/logger";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

async function requireStageRevertPermission() {
  return await requireRole(["gerente", "admin"]);
}

// ─── Action: listar vãos para o modal de "voltar etapa" ─────────────────────

export type StageRevertVao = {
  id: string;
  vaoNumber: number;
  label: string;
  hasProgress: boolean;
};

export type ListVaosForStageRevertResult =
  | {
      success: true;
      phase: RevertablePhase;
      phaseLabel: string;
      previousPhaseLabel: string;
      fromStatus: OsStatus;
      targetStatus: OsStatus;
      vaos: StageRevertVao[];
    }
  | { success: false; message: string };

export async function listVaosForStageRevertAction(
  osId: string,
): Promise<ListVaosForStageRevertResult> {
  try {
    await requireStageRevertPermission();
  } catch (err) {
    const message = authErrorMessage(err);
    if (message) return { success: false, message };
    if (err instanceof AuthError) return { success: false, message: err.message };
    throw err;
  }

  try {
    const db = getDb();
    const [meas] = await db
      .select({ etapa: measurements.etapa, items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!meas) return { success: false, message: "OS não encontrada" };

    const fromStatus = meas.etapa as OsStatus;
    const phase = getRevertablePhase(fromStatus);
    if (!phase) {
      return {
        success: false,
        message: "Não é possível voltar etapa a partir da fase atual.",
      };
    }

    const items = (meas.items as MeasurementLineItem[]) ?? [];
    const lookups = await listMeasurementLookups();

    const vaos: StageRevertVao[] = items.map((item, index) => {
      const subtitle = buildVaoItemSubtitle(item, index, lookups);
      return {
        id: item.id,
        vaoNumber: getVaoNumber(item, index),
        label: subtitle.dims ? `${subtitle.spec} — ${subtitle.dims}` : subtitle.spec,
        hasProgress: vaoHasProgressForPhase(item, phase),
      };
    });

    return {
      success: true,
      phase,
      phaseLabel: PHASE_LABEL[phase],
      previousPhaseLabel: PREVIOUS_PHASE_LABEL[phase],
      fromStatus,
      targetStatus: PHASE_REVERT_TARGET[phase],
      vaos,
    };
  } catch (error) {
    console.error("[listVaosForStageRevert]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao carregar vãos",
    };
  }
}

// ─── Action: voltar a OS uma fase, apagando o progresso dos vãos escolhidos ──

const revertSchema = z.object({
  osId: z.string().uuid(),
  itemIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um vão"),
});

export type RevertOSPhaseResult =
  | { success: true }
  | { success: false; message: string };

export async function revertOSPhaseForVaosAction(
  raw: z.infer<typeof revertSchema>,
): Promise<RevertOSPhaseResult> {
  const parsed = revertSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Requisição inválida";
    return { success: false, message: msg };
  }

  let session;
  try {
    session = await requireStageRevertPermission();
  } catch (err) {
    const message = authErrorMessage(err);
    if (message) return { success: false, message };
    if (err instanceof AuthError) return { success: false, message: err.message };
    throw err;
  }

  const { osId, itemIds } = parsed.data;

  try {
    const db = getDb();

    await db.transaction(async (tx) => {
      const [meas] = await tx
        .select({ etapa: measurements.etapa, items: measurements.items })
        .from(measurements)
        .where(eq(measurements.id, osId))
        .for("update")
        .limit(1);

      if (!meas) throw new WorkflowActionError("OS não encontrada");

      const fromStatus = meas.etapa as OsStatus;
      const phase = getRevertablePhase(fromStatus);
      if (!phase) {
        throw new WorkflowActionError(
          "Não é possível voltar etapa a partir da fase atual.",
        );
      }

      const targetStatus = PHASE_REVERT_TARGET[phase];
      const allItems = (meas.items as MeasurementLineItem[]) ?? [];
      const selected = new Set(itemIds);

      const allIds = new Set(allItems.map((item) => item.id));
      const missing = itemIds.filter((id) => !allIds.has(id));
      if (missing.length > 0) {
        throw new WorkflowActionError("Vão não encontrado nesta OS.");
      }

      const updatedItems = allItems.map((item) =>
        selected.has(item.id) ? clearVaoProgressForPhase(item, phase) : item,
      );

      await tx
        .update(measurements)
        .set({
          items: updatedItems,
          etapa: targetStatus,
          updatedAt: sql`NOW()`,
          ...measurementTypePatchForEtapa(targetStatus),
        })
        .where(eq(measurements.id, osId));

      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus,
        toStatus: targetStatus,
        changedById: session.userId,
        metadata: {
          source: "kanban_manual_revert_per_vao",
          phase,
          revertedItemIds: itemIds,
        },
      });

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.OS_STAGE_REVERTED,
        measurementId: osId,
        payload: { phase, fromStatus, toStatus: targetStatus, revertedItemIds: itemIds },
      });

      const eventTypeByPhase: Record<
        RevertablePhase,
        "corte_vao" | "transporte_vao" | "instalacao_vao"
      > = {
        plano_corte: "corte_vao",
        transporte: "transporte_vao",
        instalacao: "instalacao_vao",
      };
      const eventType = eventTypeByPhase[phase];
      for (const itemId of itemIds) {
        await reverseWorkEvent(tx, { measurementId: osId, itemId, eventType });
      }

      if (phase === "instalacao") {
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
          await tx
            .update(installationLogs)
            .set(logFields)
            .where(eq(installationLogs.id, existingLog.id));
        } else {
          await tx.insert(installationLogs).values({ idMedicao: osId, ...logFields });
        }
      }

      if (phase === "transporte") {
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
          await tx
            .update(transportLogs)
            .set(logFields)
            .where(eq(transportLogs.id, existingLog.id));
        } else {
          await tx.insert(transportLogs).values({ idMedicao: osId, ...logFields });
        }
      }
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    if (err instanceof WorkflowActionError) {
      return { success: false, message: err.message };
    }
    logger.error("revertOSPhaseForVaosAction failed", { osId, itemIds, err });
    return { success: false, message: "Erro ao voltar etapa da OS" };
  }
}
