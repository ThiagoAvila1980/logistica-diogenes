import Link from "next/link";
import {
  LayoutDashboard,
  Ruler,
  FileText,
  Scissors,
  Truck,
  Hammer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session-types";
import {
  formatRolesLabel,
  getNavItemsForRoles,
  hasAnyRole,
  hasRole,
  type NavItem,
} from "@/lib/auth/permissions";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SettingsNavSection } from "@/components/dashboard/settings-nav-section";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/field": Ruler,
  "/quote": FileText,
  "/production": Scissors,
  "/logistics": Truck,
  "/installation": Hammer,
  "/admin/users": Users,
};

function navHomeHref(roles: SessionUser["roles"]): string {
  const items = getNavItemsForRoles(roles);
  return items[0]?.href ?? "/field";
}

export function AppSidebar({
  pathname,
  mockMode,
  session,
  className,
  onNavigate,
}: {
  pathname: string;
  mockMode?: boolean;
  session?: SessionUser;
  className?: string;
  onNavigate?: () => void;
}) {
  const navItems: NavItem[] = session
    ? getNavItemsForRoles(session.roles)
    : getNavItemsForRoles(["admin"]);
  const showNotifications = session
    ? hasAnyRole(session.roles, ["admin", "gerente"])
    : false;
  const showSettings = session ? hasRole(session.roles, "admin") : false;

  return (
    <aside
      className={cn(
        "flex h-full w-56 flex-col overflow-hidden border-r bg-card",
        className,
      )}
    >
      <div className="shrink-0 border-b px-4 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={session ? navHomeHref(session.roles) : "/dashboard"}
              prefetch={false}
              className="font-semibold tracking-tight"
            >
              Fluxo Diógenes
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Gestão de vidraçaria
            </p>
          </div>
          <NotificationBell
            enabled={showNotifications}
            panelAlign="sidebar"
            className="hidden md:block"
          />
        </div>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map(({ href, label, match }) => {
          const Icon = NAV_ICONS[match] ?? LayoutDashboard;
          const active =
            pathname === match || pathname.startsWith(`${match}/`);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        {showSettings && (
          <SettingsNavSection pathname={pathname} onNavigate={onNavigate} />
        )}
      </nav>
      {session && (
        <div className="shrink-0 border-t p-3 space-y-2">
          <div className="text-xs">
            <p className="font-medium truncate">{session.name}</p>
            <p className="text-muted-foreground">
              {formatRolesLabel(session.roles)}
            </p>
          </div>
          <LogoutButton />
        </div>
      )}
      {mockMode && (
        <div className="shrink-0 border-t p-3 text-xs text-muted-foreground">
          Modo demo (dados mock)
        </div>
      )}
    </aside>
  );
}
