import { AlertTriangle, RotateCcw } from "lucide-react";
import { listKanbanOrders } from "@/lib/data/kanban";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";

export default async function DashboardPage() {
  const orders = await listKanbanOrders();

  const phaseCounts = KANBAN_PHASES.map((phase) => ({
    id: phase.id,
    shortTitle: phase.shortTitle,
    count: orders.filter((o) => phase.statuses.includes(o.status)).length,
  }));

  const urgentCount = orders.filter((o) => o.priority === "urgente").length;
  const revisaoCount = orders.filter((o) => o.status === "revisao").length;

  return (
    <div className="flex h-full min-h-0 flex-col p-2 lg:p-3">
      <div className="mb-2 shrink-0 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold tracking-tight lg:text-xl">
            Kanban — Ordens de Serviço
          </h1>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {orders.length} OS
          </span>
        </div>

        
      </div>

      <KanbanBoard initialData={orders} />
    </div>
  );
}
