"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  FileBarChart,
  Activity,
  Clock,
  Users,
  Truck,
  Package2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REPORTS_NAV_ITEMS,
  isReportsPath,
  type NavItem,
} from "@/lib/auth/permissions";

const REPORTS_ICONS: Record<string, LucideIcon> = {
  "/reports/services": FileBarChart,
  "/reports/kpis": Activity,
  "/reports/backlog": Clock,
  "/reports/team": Users,
  "/reports/logistics": Truck,
  "/reports/products": Package2,
};

type ReportsNavSectionProps = {
  pathname: string;
  onNavigate?: () => void;
};

export function ReportsNavSection({
  pathname,
  onNavigate,
}: ReportsNavSectionProps) {
  const [open, setOpen] = useState(false);
  const sectionActive = isReportsPath(pathname);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all",
          sectionActive
            ? "border-l-2 border-brass/60 bg-sidebar-surface text-primary-foreground"
            : "border-l-2 border-transparent text-primary-foreground/70 hover:bg-sidebar-surface hover:text-primary-foreground",
        )}
        aria-expanded={open}
      >
        <BarChart3 className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Relatórios</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && REPORTS_NAV_ITEMS.length > 0 && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-subtle pl-3">
          {REPORTS_NAV_ITEMS.map((item: NavItem) => {
            const Icon = REPORTS_ICONS[item.match] ?? BarChart3;
            const active =
              pathname === item.match || pathname.startsWith(`${item.match}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                  active
                    ? "border-l-2 border-brass bg-sidebar-active font-medium text-primary-foreground"
                    : "border-l-2 border-transparent text-primary-foreground/65 hover:bg-sidebar-surface hover:text-primary-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-brass")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
