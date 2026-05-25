"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import {
  statusHistory,
  measurements,
  cuttingPlans,
  transportLogs,
  installationLogs,
  type OsStatus,
} from "@/db/schema";
import {
  assertTransitionGuards,
  canTransition,
  TransitionValidationError,
} from "@/lib/workflow/status-machine";
import { getSession } from "@/lib/auth/session";
import { authErrorMessage, AuthError } from "@/lib/auth/auth-error";
import { requireRole } from "@/lib/auth/require-role";

const transitionInputSchema = z.object({
  osId: z.string().uuid(),
  toStatus: z.enum([
    "medicao_orcamento",
    "medicao_final",
    "cortes",
    "embalagem",
    "acessorios_plano",
    "transporte_perfil",
    "transporte_estrutural",
    "transporte_perfis_total",
    "transporte_acessorios",
    "transporte_levar_vidro",
    "instalacao_estrutural",
    "instalacao_vidros",
    "concluido",
    "revisao",
    // Legado
    "orcamento_enviado",
    "aprovado_cliente",
    "os_gerada",
    "em_corte",
    "corte_concluido",
    "em_transporte",
    "transporte_entregue",
    "instalacao_final",
  ]),
  reason: z.string().min(3).optional(),
  changedById: z.string().uuid().optional(),
});

export type TransitionResult =
  | { success: true; status: OsStatus }
  | { success: false; code: string; message: string };

async function loadTransitionContext(
  osId: string,
  db: Awaited<ReturnType<typeof import("@/db").getDb>>,
) {
  const [meas] = await db
    .select({
      type: measurements.type,
      status: measurements.status,
      items: measurements.items,
    })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  const hasItems =
    !!meas?.items && Array.isArray(meas.items) && meas.items.length > 0;
  const isMeasured = meas?.status === "medida" || hasItems;

  const [cut] = await db
    .select({
      corteFeito: cuttingPlans.corteFeito,
      embalagemFeita: cuttingPlans.embalagemFeita,
      acessoriosFeitos: cuttingPlans.acessoriosFeitos,
    })
    .from(cuttingPlans)
    .where(eq(cuttingPlans.idMedicao, osId))
    .limit(1);

  const [trans] = await db
    .select({ itemsChecked: transportLogs.itemsChecked })
    .from(transportLogs)
    .where(eq(transportLogs.idMedicao, osId))
    .limit(1);

  const [inst] = await db
    .select({
      photos: installationLogs.photos,
    })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const photos = inst?.photos;
  const hasBeforeAfter =
    !!photos &&
    Array.isArray(photos.before) &&
    photos.before.length > 0 &&
    Array.isArray(photos.after) &&
    photos.after.length > 0;

  return {
    hasFinalMeasurement: meas?.type === "final" && isMeasured,
    hasBudgetMeasurement: meas?.type === "orcamento" && isMeasured,
    cuttingSteps: {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
    },
    transportItemsChecked:
      (trans?.itemsChecked as Record<string, boolean> | null) ?? null,
    installationHasPhotos: hasBeforeAfter,
  };
}

/**
 * Exemplo de Server Action com validação de transição de status.
 * Uso: await transitionServiceOrderStatus({ osId, toStatus, reason })
 */
export async function transitionServiceOrderStatus(
  input: z.infer<typeof transitionInputSchema>,
): Promise<TransitionResult> {
  const parsed = transitionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.flatten().fieldErrors.toString(),
    };
  }

  const { osId, toStatus, reason, changedById } = parsed.data;

  if (toStatus === "revisao") {
    try {
      await requireRole(["gerente", "admin"]);
    } catch (err) {
      const message = authErrorMessage(err);
      if (message) {
        return {
          success: false,
          code: err instanceof AuthError ? err.code : "FORBIDDEN",
          message,
        };
      }
      throw err;
    }
  }

  if (useMockData()) {
    const result = mockRepository.transition(osId, toStatus, reason);
    if (result.success) {
      revalidatePath("/dashboard");
    }
    return result;
  }

  try {
    const { getDb } = await import("@/db");
    const db = getDb();
    const [order] = await db
      .select()
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!order) {
      return { success: false, code: "NOT_FOUND", message: "OS não encontrada." };
    }

    const fromStatus = order.etapa as OsStatus;

    if (fromStatus === "revisao") {
      try {
        await requireRole(["gerente", "admin"]);
      } catch (err) {
        const message = authErrorMessage(err);
        if (message) {
          return {
            success: false,
            code: err instanceof AuthError ? err.code : "FORBIDDEN",
            message,
          };
        }
        throw err;
      }
    }

    if (!canTransition(fromStatus, toStatus) && toStatus !== "revisao") {
      if (fromStatus !== "revisao") {
        return {
          success: false,
          code: "INVALID_TRANSITION",
          message: `Transição não permitida: ${fromStatus} → ${toStatus}`,
        };
      }
    }

    const ctxBase = await loadTransitionContext(osId, db);

    const ctx = {
      ...ctxBase,
      revisionFromStatus:
        toStatus === "revisao"
          ? fromStatus
          : fromStatus === "revisao"
            ? (order.revisionFromEtapa as OsStatus | null)
            : null,
    };

    if (toStatus === "revisao" && !reason) {
      return {
        success: false,
        code: "REVISION_REASON_REQUIRED",
        message: "Informe o motivo da revisão.",
      };
    }

    assertTransitionGuards(fromStatus, toStatus, ctx);

    const now = new Date();
    const updatePayload: Partial<typeof measurements.$inferInsert> = {
      etapa: toStatus,
      updatedAt: now,
    };

    if (toStatus === "revisao") {
      updatePayload.revisionReason = reason;
      updatePayload.revisionFromEtapa = fromStatus;
    } else if (fromStatus === "revisao") {
      updatePayload.revisionReason = null;
      updatePayload.revisionFromEtapa = null;
    }

    const session = await getSession();

    await db.transaction(async (tx) => {
      await tx
        .update(measurements)
        .set(updatePayload)
        .where(eq(measurements.id, osId));

      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus,
        toStatus,
        reason: reason ?? null,
        changedById: changedById ?? session?.userId ?? null,
        metadata:
          toStatus === "revisao"
            ? { revisionFrom: fromStatus }
            : undefined,
      });
    });

    revalidatePath("/dashboard");

    return { success: true, status: toStatus };
  } catch (err) {
    if (err instanceof TransitionValidationError) {
      return { success: false, code: err.code, message: err.message };
    }
    console.error("[transitionServiceOrderStatus]", err);
    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao atualizar status.",
    };
  }
}

/** Gera número único consultando a tabela measurements */
export async function generateMeasurementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { getDb } = await import("@/db");
  const db = getDb();

  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0");
    const number = `OS-${year}-${seq}`;

    const [existing] = await db
      .select({ id: measurements.id })
      .from(measurements)
      .where(eq(measurements.number, number))
      .limit(1);

    if (!existing) return number;
  }

  const fallback = `OS-${year}-${Date.now().toString().slice(-5)}`;
  return fallback;
}

/** @deprecated Use generateMeasurementNumber — alias mantido durante migração */
export const generateServiceOrderNumber = generateMeasurementNumber;
