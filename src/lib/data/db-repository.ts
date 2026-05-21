import { and, desc, eq, inArray, or, isNull, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceOrders, measurements } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session-types";
import {
  getVisibleStatusesForRoles,
} from "@/lib/auth/order-access";
import { canViewAllOrders } from "@/lib/auth/permissions";
import {
  measurementClientName,
  measurementClientPhone,
  primaryMeasurementJoin,
} from "@/lib/data/order-measurement-join";
import type { OrderDetail, OrderListItem } from "./types";

function buildOrderAccessWhere(session: SessionUser | null): SQL | undefined {
  if (!session || canViewAllOrders(session.roles)) return undefined;

  const visibleStatuses = getVisibleStatusesForRoles(session.roles);
  const assignedClause = or(
    isNull(serviceOrders.assignedUserId),
    eq(serviceOrders.assignedUserId, session.userId),
  );

  if (!visibleStatuses?.length) {
    return assignedClause;
  }

  return and(assignedClause, inArray(serviceOrders.status, visibleStatuses));
}

export async function listServiceOrdersDb(
  session?: SessionUser | null,
): Promise<OrderListItem[]> {
  const db = getDb();
  const accessWhere = buildOrderAccessWhere(session ?? null);

  let query = db
    .select({
      id: serviceOrders.id,
      number: serviceOrders.number,
      status: serviceOrders.status,
      measurementFlow: serviceOrders.measurementFlow,
      priority: serviceOrders.priority,
      scheduledDate: serviceOrders.scheduledDate,
      updatedAt: serviceOrders.updatedAt,
      assignedUserId: serviceOrders.assignedUserId,
      clientName: measurementClientName,
      budgetReference: serviceOrders.budgetReference,
    })
    .from(serviceOrders)
    .leftJoin(measurements, primaryMeasurementJoin)
    .orderBy(desc(serviceOrders.updatedAt))
    .$dynamic();

  if (accessWhere) {
    query = query.where(accessWhere);
  }

  const rows = await query;

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    measurementFlow: r.measurementFlow,
    priority: r.priority,
    clientName: r.clientName,
    assignedUserId: r.assignedUserId,
    scheduledDate: r.scheduledDate,
    updatedAt: r.updatedAt,
    budgetReference: r.budgetReference,
  }));
}

export async function getServiceOrderByIdDb(
  id: string,
): Promise<OrderDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: serviceOrders.id,
      number: serviceOrders.number,
      status: serviceOrders.status,
      measurementFlow: serviceOrders.measurementFlow,
      priority: serviceOrders.priority,
      scheduledDate: serviceOrders.scheduledDate,
      updatedAt: serviceOrders.updatedAt,
      description: serviceOrders.description,
      revisionReason: serviceOrders.revisionReason,
      revisionFromStatus: serviceOrders.revisionFromStatus,
      assignedUserId: serviceOrders.assignedUserId,
      clientName: measurementClientName,
      clientPhone: measurementClientPhone,
      budgetReference: serviceOrders.budgetReference,
      sourcePdfUrl: serviceOrders.sourcePdfUrl,
    })
    .from(serviceOrders)
    .leftJoin(measurements, primaryMeasurementJoin)
    .where(eq(serviceOrders.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    number: row.number,
    status: row.status,
    measurementFlow: row.measurementFlow,
    priority: row.priority,
    clientName: row.clientName,
    assignedUserId: row.assignedUserId,
    clientPhone: row.clientPhone,
    scheduledDate: row.scheduledDate,
    updatedAt: row.updatedAt,
    description: row.description,
    revisionReason: row.revisionReason,
    revisionFromStatus: row.revisionFromStatus,
    budgetReference: row.budgetReference,
    sourcePdfUrl: row.sourcePdfUrl,
  };
}
