import { and, desc, eq, inArray, or, isNull, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, pedidos } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session-types";
import { getVisibleStatusesForRoles } from "@/lib/auth/order-access";
import { canViewAllOrders } from "@/lib/auth/permissions";
import { TRANSPORT_PHASE_STATUSES, INSTALLATION_PHASE_STATUSES } from "@/lib/transport-gates";
import {
  hasMeasurementItems,
  measurementClientName,
  measurementClientPhone,
  measurementClientAddress,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import { derivePedidoStatus } from "@/lib/pedido/pedido-status";
import type { OrderDetail, OrderListItem } from "./types";

function buildOrderAccessWhere(session: SessionUser | null): SQL | undefined {
  if (!session || canViewAllOrders(session.roles)) return undefined;

  const visibleStatuses = getVisibleStatusesForRoles(session.roles);

  const isInstaladorOnly =
    session.roles.every((r) => r === "instalador") ||
    (session.roles.includes("instalador") &&
      !session.roles.some((r) =>
        ["admin", "gerente", "medidor", "cortador", "motorista"].includes(r),
      ));

  if (isInstaladorOnly) {
    const instaladorListingStatuses = [
      ...(visibleStatuses ?? []),
      ...TRANSPORT_PHASE_STATUSES,
    ];
    const uniqueStatuses = [...new Set(instaladorListingStatuses)];
    if (!uniqueStatuses.length) return undefined;
    return inArray(measurements.etapa, uniqueStatuses);
  }

  const assignedClause = or(
    isNull(measurements.assignedUserId),
    eq(measurements.assignedUserId, session.userId),
    ...(session.roles.includes("motorista") && !canViewAllOrders(session.roles)
      ? [inArray(measurements.etapa, [...TRANSPORT_PHASE_STATUSES])]
      : []),
    ...(session.roles.includes("instalador") && !canViewAllOrders(session.roles)
      ? [inArray(measurements.etapa, [...INSTALLATION_PHASE_STATUSES])]
      : []),
  );

  if (!visibleStatuses?.length) {
    return assignedClause;
  }

  return and(assignedClause, inArray(measurements.etapa, visibleStatuses));
}

function mapMeasurementRow(r: {
  id: string;
  number: string;
  etapa: OrderListItem["status"];
  type: OrderListItem["type"];
  measurementStatus: OrderListItem["measurementStatus"];
  priority: OrderListItem["priority"];
  scheduledDate: Date | null;
  updatedAt: Date;
  assignedUserId: string | null;
  clientName: string;
  budgetReference: string | null;
  hasMeasurement: boolean;
  pedidoFeito: boolean | null;
  pedidoRecebido: boolean | null;
}): OrderListItem {
  return {
    id: r.id,
    number: r.number,
    status: r.etapa,
    type: r.type,
    measurementStatus: r.measurementStatus,
    priority: r.priority,
    clientName: r.clientName,
    assignedUserId: r.assignedUserId,
    scheduledDate: r.scheduledDate,
    updatedAt: r.updatedAt,
    budgetReference: r.budgetReference,
    hasMeasurement: Boolean(r.hasMeasurement),
    pedidoStatus: derivePedidoStatus(
      r.pedidoFeito == null
        ? null
        : { pedidoFeito: r.pedidoFeito, pedidoRecebido: r.pedidoRecebido ?? false },
    ),
  };
}

export async function listServiceOrdersDb(
  session?: SessionUser | null,
): Promise<OrderListItem[]> {
  const db = getDb();
  const accessWhere = buildOrderAccessWhere(session ?? null);

  let query = db
    .select({
      id: measurements.id,
      number: measurements.number,
      etapa: measurements.etapa,
      type: measurements.type,
      measurementStatus: measurements.status,
      priority: measurements.priority,
      scheduledDate: measurements.scheduledDate,
      updatedAt: measurements.updatedAt,
      assignedUserId: measurements.assignedUserId,
      clientName: measurementClientName,
      budgetReference: resolvedBudgetReference,
      hasMeasurement: hasMeasurementItems,
      pedidoFeito: pedidos.pedidoFeito,
      pedidoRecebido: pedidos.pedidoRecebido,
    })
    .from(measurements)
    .leftJoin(pedidos, eq(pedidos.idMedicao, measurements.id))
    .orderBy(desc(measurements.updatedAt))
    .$dynamic();

  if (accessWhere) {
    query = query.where(accessWhere);
  }

  const rows = await query;
  return rows.map(mapMeasurementRow);
}

export async function getServiceOrderByIdDb(
  id: string,
): Promise<OrderDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: measurements.id,
      number: measurements.number,
      etapa: measurements.etapa,
      type: measurements.type,
      measurementStatus: measurements.status,
      priority: measurements.priority,
      scheduledDate: measurements.scheduledDate,
      updatedAt: measurements.updatedAt,
      description: measurements.description,
      notes: measurements.notes,
      assignedUserId: measurements.assignedUserId,
      clientName: measurementClientName,
      clientPhone: measurementClientPhone,
      clientAddress: measurementClientAddress,
      budgetReference: resolvedBudgetReference,
      sourcePdfUrl: measurements.sourcePdfUrl,
      hasMeasurement: hasMeasurementItems,
      pedidoFeito: pedidos.pedidoFeito,
      pedidoRecebido: pedidos.pedidoRecebido,
    })
    .from(measurements)
    .leftJoin(pedidos, eq(pedidos.idMedicao, measurements.id))
    .where(eq(measurements.id, id))
    .limit(1);

  if (!row) return null;

  return {
    ...mapMeasurementRow(row),
    description: row.description,
    clientPhone: row.clientPhone,
    clientAddress: row.clientAddress,
    sourcePdfUrl: row.sourcePdfUrl,
    notes: row.notes ?? null,
  };
}
