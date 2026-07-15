"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notification-actions";
import type { AppNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  className?: string;
  enabled?: boolean;
  /** Sidebar: painel à direita do sino. Header: abre abaixo, alinhado à direita. */
  panelAlign?: "sidebar" | "header";
};

const POLL_MS = 60_000;
const PANEL_WIDTH = 352;

type PanelPosition = {
  top: number;
  left: number;
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseNotification(raw: AppNotification): AppNotification {
  return {
    ...raw,
    readAt: raw.readAt ? new Date(raw.readAt) : null,
    createdAt: new Date(raw.createdAt),
  };
}

function computePanelPosition(
  rect: DOMRect,
  panelAlign: "sidebar" | "header",
): PanelPosition {
  const width = Math.min(window.innerWidth * 0.92, PANEL_WIDTH);
  const margin = 8;

  if (panelAlign === "sidebar") {
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    return {
      top: Math.max(margin, rect.top),
      left,
    };
  }

  let left = rect.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  return {
    top: rect.bottom + margin,
    left,
  };
}

export function NotificationBell({
  className,
  enabled = true,
  panelAlign = "header",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [detailNotification, setDetailNotification] =
    useState<AppNotification | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelPosition(computePanelPosition(rect, panelAlign));
  }, [panelAlign]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setInitialLoading(true);
    }
    try {
      const res = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: AppNotification[];
        unreadCount: number;
      };
      setItems(data.items.map(parseNotification));
      setUnreadCount(data.unreadCount);
    } finally {
      if (!silent) {
        setInitialLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const onReposition = () => updatePanelPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!enabled) return;

    void refresh();

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void refresh({ silent: true });
    };

    const interval = window.setInterval(poll, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function handleOpenToggle() {
    const next = !open;
    setOpen(next);
    if (next) await refresh({ silent: true });
  }

  async function handleItemClick(notification: AppNotification) {
    if (!notification.readAt) {
      await markNotificationReadAction(notification.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    setDetailNotification(notification);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setItems((prev) =>
      prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })),
    );
    setUnreadCount(0);
  }

  async function handleDismiss(
    event: React.MouseEvent,
    notification: AppNotification,
  ) {
    event.stopPropagation();
    const removed = await dismissNotificationAction(notification.id);
    if (!removed) return;

    setItems((prev) => prev.filter((item) => item.id !== notification.id));
    if (!notification.readAt) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  if (!enabled) return null;

  const panel =
    open && panelPosition && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-200 bg-overlay/20"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              className="fixed z-201 w-[min(92vw,22rem)] overflow-hidden rounded-xl border bg-card shadow-2xl"
              style={{
                top: panelPosition.top,
                left: panelPosition.left,
              }}
              role="dialog"
              aria-label="Notificações"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold">Notificações</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {initialLoading && items.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Carregando...
                  </p>
                ) : items.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma notificação.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {items.map((notification) => (
                      <li key={notification.id} className="relative">
                        <button
                          type="button"
                          onClick={() => void handleItemClick(notification)}
                          className={cn(
                            "w-full px-4 py-3 pr-10 text-left transition-colors hover:bg-muted/50",
                            !notification.readAt && "bg-primary/5",
                          )}
                        >
                          <p className="text-sm font-medium leading-snug">
                            {notification.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {notification.body}
                          </p>
                          <p className="mt-2 text-[12px] text-muted-foreground">
                            {formatWhen(notification.createdAt)}
                          </p>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="Remover notificação"
                          onClick={(event) =>
                            void handleDismiss(event, notification)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t px-4 py-2 text-center">
                <Link
                  href="/dashboard"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  Ver painel
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={rootRef} className={cn("relative", className)}>
        <Button
          ref={buttonRef}
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Notificações"
          aria-expanded={open}
          onClick={() => void handleOpenToggle()}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
      {panel}

      <Dialog
        open={detailNotification !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailNotification(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-snug">
              {detailNotification?.title}
            </DialogTitle>
            {detailNotification && (
              <DialogDescription>
                {formatWhen(detailNotification.createdAt)}
              </DialogDescription>
            )}
          </DialogHeader>

          {detailNotification && (
            <div className="max-h-[min(60vh,24rem)] overflow-y-auto rounded-md border bg-muted/40 p-3">
              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground">
                {detailNotification.body}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setDetailNotification(null)}
            >
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
