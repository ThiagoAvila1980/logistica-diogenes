import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements, transportLogs } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { SessionUser } from "@/lib/auth/session-types";
import { canViewAllOrders, hasAnyRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";
import type { TransportStep } from "./transport-item-gates";
import {
  TRANSPORT_STEPS,
  collectVaoStepDriverIds,
  getVaoStepAssignment,
} from "./transport-step-assignment";
import { selectCuttingLineItems } from "@/lib/workflow/aggregates";

export type TransportDriverOption = { id: string; name: string };
export function collectDriverIdsFromMeasurementItems(
  items: MeasurementLineItem[] | null | undefined,
): string[] {
  const ids = new Set<string>();
  for (const item of items ?? []) {
    for (const id of collectVaoStepDriverIds(item)) ids.add(id);
  }
  return [...ids];
}

export function mergeDriverIds(
  ...sources: Array<readonly (string | null | undefined)[]>
): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    for (const id of source) {
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export async function getDriverIdsByOsIds(
  osIds: string[],
): Promise<Record<string, string[]>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const uniqueIds = [...new Set(osIds)];

  const [measurementRows, transportRows] = await Promise.all([
    db
      .select({ id: measurements.id, items: measurements.items })
      .from(measurements)
      .where(inArray(measurements.id, uniqueIds)),
    db
      .select({
        idMedicao: transportLogs.idMedicao,
        driverId: transportLogs.driverId,
      })
      .from(transportLogs)
      .where(inArray(transportLogs.idMedicao, uniqueIds)),
  ]);

  const logDriverByOs = Object.fromEntries(
    transportRows.map((row) => [row.idMedicao, row.driverId]),
  );

  return Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = measurementRows.find((row) => row.id === osId);
      const itemDrivers = collectDriverIdsFromMeasurementItems(
        measurement?.items as MeasurementLineItem[] | null | undefined,
      );
      const logDriver = logDriverByOs[osId];
      return [
        osId,
        mergeDriverIds(itemDrivers, logDriver ? [logDriver] : []),
      ];
    }),
  );
}

export function isAssignedTransportDriver(
  userId: string,
  driverIds: readonly string[] | undefined,
): boolean {
  return !!driverIds?.includes(userId);
}

function isDriverAssignedToAnyStep(
  item: Pick<MeasurementLineItem, "transportProgress">,
  userId: string,
): boolean {
  return collectVaoStepDriverIds(item).includes(userId);
}

/**
 * Motorista só enxerga o vão se estiver designado em pelo menos um item de
 * ticagem (perfil estrutural, perfil total, acessórios ou vidros).
 * Admin/gerente (ou outros papéis) enxergam todos os vãos da OS.
 * Usada tanto para filtrar a listagem quanto para validar as actions de escrita
 * que não são específicas de um item (ex.: veículo, observações).
 */
export function canAccessVaoAsSession(
  session: SessionUser,
  item: Pick<MeasurementLineItem, "transportProgress">,
): boolean {
  if (canViewAllOrders(session.roles)) return true;
  if (!hasAnyRole(session.roles, ["motorista"])) return true;

  return isDriverAssignedToAnyStep(item, session.userId);
}

/**
 * Motorista só pode marcar/desmarcar um item de ticagem específico se for o
 * motorista designado NAQUELE item (cada item pode ter um motorista diferente).
 * Admin/gerente podem operar qualquer item.
 */
export function canOperateVaoStepAsSession(
  session: SessionUser,
  item: Pick<MeasurementLineItem, "transportProgress">,
  step: TransportStep,
): boolean {
  if (canViewAllOrders(session.roles)) return true;
  if (!hasAnyRole(session.roles, ["motorista"])) return true;

  return getVaoStepAssignment(item, step).driverId === session.userId;
}

/** Filtra os vãos de uma OS para o que a sessão do motorista pode ver/operar. */
export function filterVaoItemsForSession<
  T extends { transportProgress?: MeasurementLineItem["transportProgress"] },
>(items: T[], session: SessionUser | null): T[] {
  if (!session) return [];
  if (canViewAllOrders(session.roles)) return items;
  if (!hasAnyRole(session.roles, ["motorista"])) return items;

  return items.filter((item) => isDriverAssignedToAnyStep(item, session.userId));
}

/**
 * Há etapa de transporte incompleta designada a este motorista?
 * Usado para tirar a OS da listagem dele quando o trabalho dele acabou,
 * mesmo que outros motoristas ainda tenham pendências na mesma OS.
 */
export function hasPendingTransportWorkForDriver(
  items: MeasurementLineItem[],
  driverId: string,
): boolean {
  for (const item of selectCuttingLineItems(items)) {
    for (const step of TRANSPORT_STEPS) {
      if (getVaoStepAssignment(item, step).driverId !== driverId) continue;
      if (item.transportProgress?.[step] !== true) return true;
    }
  }
  return false;
}

/**
 * Lista usada para resolver nomes no checklist de transporte.
 * Admin/gerente: todos os motoristas ativos.
 * Motorista: só ele (o select de atribuição continua bloqueado; o campo
 * somente-leitura precisa do nome).
 */
export function driversForTransportViewer(
  roles: readonly UserRole[],
  session: { userId: string; name: string } | null,
  allDrivers: TransportDriverOption[],
): TransportDriverOption[] {
  if (canViewAllOrders(roles)) return allDrivers;
  if (!session) return [];
  return [{ id: session.userId, name: session.name }];
}
