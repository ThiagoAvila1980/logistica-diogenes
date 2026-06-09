import { PageHeading } from "@/components/dashboard/page-heading";
import { Scissors } from "lucide-react";
import { ProductionOrderCard } from "@/components/production/production-order-card";
import { listServiceOrders } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { hasPendingCuttingWorkOnItems } from "@/lib/workflow/aggregates";
import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";

const CUTTING_STATUSES = new Set(["cortes", "embalagem", "acessorios_plano"]);

export default async function ProductionIndexPage() {
  const allOrders = await listServiceOrders();
  const candidateOrders = allOrders.filter(
    (o) =>
      CUTTING_STATUSES.has(o.status) || o.status.startsWith("transporte_"),
  );

  const detailsEntries = await Promise.all(
    candidateOrders.map(async (o) => {
      const detail = await getCuttingDetailForOs(o.id);
      return [o.id, detail] as const;
    }),
  );
  const detailMap = Object.fromEntries(detailsEntries);

  const orders = candidateOrders.filter((o) => {
    const detail = detailMap[o.id];
    if (!detail) return CUTTING_STATUSES.has(o.status);
    const items = detail.measurement?.items ?? [];
    if (items.length === 0) return CUTTING_STATUSES.has(o.status);
    return hasPendingCuttingWorkOnItems(items);
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Plano de corte"
        count={orders.length}
        description="Perfis, vidros, acessórios e embalagem."
        icon={Scissors}
      />

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center premium-card">
          <p className="text-sm text-muted-foreground">
            Nenhuma medição nesta etapa.
          </p>
        </div>
      ) : (
        <ul className={ORDER_INDEX_GRID_CLASS}>
          {orders.map((order) => (
            <li key={order.id} className="min-h-0">
              <ProductionOrderCard
                order={order}
                steps={
                  detailMap[order.id]?.cuttingSteps ?? {
                    corteFeito: false,
                    embalagemFeita: false,
                    acessoriosFeitos: false,
                    vidrosFeitos: false,
                  }
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
