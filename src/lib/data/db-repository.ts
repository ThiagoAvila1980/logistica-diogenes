import { and, desc, eq, inArray, or, isNull, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session-types";
import { getVisibleStatusesForRoles } from "@/lib/auth/order-access";
import { canViewAllOrders } from "@/lib/auth/permissions";
import {
  hasMeasurementItems,
  measurementClientName,
  measurementClientPhone,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import type { OrderDetail, OrderListItem } from "./types";

function buildOrderAccessWhere(session: SessionUser | null): SQL | undefined {
  if (!session || canViewAllOrders(session.roles)) return undefined;

  const visibleStatuses = getVisibleStatusesForRoles(session.roles);
  const assignedClause = or(
    isNull(measurements.assignedUserId),
    eq(measurements.assignedUserId, session.userId),
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
    })
    .from(measurements)
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
      revisionReason: measurements.revisionReason,
      revisionFromStatus: measurements.revisionFromEtapa,
      assignedUserId: measurements.assignedUserId,
      clientName: measurementClientName,
      clientPhone: measurementClientPhone,
      budgetReference: resolvedBudgetReference,
      sourcePdfUrl: measurements.sourcePdfUrl,
      hasMeasurement: hasMeasurementItems,
    })
    .from(measurements)
    .where(eq(measurements.id, id))
    .limit(1);

  if (!row) return null;

  return {
    ...mapMeasurementRow(row),
    description: row.description,
    revisionReason: row.revisionReason,
    revisionFromStatus: row.revisionFromStatus,
    clientPhone: row.clientPhone,
    sourcePdfUrl: row.sourcePdfUrl,
  };
}
