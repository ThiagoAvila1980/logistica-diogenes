import { PageHeading } from "@/components/dashboard/page-heading";
import { Scissors } from "lucide-react";
import { ProductionOrderCard } from "@/components/production/production-order-card";
import { listServiceOrders } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { hasPendingCuttingSteps } from "@/lib/transport-gates";
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
      return [o.id, detail.cuttingSteps] as const;
    }),
  );
  const stepsMap = Object.fromEntries(detailsEntries);

  const orders = candidateOrders.filter((o) => {
    const steps = stepsMap[o.id];
    if (!steps) return CUTTING_STATUSES.has(o.status);
    return hasPendingCuttingSteps({
      corteFeito: steps.corte,
      embalagemFeita: steps.embalagem,
      acessoriosFeitos: steps.acessorios,
      vidrosFeitos: steps.vidros,
    });
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
                  stepsMap[order.id] ?? {
                    corte: false,
                    embalagem: false,
                    acessorios: false,
                    vidros: false,
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
