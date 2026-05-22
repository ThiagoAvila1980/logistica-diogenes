"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { eqMeasurementType } from "@/lib/data/order-measurement-join";
import {
  serviceOrders,
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
  isAccessoriesComplete,
  isPackagingComplete,
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
  const [finalMeas] = await db
    .select({ id: measurements.id })
    .from(measurements)
    .where(
      and(eq(measurements.osId, osId), eqMeasurementType("final")),
    )
    .limit(1);

  const [initialMeas] = await db
    .select({ id: measurements.id })
    .from(measurements)
    .where(
      and(eq(measurements.osId, osId), eqMeasurementType("orcamento")),
    )
    .limit(1);

  const [cut] = await db
    .select({
      status: cuttingPlans.status,
      packaging: cuttingPlans.packaging,
      accessories: cuttingPlans.accessories,
    })
    .from(cuttingPlans)
    .where(eq(cuttingPlans.osId, osId))
    .limit(1);

  const [trans] = await db
    .select({ itemsChecked: transportLogs.itemsChecked })
    .from(transportLogs)
    .where(eq(transportLogs.osId, osId))
    .limit(1);

  const [inst] = await db
    .select({
      photos: installationLogs.photos,
    })
    .from(installationLogs)
    .where(eq(installationLogs.osId, osId))
    .limit(1);

  const photos = inst?.photos;
  const hasBeforeAfter =
    !!photos &&
    Array.isArray(photos.before) &&
    photos.before.length > 0 &&
    Array.isArray(photos.after) &&
    photos.after.length > 0;

  return {
    hasFinalMeasurement: !!finalMeas,
    hasBudgetMeasurement: !!initialMeas,
    cuttingPlanStatus: cut?.status ?? null,
    packagingComplete: isPackagingComplete(
      cut?.packaging as Record<string, boolean> | undefined,
    ),
    accessoriesComplete: isAccessoriesComplete(
      cut?.accessories as Record<string, number> | undefined,
    ),
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
      revalidatePath(`/dashboard/${osId}`);
    }
    return result;
  }

  try {
    const { getDb } = await import("@/db");
    const db = getDb();
    const [order] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, osId))
      .limit(1);

    if (!order) {
      return { success: false, code: "NOT_FOUND", message: "OS não encontrada." };
    }

    const fromStatus = order.status as OsStatus;
    const measurementFlow = order.measurementFlow;

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

    if (!canTransition(fromStatus, toStatus, measurementFlow) && toStatus !== "revisao") {
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
      measurementFlow,
      revisionFromStatus:
        toStatus === "revisao"
          ? fromStatus
          : fromStatus === "revisao"
            ? (order.revisionFromStatus as OsStatus | null)
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
    const updatePayload: Partial<typeof serviceOrders.$inferInsert> = {
      status: toStatus,
      updatedAt: now,
    };

    if (toStatus === "revisao") {
      updatePayload.revisionReason = reason;
      updatePayload.revisionFromStatus = fromStatus;
    } else if (fromStatus === "revisao") {
      updatePayload.revisionReason = null;
      updatePayload.revisionFromStatus = null;
    }

    const session = await getSession();

    await db.transaction(async (tx) => {
      await tx
        .update(serviceOrders)
        .set(updatePayload)
        .where(eq(serviceOrders.id, osId));

      await tx.insert(statusHistory).values({
        osId,
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
    revalidatePath(`/dashboard/${osId}`);

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

/** Gera número único de OS ao aprovar orçamento (exemplo auxiliar) */
export async function generateServiceOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `OS-${year}-${seq}`;
}
