import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/db/env";
import { notifications, users } from "@/db/schema";
import { useMockData } from "@/lib/data/config";
import { mockNotificationStore } from "@/lib/data/mock-notifications";
import type {
  AppNotification,
  NotificationListResult,
} from "@/lib/notifications/types";

function useInMemoryNotifications() {
  return useMockData() && !isSupabaseConfigured();
}

function mapRow(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  osId: string | null;
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
    osId: row.osId,
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
        osId: notifications.osId,
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

export async function createCuttingProblemNotifications(input: {
  osId: string;
  osNumber: string;
  clientName: string;
  senderName: string;
  message: string;
}): Promise<number> {
  const title = `Problema no corte — ${input.osNumber}`;
  const body = `${input.senderName} reportou: ${input.message}`;
  const href = `/production/${input.osId}`;

  if (useInMemoryNotifications()) {
    const recipientIds = ["mock-admin", "mock-gerente"];
    mockNotificationStore.insertMany(
      recipientIds.map((userId) => ({
        userId,
        type: "cutting_alert",
        title,
        body,
        href,
        osId: input.osId,
      })),
    );
    console.info("[cutting-alert:push]", title, input.message);
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
      type: "cutting_alert",
      title,
      body,
      href,
      osId: input.osId,
    })),
  );

  return recipients.length;
}
