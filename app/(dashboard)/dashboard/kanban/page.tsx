import Link from "next/link";
import { redirect } from "next/navigation";
import { listKanbanOrders } from "@/lib/data/kanban";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canUseKanban, getDefaultRouteForRoles } from "@/lib/auth/permissions";

export default async function KanbanPage() {
  const session = await getSession();
  if (!session || !canUseKanban(session.roles)) {
    redirect(session ? getDefaultRouteForRoles(session.roles) : "/login");
  }

  const orders = await listKanbanOrders();

  return (
    <div className="flex h-full min-h-0 flex-col p-2 lg:p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-0.5 h-7 -ml-2 px-2 text-xs">
            <Link href="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5" />
              Painel
            </Link>
          </Button>
          <h1 className="truncate text-lg font-bold tracking-tight lg:text-xl">
            Kanban — ordens de serviço
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {orders.length} orçamentos · arraste entre colunas válidas
          </p>
        </div>
      </div>

      <KanbanBoard initialData={orders} />
    </div>
  );
}
