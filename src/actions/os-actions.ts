"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  measurements,
  cuttingPlans,
  transportLogs,
  installationLogs,
  statusHistory,
  type OsStatus,
} from "@/db/schema";
import {
  ADVANCE_TARGET_STATUSES,
  isAllowedAdvance,
  type AdvanceTargetStatus,
} from "@/lib/workflow/advance-flow";
import {
  validateAdvancePayload,
  type AdvanceStepContext,
} from "@/lib/workflow/validate-advance-payload";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import type {
  Dimensions,
  InstallationPhotos,
} from "@/lib/workflow/schemas";
import {
  loadClientNotificationContext,
  isNotifyStatus,
} from "@/lib/notifications/order-context";
import {
  notifyClientOnStatusChange,
  formatNotificationSummary,
} from "@/lib/notifications/notify-client";
import { getSession } from "@/lib/auth/session";
import { authErrorMessage, AuthError } from "@/lib/auth/auth-error";
import { requireRole } from "@/lib/auth/require-role";
import { getAdvanceAllowedRoles } from "@/lib/auth/permissions";
import { getServiceOrderById } from "@/lib/data/orders";

const advanceSchema = z.object({
  osId: z.string().uuid(),
  nextStatus: z.enum(ADVANCE_TARGET_STATUSES),
  payload: z.record(z.unknown()).optional(),
});

export type AdvanceOSInput = z.infer<typeof advanceSchema>;

export type AdvanceOSResult =
  | {
      success: true;
      message: string;
      newStatus: AdvanceTargetStatus;
      notificationSummary?: string;
    }
  | { success: false; message: string };

async function loadStepContext(
  db: ReturnType<typeof getDb>,
  osId: string,
): Promise<AdvanceStepContext> {
  const [meas] = await db
    .select({
      status: measurements.status,
      items: measurements.items,
      type: measurements.type,
    })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  const hasItems =
    !!meas?.items && Array.isArray(meas.items) && meas.items.length > 0;
  const hasFinalMeasurement =
    meas?.type === "final" && (meas.status === "medida" || hasItems);

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

  return {
    hasFinalMeasurement,
    cuttingPlan: cut
      ? {
          corteFeito: cut.corteFeito,
          embalagemFeita: cut.embalagemFeita,
          acessoriosFeitos: cut.acessoriosFeitos,
        }
      : null,
    transportItemsChecked: trans?.itemsChecked ?? null,
    installation: inst ?? null,
  };
}

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

async function persistStepData(
  tx: DbTransaction,
  osId: string,
  nextStatus: AdvanceTargetStatus,
  payload: Record<string, unknown>,
) {
  if (nextStatus === "medicao_final") {
    await tx
      .update(measurements)
      .set({
        dimensions: (payload.dimensions as Dimensions) ?? {},
        photos: (payload.photos as string[]) ?? [],
        notes: (payload.notes as string) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(measurements.id, osId));
  }

  if (
    nextStatus === "cortes" ||
    nextStatus === "embalagem" ||
    nextStatus === "acessorios_plano"
  ) {
    const [existing] = await tx
      .select({ id: cuttingPlans.id })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1);

    const values = {
      notes: (payload.notes as string) ?? null,
      operatorId: (payload.operatorId as string) ?? null,
    };

    if (existing) {
      await tx
        .update(cuttingPlans)
        .set(values)
        .where(eq(cuttingPlans.id, existing.id));
    } else {
      await tx.insert(cuttingPlans).values({ idMedicao: osId, ...values });
    }
  }

  if (nextStatus === "transporte_perfil") {
    const vehicleId = payload.vehicleId as string | undefined;
    if (!vehicleId) return;

    const { resolveVehiclePlate } = await import("@/lib/data/vehicles");
    const plate = await resolveVehiclePlate(vehicleId);
    const session = await getSession();

    const [existing] = await tx
      .select({ id: transportLogs.id })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    const values = {
      vehicleId,
      vehiclePlate: plate,
      driverId: session?.userId ?? null,
      status: "em_transito" as const,
      departureAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      await tx
        .update(transportLogs)
        .set(values)
        .where(eq(transportLogs.id, existing.id));
    } else {
      await tx.insert(transportLogs).values({ idMedicao: osId, ...values });
    }
  }

  if (
    nextStatus === "transporte_estrutural" ||
    nextStatus === "transporte_perfis_total" ||
    nextStatus === "transporte_acessorios" ||
    nextStatus === "transporte_levar_vidro"
  ) {
    const [existing] = await tx
      .select({ id: transportLogs.id, vehicleId: transportLogs.vehicleId })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1);

    const vehicleId =
      (payload.vehicleId as string | undefined) ?? existing?.vehicleId ?? null;
    let plate: string | null = null;
    if (vehicleId) {
      const { resolveVehiclePlate } = await import("@/lib/data/vehicles");
      plate = await resolveVehiclePlate(vehicleId);
    }

    const isDelivered = nextStatus === "transporte_levar_vidro";

    const values = {
      itemsChecked: payload.itemsChecked as {
        perfil: boolean;
        estrutural: boolean;
        perfisTotal: boolean;
        accessories: boolean;
        glass: boolean;
      },
      vehicleId,
      vehiclePlate: plate,
      notes: (payload.notes as string) ?? null,
      status: (isDelivered ? "entregue" : "em_transito") as
        | "entregue"
        | "em_transito",
      arrivalAt: isDelivered ? new Date() : null,
      updatedAt: new Date(),
    };

    if (existing) {
      await tx
        .update(transportLogs)
        .set(values)
        .where(eq(transportLogs.id, existing.id));
    } else {
      await tx.insert(transportLogs).values({ idMedicao: osId, ...values });
    }
  }

  if (
    ["instalacao_estrutural", "instalacao_vidros"].includes(nextStatus)
  ) {
    const [existing] = await tx
      .select()
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, osId))
      .limit(1);

    const patch = {
      structuralInstalled:
        nextStatus === "instalacao_estrutural" ||
        existing?.structuralInstalled ||
        false,
      glassInstalled:
        nextStatus === "instalacao_vidros" || existing?.glassInstalled || false,
      finalCompleted: existing?.finalCompleted || false,
      photos:
        (payload.photos as InstallationPhotos) ?? existing?.photos ?? null,
      notes: (payload.notes as string) ?? existing?.notes ?? null,
      status:
        nextStatus === "instalacao_estrutural"
          ? ("estrutural" as const)
          : ("vidros" as const),
    };

    if (existing) {
      await tx
        .update(installationLogs)
        .set(patch)
        .where(eq(installationLogs.id, existing.id));
    } else {
      await tx.insert(installationLogs).values({ idMedicao: osId, ...patch });
    }
  }

  if (nextStatus === "concluido") {
    await tx
      .update(installationLogs)
      .set({
        finalCompleted: true,
        status: "concluido",
        completedAt: new Date(),
      })
      .where(eq(installationLogs.idMedicao, osId));
  }
}

