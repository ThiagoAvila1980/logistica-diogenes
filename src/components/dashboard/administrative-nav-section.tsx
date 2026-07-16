"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ShieldCheck,
  Users,
  History,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_ITEMS,
  isAdministrativePath,
  type NavItem,
} from "@/lib/auth/permissions";

const ADMINISTRATIVE_ICONS: Record<string, LucideIcon> = {
  "/admin/users": Users,
  "/admin/permissions": ShieldCheck,
  "/admin/auditoria": History,
};

type AdministrativeNavSectionProps = {
  pathname: string;
  onNavigate?: () => void;
};

export function AdministrativeNavSection({
  pathname,
  onNavigate,
}: AdministrativeNavSectionProps) {
  const [open, setOpen] = useState(() => isAdministrativePath(pathname));
  const sectionActive = isAdministrativePath(pathname);

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
        <Briefcase className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Administrativo</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-subtle pl-3">
          {ADMIN_NAV_ITEMS.map((item: NavItem) => {
            const Icon = ADMINISTRATIVE_ICONS[item.match] ?? Briefcase;
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
