"use client";

import Link from "next/link";
import {
  LayoutDashboard,
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
  "/field": Ruler,
  "/production": Scissors,
  "/logistics": Truck,
  "/installation": Hammer,
};

const MOBILE_LABELS: Record<string, string> = {
  "/dashboard": "Painel",
  "/field": "Medições",
  "/production": "Corte e Logística",
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/10 bg-card/95 shadow-[0_-4px_24px_-8px_rgba(14,87,148,0.12)] backdrop-blur supports-[backdrop-filter]:bg-card/90 safe-bottom md:hidden"
      aria-label="Navegação principal"
    >
      <ul
        className="grid h-14"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, match }) => {
          const Icon = MOBILE_ICONS[match] ?? LayoutDashboard;
          const label = MOBILE_LABELS[match] ?? match.replace("/", "");
          const active =
            pathname === match || pathname.startsWith(`${match}/`);

          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                prefetch={false}
                className={cn(
                  "relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium leading-none transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-brass"
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn(
                    "h-[1.375rem] w-[1.375rem] shrink-0",
                    active && "stroke-[2.5]",
                  )}
                  aria-hidden
                />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
