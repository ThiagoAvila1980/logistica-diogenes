import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";

import { measurements } from "@/db/schema";

import { useMockData } from "@/lib/data/config";

import { mockRepository } from "@/lib/data/mock-repository";

import { getOrderDisplayNumber } from "@/lib/order-display";

import {
  measurementClientName,
  measurementClientPhone,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";

import type { ClientNotificationContext } from "./types";

import type { OsStatus } from "@/db/schema";

import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";

export async function loadClientNotificationContext(
  osId: string,
  newStatus: OsStatus,
): Promise<ClientNotificationContext | null> {
  if (useMockData()) {
    const order = mockRepository.getById(osId);
    if (!order) return null;

    return {
      measurementId: osId,
      osNumber: getOrderDisplayNumber(order),
      clientName: order.clientName,
      clientEmail: null,
      clientPhone: order.clientPhone,
      newStatus,
    };
  }

  const db = getDb();

  const [row] = await db
    .select({
      number: measurements.number,
      numeroOrcamento: measurements.numeroOrcamento,
      budgetReference: resolvedBudgetReference,
      clientName: measurementClientName,
      clientPhone: measurementClientPhone,
    })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  if (!row) return null;

  return {
    measurementId: osId,
    osNumber: getOrderDisplayNumber({
      number: row.number,
      budgetReference: row.budgetReference,
      numeroOrcamento: row.numeroOrcamento,
    }),
    clientName: row.clientName,
    clientEmail: null,
    clientPhone: row.clientPhone,
    newStatus,
  };
}

export function isNotifyStatus(
  status: AdvanceTargetStatus,
): status is "transporte_levar_vidro" {
  return status === "transporte_levar_vidro";
}
