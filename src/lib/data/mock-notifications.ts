import type { AppNotification } from "@/lib/notifications/types";

const store: AppNotification[] = [];

export const mockNotificationStore = {
  list(userId: string, limit = 20): AppNotification[] {
    return store
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  unreadCount(userId: string): number {
    return store.filter((n) => n.userId === userId && !n.readAt).length;
  },

  insertMany(rows: Omit<AppNotification, "id" | "readAt" | "createdAt">[]) {
    const now = new Date();
    for (const row of rows) {
      store.unshift({
        ...row,
        id: crypto.randomUUID(),
        readAt: null,
        createdAt: now,
      });
    }
  },

  markRead(id: string, userId: string): boolean {
    const item = store.find((n) => n.id === id && n.userId === userId);
    if (!item || item.readAt) return false;
    item.readAt = new Date();
    return true;
  },

  markAllRead(userId: string) {
    const now = new Date();
    for (const item of store) {
      if (item.userId === userId && !item.readAt) {
        item.readAt = now;
      }
    }
  },

  remove(id: string, userId: string): boolean {
    const index = store.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return false;
    store.splice(index, 1);
    return true;
  },
};
