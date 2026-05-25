"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Car,
  ChevronDown,
  Layers,
  Palette,
  PanelTop,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SETTINGS_NAV_ITEMS,
  isSettingsPath,
  type NavItem,
} from "@/lib/auth/permissions";

const SETTINGS_ICONS: Record<string, LucideIcon> = {
  "/admin/vehicles": Car,
  "/admin/cores": Palette,
  "/admin/tipo-vidro": Layers,
  "/admin/tipo-envidracamento": PanelTop,
};

type SettingsNavSectionProps = {
  pathname: string;
  onNavigate?: () => void;
};

export function SettingsNavSection({
  pathname,
  onNavigate,
}: SettingsNavSectionProps) {
  const [open, setOpen] = useState(() => isSettingsPath(pathname));
  const sectionActive = isSettingsPath(pathname);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          sectionActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-expanded={open}
      >
        <Settings2 className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Configurações</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-1 border-l border-border/60 pl-3 ml-3">
          {SETTINGS_NAV_ITEMS.map((item: NavItem) => {
            const Icon = SETTINGS_ICONS[item.match] ?? Settings2;
            const active =
              pathname === item.match || pathname.startsWith(`${item.match}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