/**
 * Avança a OS para a próxima etapa com validação Zod + payload por etapa.
 */
export async function advanceOSStatus(
  raw: AdvanceOSInput,
): Promise<AdvanceOSResult> {
  const parsed = advanceSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos" };
  }

  const { osId, nextStatus, payload } = parsed.data;

  try {
    await requireRole(getAdvanceAllowedRoles(nextStatus));
  } catch (err) {
    const message = authErrorMessage(err);
    if (message) return { success: false, message };
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    throw err;
  }

  const accessibleOrder = await getServiceOrderById(osId);
  if (!accessibleOrder) {
    return { success: false, message: "OS não encontrada" };
  }

  if (useMockData()) {
    const mockResult = await mockRepository.advance(osId, nextStatus, payload);
    if (!mockResult.success) return mockResult;
    let notificationSummary: string | undefined;
    if (isNotifyStatus(nextStatus)) {
      const ctx = await loadClientNotificationContext(osId, nextStatus);
      if (ctx) {
        const notifyResult = await notifyClientOnStatusChange(ctx);
        notificationSummary = formatNotificationSummary(notifyResult);
      }
    }
    revalidatePath("/dashboard");
    return {
      success: true,
      message: mockResult.message,
      newStatus: nextStatus,
      notificationSummary,
    };
  }

  try {
    const db = getDb();

    const fromStatus = accessibleOrder.status as OsStatus;

    if (!isAllowedAdvance(fromStatus, nextStatus)) {
      return {
        success: false,
        message: `Transição inválida: ${fromStatus} → ${nextStatus}`,
      };
    }

    const ctx = await loadStepContext(db, osId);
    const validationError = await validateAdvancePayload(
      nextStatus,
      payload,
      ctx,
      osId,
    );
    if (validationError) {
      return { success: false, message: validationError };
    }

    await db.transaction(async (tx) => {
      const session = await getSession();

      if (payload && Object.keys(payload).length > 0) {
        await persistStepData(tx, osId, nextStatus, payload);
      }

      await tx
        .update(measurements)
        .set({ etapa: nextStatus, updatedAt: sql`NOW()` })
        .where(eq(measurements.id, osId));

      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus,
        toStatus: nextStatus,
        changedById: session?.userId ?? null,
        metadata: payload
          ? {
              payload: {
                ...payload,
                biometricConfirmation: payload.biometricConfirmation,
              },
            }
          : undefined,
      });
    });

    revalidatePath("/dashboard");

    let notificationSummary: string | undefined;
    if (isNotifyStatus(nextStatus)) {
      const notifyCtx = await loadClientNotificationContext(osId, nextStatus);
      if (notifyCtx) {
        const notifyResult = await notifyClientOnStatusChange(notifyCtx);
        notificationSummary = formatNotificationSummary(notifyResult);
      }
    }

    const baseMessage = `OS avançada para ${nextStatus.replace(/_/g, " ")}`;
    return {
      success: true,
      message: notificationSummary
        ? `${baseMessage}. ${notificationSummary}`
        : baseMessage,
      newStatus: nextStatus,
      notificationSummary,
    };
  } catch (error) {
    console.error("[advanceOSStatus]", error);
    return { success: false, message: "Erro interno ao processar etapa" };
  }
}
