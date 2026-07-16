import "server-only";

import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, measurements, users } from "@/db/schema";

export type AuditEventListFilters = {
  measurementId?: string | null;
  osNumber?: string | null;
  actorId?: string | null;
  action?: string | null;
  from?: Date | null;
  to?: Date | null;
  page?: number;
  pageSize?: number;
};

export type AuditEventListItem = {
  id: string;
  action: string;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;
  measurementId: string | null;
  osNumber: string | null;
  cliente: string | null;
  itemId: string | null;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
};

export type AuditEventListResult = {
  items: AuditEventListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAuditEvents(
  filters: AuditEventListFilters
): Promise<AuditEventListResult> {
  const db = getDb();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  const conditions = [];

  if (filters.measurementId) {
    conditions.push(eq(auditEvents.measurementId, filters.measurementId));
  }
  if (filters.osNumber) {
    conditions.push(ilike(measurements.number, `%${filters.osNumber}%`));
  }
  if (filters.actorId) {
    conditions.push(eq(auditEvents.actorId, filters.actorId));
  }
  if (filters.action) {
    conditions.push(eq(auditEvents.action, filters.action));
  }
  if (filters.from) {
    conditions.push(gte(auditEvents.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(auditEvents.createdAt, filters.to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditEvents)
    .leftJoin(measurements, eq(auditEvents.measurementId, measurements.id))
    .where(whereClause);

  // Fetch items
  const rows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      createdAt: auditEvents.createdAt,
      actorId: auditEvents.actorId,
      actorName: users.name,
      measurementId: auditEvents.measurementId,
      osNumber: measurements.number,
      cliente: measurements.cliente,
      itemId: auditEvents.itemId,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      payload: auditEvents.payload,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorId, users.id))
    .leftJoin(measurements, eq(auditEvents.measurementId, measurements.id))
    .where(whereClause)
    .orderBy(desc(auditEvents.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: rows,
    total: count,
    page,
    pageSize,
  };
}

export async function listActiveUsersForAuditFilter(): Promise<{ id: string; name: string }[]> {
  const db = getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));
}
