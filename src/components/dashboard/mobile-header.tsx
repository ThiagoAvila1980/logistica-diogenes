"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type MobileHeaderProps = {
  title?: string;
  onMenuOpen: () => void;
};

export function MobileHeader({ title = "Fluxo Diógenes", onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden safe-top">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onMenuOpen}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <span className="truncate text-sm font-semibold">{title}</span>
    </header>
  );
}
