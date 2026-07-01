import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SwRegister } from "@/components/offline/sw-register";
import { PwaInstallPrompt } from "@/components/offline/pwa-install-prompt";
import { getSession } from "@/lib/auth/session";
import {
  getRoleScreenMatrix,
  canAccessRouteDynamic,
  getNavItemsForRolesDynamic,
  canSeeAdministrativeNav,
} from "@/lib/auth/role-access";
import { hasAnyRole, hasRole } from "@/lib/auth/permissions";
import { isAdminOnlyPath } from "@/lib/auth/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Lê o pathname injetado pelo middleware
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "/";

  // Gate dinâmico para as telas operacionais (não-admin)
  if (!isAdminOnlyPath(pathname)) {
    const matrix = await getRoleScreenMatrix();
    if (!canAccessRouteDynamic(session.roles, pathname, matrix)) {
      redirect("/unauthorized");
    }
  }

  // Calcula nav e flags no servidor com a matriz dinâmica
  const matrix = await getRoleScreenMatrix();
  const navItems = getNavItemsForRolesDynamic(session.roles, matrix);
  const showNotifications = hasAnyRole(session.roles, ["admin", "gerente"]);
  const showSettings = hasRole(session.roles, "admin");
  const showAdministrative = canSeeAdministrativeNav(session.roles, matrix);
  const showReports = hasRole(session.roles, "admin");

  return (
    <>
      <SwRegister />
      <PwaInstallPrompt />
      <DashboardShell
        session={session}
        navItems={navItems}
        showNotifications={showNotifications}
        showSettings={showSettings}
        showAdministrative={showAdministrative}
        showReports={showReports}
      >
        {children}
      </DashboardShell>
    </>
  );
}
