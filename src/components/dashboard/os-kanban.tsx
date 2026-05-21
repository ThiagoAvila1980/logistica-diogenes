import Link from "next/link";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { PriorityBadge } from "./priority-badge";
import { KanbanStatusBadge } from "@/components/kanban/kanban-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OsKanban({ orders }: { orders: OrderListItem[] }) {
  const phasesWithOrders = KANBAN_PHASES.filter((phase) =>
    orders.some((o) => phase.statuses.includes(o.status)),
  );

  if (phasesWithOrders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma ordem de serviço encontrada.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {phasesWithOrders.map((phase) => {
        const phaseOrders = orders.filter((o) =>
          phase.statuses.includes(o.status),
        );

        return (
          <div key={phase.id} className="min-w-0">
            <Card className="h-full bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {phase.title}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {phaseOrders.length} OS
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                {phaseOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/${order.id}`}
                    className="block rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">
                        {getOrderDisplayNumber(order)}
                      </span>
                      <PriorityBadge priority={order.priority} />
                    </div>
                    <p className="mt-2 text-sm font-medium leading-tight">
                      {order.clientName}
                    </p>
                    <div className="mt-2">
                      <KanbanStatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
