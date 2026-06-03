import { listServiceOrders } from "@/lib/data/orders";
import { getLogisticsSummaries } from "@/lib/data/logistics";
import { LogisticsOrderCard } from "@/components/logistics/logistics-order-card";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";
import { Truck } from "lucide-react";

export default async function LogisticsIndexPage() {
  const orders = await listServiceOrders();
  const logisticsOrders = orders.filter(
    (o) =>
      o.status.startsWith("transporte_") ||
      o.status.startsWith("instalacao") ||
      o.status === "concluido",
  );

  const summaries = await getLogisticsSummaries(
    logisticsOrders.map((o) => o.id),
  );

  return (
    <div className="space-y-4">
      <PageHeading
        title="Transporte"
        count={logisticsOrders.length}
        description="Checklist de carga, veículo em uso e comprovante de entrega."
        icon={Truck}
      />

      {logisticsOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center premium-card">
          <p className="text-sm text-muted-foreground">
            Nenhuma medição em transporte no momento.
          </p>
        </div>
      ) : (
        <ul className={ORDER_INDEX_GRID_CLASS}>
          {logisticsOrders.map((order) => (
            <li key={order.id} className="min-h-0">
              <LogisticsOrderCard
                order={order}
                logistics={summaries[order.id] ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
