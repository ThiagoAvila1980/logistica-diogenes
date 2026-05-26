"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import { measurementTypePatchForEtapa } from "@/lib/workflow/measurement-actions";
import { getDb } from "@/lib/db";
import { measurements, statusHistory, type OsStatus } from "@/db/schema";
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
    const target = targetStatus as OsStatus;

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

    revalidatePath("/dashboard/kanban");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard");

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
