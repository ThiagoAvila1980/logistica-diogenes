import { listServiceOrders } from "@/lib/data/orders";
import { getLogisticsSummaries } from "@/lib/data/logistics";
import { getTransportStepsForOrders } from "@/lib/data/transport-steps-batch";
import { LogisticsOrderIndex } from "@/components/logistics/logistics-order-index";
import { PageHeading } from "@/components/dashboard/page-heading";
import { getSession } from "@/lib/auth/session";
import {
  isActiveTransportListing,
  isLogisticsIndexCandidate,
} from "@/lib/logistics/filter-orders";
import { canViewAllOrders } from "@/lib/auth/permissions";
import { Truck } from "lucide-react";

export default async function LogisticsIndexPage() {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const canDelete = canViewAllOrders(roles);
  const orders = await listServiceOrders();

  const candidates = orders.filter((order) =>
    isLogisticsIndexCandidate(order, roles),
  );

  const transportStepsByOs = await getTransportStepsForOrders(
    candidates.map((order) => order.id),
  );

  const logisticsOrders = candidates.filter((order) =>
    isActiveTransportListing(order, transportStepsByOs[order.id] ?? null),
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

      <LogisticsOrderIndex
        orders={logisticsOrders}
        summaries={summaries}
        transportStepsByOs={transportStepsByOs}
        canDelete={canDelete}
      />
    </div>
  );
}
