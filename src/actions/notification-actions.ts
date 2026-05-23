"use server";

import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from "@/lib/data/notifications-db";
import type { NotificationListResult } from "@/lib/notifications/types";

export async function getNotificationsAction(): Promise<NotificationListResult | null> {
  const session = await getSession();
  if (!session) return null;
  if (!hasAnyRole(session.roles, ["admin", "gerente"])) {
    return { items: [], unreadCount: 0 };
  }
  return listNotificationsForUser(session.userId);
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return markNotificationRead(notificationId, session.userId);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await markAllNotificationsRead(session.userId);
}

export async function dismissNotificationAction(
  notificationId: string,
): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return deleteNotification(notificationId, session.userId);
}
