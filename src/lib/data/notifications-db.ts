import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/db/env";
import {
  cuttingPlans,
  installationLogs,
  notifications,
  transportLogs,
  users,
} from "@/db/schema";
import { mockNotificationStore } from "@/lib/data/mock-notifications";
import {
  getStageAlertMeta,
  type StageAlertType,
} from "@/lib/notifications/stage-alerts";
import type {
  AppNotification,
  NotificationListResult,
} from "@/lib/notifications/types";
function useInMemoryNotifications() {
  return !isSupabaseConfigured();
}

function mapRow(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  measurementId: string | null;
  cuttingPlanId: string | null;
  transportLogId: string | null;
  installationLogId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): AppNotification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    measurementId: row.measurementId,
    cuttingPlanId: row.cuttingPlanId,
    transportLogId: row.transportLogId,
    installationLogId: row.installationLogId,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export async function listNotificationsForUser(
  userId: string,
  limit = 20,
): Promise<NotificationListResult> {
  if (useInMemoryNotifications()) {
    const items = mockNotificationStore.list(userId, limit);
    return {
      items,
      unreadCount: mockNotificationStore.unreadCount(userId),
    };
  }

  const db = getDb();
  const [items, unreadRows] = await Promise.all([
    db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        measurementId: notifications.measurementId,
        cuttingPlanId: notifications.cuttingPlanId,
        transportLogId: notifications.transportLogId,
        installationLogId: notifications.installationLogId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      ),
  ]);

  return {
    items: items.map(mapRow),
    unreadCount: unreadRows[0]?.count ?? 0,
  };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  if (useInMemoryNotifications()) {
    return mockNotificationStore.markRead(notificationId, userId);
  }

  const db = getDb();
  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  return Boolean(updated);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (useInMemoryNotifications()) {
    mockNotificationStore.markAllRead(userId);
    return;
  }

  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  if (useInMemoryNotifications()) {
    return mockNotificationStore.remove(notificationId, userId);
  }

  const db = getDb();
  const [deleted] = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning({ id: notifications.id });

  return Boolean(deleted);
}

export async function createStageProblemNotifications(input: {
  stage: StageAlertType;
  measurementId: string;
  osNumber: string;
  clientName: string;
  senderName: string;
  message: string;
  cuttingPlanId?: string | null;
  transportLogId?: string | null;
  installationLogId?: string | null;
}): Promise<number> {
  const meta = getStageAlertMeta(input.stage);
  const title = `${meta.titlePrefix} — ${input.osNumber}`;
  const body = `${input.senderName} reportou: ${input.message}`;
  const href = meta.href(input.measurementId);

  if (useInMemoryNotifications()) {
    const recipientIds = ["mock-admin", "mock-gerente"];
    mockNotificationStore.insertMany(
      recipientIds.map((userId) => ({
        userId,
        type: meta.type,
        title,
        body,
        href,
        measurementId: input.measurementId,
        cuttingPlanId: input.cuttingPlanId ?? null,
        transportLogId: input.transportLogId ?? null,
        installationLogId: input.installationLogId ?? null,
      })),
    );
    console.info(`[${meta.type}:push]`, title, input.message);
    return recipientIds.length;
  }

  const db = getDb();
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.active, true),
        sql`${users.roles} && ARRAY['admin','gerente']::user_roles[]`,
      ),
    );

  if (recipients.length === 0) return 0;

  await db.insert(notifications).values(
    recipients.map((recipient) => ({
      userId: recipient.id,
      type: meta.type,
      title,
      body,
      href,
      measurementId: input.measurementId,
      cuttingPlanId: input.cuttingPlanId ?? null,
      transportLogId: input.transportLogId ?? null,
      installationLogId: input.installationLogId ?? null,
    })),
  );

  return recipients.length;
}

/** @deprecated Use createStageProblemNotifications with stage: "cutting" */
export async function createCuttingProblemNotifications(input: {
  osId: string;
  osNumber: string;
  clientName: string;
  senderName: string;
  message: string;
  cuttingPlanId?: string | null;
}): Promise<number> {
  return createStageProblemNotifications({
    stage: "cutting",
    measurementId: input.osId,
    osNumber: input.osNumber,
    clientName: input.clientName,
    senderName: input.senderName,
    message: input.message,
    cuttingPlanId: input.cuttingPlanId ?? null,
  });
}

export async function resolveStageRecordIds(
  measurementId: string,
  stage: StageAlertType,
): Promise<{
  cuttingPlanId: string | null;
  transportLogId: string | null;
  installationLogId: string | null;
}> {
  const db = getDb();

  if (stage === "cutting") {
    const [row] = await db
      .select({ id: cuttingPlans.id })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, measurementId))
      .limit(1);
    return {
      cuttingPlanId: row?.id ?? null,
      transportLogId: null,
      installationLogId: null,
    };
  }

  if (stage === "transport") {
    const [row] = await db
      .select({ id: transportLogs.id })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, measurementId))
      .limit(1);
    return {
      cuttingPlanId: null,
      transportLogId: row?.id ?? null,
      installationLogId: null,
    };
  }

  if (stage === "installation") {
    const [row] = await db
      .select({ id: installationLogs.id })
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, measurementId))
      .limit(1);
    return {
      cuttingPlanId: null,
      transportLogId: null,
      installationLogId: row?.id ?? null,
    };
  }

  return {
    cuttingPlanId: null,
    transportLogId: null,
    installationLogId: null,
  };
}