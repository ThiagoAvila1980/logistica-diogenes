"use server";

import { eq, sql } from "drizzle-orm";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import {
  assertTransitionGuards,
  TransitionValidationError,
  type TransitionContext,
} from "@/lib/workflow/status-machine";
import { measurementTypePatchForEtapa } from "@/lib/workflow/measurement-actions";
import { getDb } from "@/lib/db";
import {
  measurements,
  statusHistory,
  osStatus,
  type OsStatus,
} from "@/db/schema";
import {
  aggregateCuttingStepsFromItems,
  aggregateInstallationStepsFromItems,
} from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { loadClientNotificationContext } from "@/lib/notifications/order-context";
import {
  formatNotificationSummary,
  notifyKanbanStatusChange,
} from "@/lib/notifications/notify-client";
import { isKanbanNotifyStatus } from "@/lib/notifications/types";

import { authErrorMessage, AuthError } from "@/lib/auth/auth-error";
import { requireRole } from "@/lib/auth/require-role";
import { getSession } from "@/lib/auth/session";
import { listKanbanOrders, type KanbanOrderItem } from "@/lib/data/kanban";
import { revalidateOSRoutes } from "@/lib/revalidate";

const VALID_OS_STATUSES = new Set(osStatus.enumValues);

function parseOsStatus(value: string): OsStatus | null {
  return VALID_OS_STATUSES.has(value as OsStatus) ? (value as OsStatus) : null;
}

/**
 * Carrega o contexto necessário para `assertTransitionGuards`.
 * Usa um único JOIN para evitar round-trips adicionais.
 */
async function loadTransitionContext(
  osId: string,
  db: ReturnType<typeof getDb>,
): Promise<TransitionContext> {
  // Fonte única de verdade: corte e instalação derivam do JSONB `items`,
  // as mesmas funções usadas pelos módulos operacionais e pelo kanban.
  const [row] = await db
    .select({
      measStatus: measurements.status,
      items: measurements.items,
    })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  if (!row) {
    return {
      hasFinalMeasurement: false,
      cuttingSteps: {
        corteFeito: false,
        embalagemFeita: false,
        acessoriosFeitos: false,
        vidrosFeitos: false,
      },
      installationComplete: false,
    };
  }

  const items = (row.items as MeasurementLineItem[]) ?? [];
  const hasFinalMeasurement = row.measStatus === "medida" || items.length > 0;

  // Espelha a regra dos módulos: se há vãos enviados ao corte, considera só esses.
  const hasSentFlag = items.some((i) => i.sentToCutting === true);
  const cuttingItems = hasSentFlag
    ? items.filter((i) => i.sentToCutting === true)
    : items;

  const installation = aggregateInstallationStepsFromItems(items);

  return {
    hasFinalMeasurement,
    cuttingSteps: aggregateCuttingStepsFromItems(cuttingItems),
    installationComplete:
      installation.instalacaoEstruturalFeita && installation.instalacaoVidrosFeita,
  };
}

export type MoveOSCardResult =
  | { success: true; notificationSummary?: string }
  | { success: false; message: string };

export type RefreshKanbanOrdersResult =
  | { success: true; orders: KanbanOrderItem[] }
  | { success: false; message: string };

export async function refreshKanbanOrders(): Promise<RefreshKanbanOrdersResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "Sessão expirada. Faça login novamente." };
    }

    const orders = await listKanbanOrders();
    return { success: true, orders };
  } catch (error) {
    console.error("[refreshKanbanOrders]", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao atualizar o kanban",
    };
  }
}

export async function moveOSCard(
  osId: string,
  targetStatus: string,
): Promise<MoveOSCardResult> {
  try {
    await requireRole(["gerente", "admin"]);
  } catch (err) {
    const message = authErrorMessage(err);
    if (message) {
      return {
        success: false,
        message,
      };
    }
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    throw err;
  }

  try {
    const target = parseOsStatus(targetStatus);
    if (!target) {
      return { success: false, message: "Status inválido." };
    }

    if (useMockData()) {
      const mockResult = mockRepository.moveCard(osId, target);
      if (!mockResult.success) return mockResult;
      return finishKanbanMove(osId, target);
    }

    const db = getDb();
    const [current] = await db
      .select({
        id: measurements.id,
        etapa: measurements.etapa,
      })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    if (!current) {
      return { success: false, message: "OS não encontrada" };
    }

    const fromStatus = current.etapa as OsStatus;
    const allowed = getAllowedTransitions(fromStatus);

    if (!allowed.includes(target)) {
      return {
        success: false,
        message: `Transição não permitida: ${fromStatus} → ${target}`,
      };
    }

    // Valida as regras de negócio (medição final, etapas de corte, instalação)
    const ctx = await loadTransitionContext(osId, db);
    try {
      assertTransitionGuards(fromStatus, target, ctx);
    } catch (err) {
      if (err instanceof TransitionValidationError) {
        return { success: false, message: err.message };
      }
      throw err;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(measurements)
        .set({
          etapa: target,
          updatedAt: sql`NOW()`,
          ...measurementTypePatchForEtapa(target),
        })
        .where(eq(measurements.id, osId));

      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus,
        toStatus: target,
        metadata: { source: "kanban_drag" },
      });
    });

    revalidateOSRoutes(osId);

    return finishKanbanMove(osId, target);
  } catch (error) {
    console.error("[moveOSCard]", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao mover OS",
    };
  }
}

async function finishKanbanMove(
  osId: string,
  target: OsStatus,
): Promise<MoveOSCardResult> {
  let notificationSummary: string | undefined;

  if (isKanbanNotifyStatus(target)) {
    const ctx = await loadClientNotificationContext(osId, target);
    if (ctx) {
      const notifyResult = await notifyKanbanStatusChange(ctx);
      notificationSummary = formatNotificationSummary(notifyResult);
    }
  }

  return { success: true, notificationSummary };
}
