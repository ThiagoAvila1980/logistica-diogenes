"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/auth/permissions";

function getMobileTitle(pathname: string): string {
  if (pathname.startsWith("/field")) return "Medições";
  if (pathname === "/dashboard") return "Painel";
  if (pathname.startsWith("/production")) return "Corte e Logística";
  if (pathname.startsWith("/logistics")) return "Transporte";
  if (pathname.startsWith("/installation")) return "Instalação";
  if (pathname.startsWith("/concluded")) return "Concluídos";
  if (pathname.startsWith("/admin/users")) return "Usuários";
  if (pathname.startsWith("/admin/vehicles")) return "Veículos";
  if (pathname.startsWith("/admin/cores")) return "Cores";
  if (pathname.startsWith("/admin/tipo-vidro")) return "Tipo de vidro";
  if (pathname.startsWith("/admin/tipo-envidracamento")) {
    return "Tipo de envidraçamento";
  }
  if (pathname.startsWith("/admin/permissions")) return "Visualização de telas";
  if (pathname.startsWith("/admin/auditoria")) return "Auditoria";
  if (pathname.startsWith("/reports/services")) return "Jornada dos serviços";
  if (pathname.startsWith("/reports/kpis")) return "Indicadores Operacionais";
  if (pathname.startsWith("/reports/backlog")) return "Pendências e Prazos";
  if (pathname.startsWith("/reports/team")) return "Produtividade";
  if (pathname.startsWith("/reports/logistics")) return "Logística";
  if (pathname.startsWith("/reports/products")) return "Produtos";
  if (pathname.startsWith("/reports")) return "Relatórios";
  if (pathname.startsWith("/admin")) return "Configurações";
  return "Logística Diógenes";
}

export function DashboardShell({
  children,
  session,
  navItems,
  showNotifications,
  showSettings,
  showAdministrative,
  showReports,
}: {
  children: React.ReactNode;
  session?: import("@/lib/auth/session-types").SessionUser;
  navItems: NavItem[];
  showNotifications: boolean;
  showSettings: boolean;
  showAdministrative: boolean;
  showReports: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isField = pathname.startsWith("/field");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-dvh bg-background">
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-overlay/40 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <AppSidebar
        pathname={pathname}
        session={session}
        navItems={navItems}
        showNotifications={showNotifications}
        showSettings={showSettings}
        showAdministrative={showAdministrative}
        showReports={showReports}
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-dvh max-h-dvh transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
        onNavigate={() => setMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          title={getMobileTitle(pathname)}
          onMenuOpen={() => setMenuOpen(true)}
          showNotifications={showNotifications}
        />

        <main
          className={cn(
            "flex-1 overflow-x-hidden overflow-y-auto",
            "mobile-header-offset mobile-nav-offset md:pt-0 md:pb-0",
            isField && "bg-linear-to-b from-accent/40 to-muted/60",
          )}
        >
          <div className="mobile-page">{children}</div>
        </main>

        <MobileBottomNav pathname={pathname} navItems={navItems} />
      </div>
    </div>
  );
}
