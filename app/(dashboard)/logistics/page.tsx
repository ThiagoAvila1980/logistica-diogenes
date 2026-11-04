import { listServiceOrders } from "@/lib/data/orders";
import { getLogisticsSummaries } from "@/lib/data/logistics";
import { getTransportListingProgressForOrders } from "@/lib/data/transport-steps-batch";
import { LogisticsOrderIndex } from "@/components/logistics/logistics-order-index";
import { PageHeading } from "@/components/dashboard/page-heading";
import { getSession } from "@/lib/auth/session";
import {
  isActiveTransportListing,
  isLogisticsIndexCandidate,
} from "@/lib/logistics/filter-orders";
import { hasPendingTransportWorkForDriver } from "@/lib/logistics/transport-driver-access";
import { hasPendingLogisticsWorkOnItems } from "@/lib/workflow/aggregates";
import { loadEspelhoTipoIds } from "@/lib/data/espelho-tipos";
import { canDeleteMeasurement, canViewAllOrders } from "@/lib/auth/permissions";
import { Truck } from "lucide-react";

export default async function LogisticsIndexPage() {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const canDelete = canDeleteMeasurement(roles);
  const viewAll = canViewAllOrders(roles);
  const orders = await listServiceOrders();

  const candidates = orders.filter((order) =>
    isLogisticsIndexCandidate(order, roles),
  );

  const [listingByOs, espelhoTipoIds] = await Promise.all([
    getTransportListingProgressForOrders(candidates.map((order) => order.id)),
    loadEspelhoTipoIds(),
  ]);

  const logisticsOrders = candidates.filter((order) => {
    const entry = listingByOs[order.id];
    const steps = entry?.steps ?? null;
    if (order.status === "concluido") {
      const pending = hasPendingLogisticsWorkOnItems(
        entry?.items ?? [],
        espelhoTipoIds,
      );
      if (!viewAll && session) {
        return isActiveTransportListing(order, steps, {
          hasOperatorPendingWork:
            pending &&
            hasPendingTransportWorkForDriver(
              entry?.items ?? [],
              session.userId,
              espelhoTipoIds,
            ),
        });
      }
      return isActiveTransportListing(order, steps, {
        hasPendingTransportWork: pending,
      });
    }
    if (!viewAll && session) {
      return isActiveTransportListing(order, steps, {
        hasOperatorPendingWork: hasPendingTransportWorkForDriver(
          entry?.items ?? [],
          session.userId,
          espelhoTipoIds,
        ),
      });
    }
    return isActiveTransportListing(order, steps);
  });

  const transportStepsByOs = Object.fromEntries(
    Object.entries(listingByOs).map(([id, entry]) => [id, entry.steps]),
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
