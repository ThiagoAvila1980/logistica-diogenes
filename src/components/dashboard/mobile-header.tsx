"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";

type MobileHeaderProps = {
  title?: string;
  onMenuOpen: () => void;
  showNotifications?: boolean;
};

export function MobileHeader({
  title = "Logística Diógenes",
  onMenuOpen,
  showNotifications = false,
}: MobileHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-primary-dark/30 bg-primary text-primary-foreground shadow-md safe-top md:hidden">
      <div className="relative flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          onClick={onMenuOpen}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {title}
        </span>
        <NotificationBell
          enabled={showNotifications}
          className="shrink-0 [&_button]:h-10 [&_button]:w-10 [&_button]:text-primary-foreground/85 [&_button:hover]:bg-white/10 [&_button:hover]:text-primary-foreground"
        />
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brass" aria-hidden />
      </div>
    </header>
  );
}
