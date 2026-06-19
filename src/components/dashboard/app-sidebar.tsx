import Link from "next/link";
import {
  LayoutDashboard,
  Ruler,
  Scissors,
  Truck,
  Hammer,
  BadgeCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session-types";
import { formatRolesLabel, type NavItem } from "@/lib/auth/permissions";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SettingsNavSection } from "@/components/dashboard/settings-nav-section";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/field": Ruler,
  "/production": Scissors,
  "/logistics": Truck,
  "/installation": Hammer,
  "/concluded": BadgeCheck,
  "/admin/users": Users,
};

export function AppSidebar({
  pathname,
  mockMode,
  session,
  navItems,
  showNotifications,
  showSettings,
  className,
  onNavigate,
}: {
  pathname: string;
  mockMode?: boolean;
  session?: SessionUser;
  navItems: NavItem[];
  showNotifications: boolean;
  showSettings: boolean;
  className?: string;
  onNavigate?: () => void;
}) {

  return (
    <aside
      className={cn(
        "brand-panel flex h-full w-56 flex-col overflow-hidden border-r border-primary-dark/40 text-primary-foreground shadow-[4px_0_24px_-8px_rgba(10,66,112,0.35)] safe-top md:pt-0",
        className,
      )}
    >
      <div className="relative shrink-0 border-b border-white/10 px-4 py-5">
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-brass"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={navItems[0]?.href ?? "/dashboard"}
              prefetch={false}
              className="font-semibold tracking-tight text-primary-foreground"
            >
              Logística{" "}
              <span className="text-brass">Diógenes</span>
            </Link>
            <p className="mt-1 text-xs text-primary-foreground/65">
              Gestão de vidraçaria
            </p>
          </div>
          <NotificationBell
            enabled={showNotifications}
            panelAlign="sidebar"
            className="hidden text-primary-foreground md:block [&_button]:text-primary-foreground/80 [&_button:hover]:bg-white/10 [&_button:hover]:text-primary-foreground"
          />
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3">
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
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-ls transition-all",
                active
                  ? "border-l-2 border-brass bg-white/12 font-medium text-primary-foreground shadow-sm"
                  : "border-l-2 border-transparent text-primary-foreground/70 hover:bg-white/8 hover:text-primary-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-brass")} />
              {label}
            </Link>
          );
        })}
        {showSettings && (
          <SettingsNavSection pathname={pathname} onNavigate={onNavigate} />
        )}
      </nav>

      {session && (
        <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
          <div className="rounded-lg bg-white/8 px-3 py-2 text-xs">
            <p className="truncate font-medium text-primary-foreground">
              {session.name}
            </p>
            <p className="text-primary-foreground/60">
              {formatRolesLabel(session.roles)}
            </p>
          </div>
          <LogoutButton className="w-full border-white/20 bg-white/5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" />
        </div>
      )}

      {mockMode && (
        <div className="shrink-0 border-t border-white/10 p-3 text-xs text-primary-foreground/50">
          Modo demo (dados mock)
        </div>
      )}
    </aside>
  );
}
