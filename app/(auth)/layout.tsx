import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRouteForRoles } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect(getDefaultRouteForRoles(session.roles));
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <aside className="brand-panel relative hidden w-[42%] max-w-lg flex-col justify-between overflow-hidden p-10 text-primary-foreground lg:flex xl:max-w-xl">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brass/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <div className="brass-rule mb-6" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight xl:text-4xl">
            Logística{" "}
            <span className="text-brass">Diógenes</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            Do orçamento à instalação — gestão completa de vidraçaria com
            precisão de campo e controle de produção.
          </p>
        </div>

        <div className="relative space-y-4 text-sm text-primary-foreground/60">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-brass">
              01
            </span>
            <span>Medição e orçamento no cliente</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-brass">
              02
            </span>
            <span>Corte, transporte e instalação</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-brass">
              03
            </span>
            <span>Painel kanban em tempo real</span>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-6 safe-bottom safe-top sm:px-6 sm:py-10 lg:py-10">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Image
            src="/public/logotipo 01.png"
            alt="Diógenes Envidraçamentos Especiais"
            width={1024}
            height={1024}
            priority
            className="h-auto w-full max-w-[220px] object-contain sm:max-w-[260px] lg:max-w-[280px]"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
