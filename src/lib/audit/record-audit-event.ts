import "server-only";

import { auditEvents } from "@/db/schema";
import type { getDb } from "@/db";
import type { AuditAction } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Pick<ReturnType<typeof getDb>, "insert">;

export type RecordAuditEventParams = {
  actorId: string | null;
  action: AuditAction | string;
  measurementId?: string | null;
  itemId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

export async function recordAuditEvent(
  db: AnyDb,
  params: RecordAuditEventParams,
): Promise<void> {
  await db.insert(auditEvents).values({
    actorId: params.actorId,
    action: params.action,
    measurementId: params.measurementId ?? null,
    itemId: params.itemId ?? null,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    payload: params.payload ?? {},
  });
}
