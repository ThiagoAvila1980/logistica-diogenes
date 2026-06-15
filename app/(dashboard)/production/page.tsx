import { PageHeading } from "@/components/dashboard/page-heading";
import { Scissors } from "lucide-react";
import { ProductionOrderIndex } from "@/components/production/production-order-index";
import { listServiceOrders } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { hasPendingCuttingWorkOnItems } from "@/lib/workflow/aggregates";

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

  const stepsByOs = Object.fromEntries(
    orders.map((order) => [
      order.id,
      detailMap[order.id]?.cuttingSteps ?? {
        corteFeito: false,
        embalagemFeita: false,
        acessoriosFeitos: false,
        vidrosFeitos: false,
      },
    ]),
  );

  return (
    <div className="space-y-4">
      <PageHeading
        title="Plano de corte"
        count={orders.length}
        description="Perfis, vidros, acessórios e embalagem."
        icon={Scissors}
      />

      <ProductionOrderIndex orders={orders} stepsByOs={stepsByOs} />
    </div>
  );
}
