"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  Ruler,
  Scissors,
  Truck,
  Hammer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session-types";
import { getNavItemsForRoles } from "@/lib/auth/permissions";

const MOBILE_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/kanban": LayoutGrid,
  "/field": Ruler,
  "/production": Scissors,
  "/logistics": Truck,
  "/installation": Hammer,
};

const MOBILE_LABELS: Record<string, string> = {
  "/dashboard": "Painel",
  "/dashboard/kanban": "Kanban",
  "/field": "Medições",
  "/production": "Corte",
  "/logistics": "Transp.",
  "/installation": "Inst.",
};

export function MobileBottomNav({
  pathname,
  session,
}: {
  pathname: string;
  session?: SessionUser;
}) {
  const items = session
    ? getNavItemsForRoles(session.roles).slice(0, 5)
    : getNavItemsForRoles(["admin"]).slice(0, 5);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 md:hidden safe-bottom"
      aria-label="Navegação principal"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, match }) => {
          const Icon = MOBILE_ICONS[match] ?? LayoutDashboard;
          const label = MOBILE_LABELS[match] ?? match.replace("/", "");
          const active =
            pathname === match ||
            (match !== "/dashboard" && pathname.startsWith(`${match}/`)) ||
            (match === "/dashboard" &&
              pathname.startsWith("/dashboard") &&
              !pathname.startsWith("/dashboard/kanban"));

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.5]")}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
