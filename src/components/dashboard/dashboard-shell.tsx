"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { cn } from "@/lib/utils";

function getMobileTitle(pathname: string): string {
  if (pathname.startsWith("/field")) return "Medições";
  if (pathname === "/dashboard") return "Painel";
  if (pathname.startsWith("/production")) return "Corte e Logística";
  if (pathname.startsWith("/logistics")) return "Transporte";
  if (pathname.startsWith("/installation")) return "Instalação";
  if (pathname.startsWith("/quote")) return "Orçamentos";
  if (pathname.startsWith("/admin/users")) return "Usuários";
  if (pathname.startsWith("/admin/vehicles")) return "Veículos";
  if (pathname.startsWith("/admin/cores")) return "Cores";
  if (pathname.startsWith("/admin/tipo-vidro")) return "Tipo de vidro";
  if (pathname.startsWith("/admin/tipo-envidracamento")) {
    return "Tipo de envidraçamento";
  }
  if (pathname.startsWith("/admin")) return "Configurações";
  return "Logística Diógenes";
}

export function DashboardShell({
  children,
  mockMode,
  session,
}: {
  children: React.ReactNode;
  mockMode: boolean;
  session?: import("@/lib/auth/session-types").SessionUser;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isField = pathname.startsWith("/field");
  const showNotifications = session
    ? session.roles.some((role) => role === "admin" || role === "gerente")
    : false;

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
    <div className="flex min-h-[100dvh] bg-background">
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
        mockMode={mockMode}
        session={session}
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-[100dvh] max-h-[100dvh] transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0",
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
            isField && "bg-gradient-to-b from-accent/40 to-muted/60",
          )}
        >
          <div className="mobile-page">{children}</div>
        </main>

        <MobileBottomNav pathname={pathname} session={session} />
      </div>
    </div>
  );
}
