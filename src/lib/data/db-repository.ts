import { and, desc, eq, inArray, or, isNull, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, installationLogs } from "@/db/schema";
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

  // Instaladores só veem OS com installerId explicitamente atribuído a eles.
  const isInstaladorOnly =
    session.roles.every((r) => r === "instalador") ||
    (session.roles.includes("instalador") &&
      !session.roles.some((r) =>
        ["admin", "gerente", "medidor", "cortador", "motorista"].includes(r),
      ));

  if (isInstaladorOnly) {
    const installerClause = eq(installationLogs.installerId, session.userId);
    if (!visibleStatuses?.length) return installerClause;
    return and(
      installerClause,
      inArray(measurements.etapa, visibleStatuses),
    );
  }

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
  installerId: string | null;
  scheduledInstallationDate: Date | null;
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
    installerId: r.installerId,
    scheduledInstallationDate: r.scheduledInstallationDate,
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
      installerId: installationLogs.installerId,
      scheduledInstallationDate: installationLogs.scheduledInstallationDate,
      clientName: measurementClientName,
      budgetReference: resolvedBudgetReference,
      hasMeasurement: hasMeasurementItems,
    })
    .from(measurements)
    .leftJoin(
      installationLogs,
      eq(installationLogs.idMedicao, measurements.id),
    )
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
      installerId: installationLogs.installerId,
      scheduledInstallationDate: installationLogs.scheduledInstallationDate,
      clientName: measurementClientName,
      clientPhone: measurementClientPhone,
      budgetReference: resolvedBudgetReference,
      sourcePdfUrl: measurements.sourcePdfUrl,
      hasMeasurement: hasMeasurementItems,
    })
    .from(measurements)
    .leftJoin(
      installationLogs,
      eq(installationLogs.idMedicao, measurements.id),
    )
    .where(eq(measurements.id, id))
    .limit(1);

  if (!row) return null;

  return {
    ...mapMeasurementRow(row),
    description: row.description,
    clientPhone: row.clientPhone,
    sourcePdfUrl: row.sourcePdfUrl,
    notes: row.notes ?? null,
  };
}
