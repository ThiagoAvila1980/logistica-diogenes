import { PageHeading } from "@/components/dashboard/page-heading";
import { Scissors } from "lucide-react";
import { ProductionOrderIndex } from "@/components/production/production-order-index";
import { listServiceOrders } from "@/lib/data/orders";
import { getCuttingListingForOrders } from "@/lib/data/cutting-listing";
import { shouldListOrderInCutting } from "@/lib/workflow/aggregates";
import { getSession } from "@/lib/auth/session";
import {
  canAddVaosAfterCutting,
  canDeleteMeasurement,
} from "@/lib/auth/permissions";
import {
  INSTALLATION_PHASE_STATUSES,
  TRANSPORT_PHASE_STATUSES,
  isCuttingPhaseStatus,
  isInstallationPhaseStatus,
  isTransportPhaseStatus,
} from "@/lib/transport-gates";
import { loadEspelhoTipoIds } from "@/lib/data/espelho-tipos";

export default async function ProductionIndexPage() {
  const session = await getSession();
  const canDelete = canDeleteMeasurement(session?.roles ?? []);
  const canAddVaos = canAddVaosAfterCutting(session?.roles ?? []);
  const allOrders = await listServiceOrders({
    extraStatuses: [
      ...TRANSPORT_PHASE_STATUSES,
      ...INSTALLATION_PHASE_STATUSES,
    ],
  });
  const candidateOrders = allOrders.filter(
    (order) =>
      isCuttingPhaseStatus(order.status) ||
      isTransportPhaseStatus(order.status) ||
      isInstallationPhaseStatus(order.status),
  );

  const [listingByOs, espelhoTipoIds] = await Promise.all([
    getCuttingListingForOrders(candidateOrders.map((order) => order.id)),
    loadEspelhoTipoIds(),
  ]);

  const orders = candidateOrders.filter((order) =>
    shouldListOrderInCutting(
      order.status,
      listingByOs[order.id]?.items ?? [],
      espelhoTipoIds,
    ),
  );

  const stepsByOs = Object.fromEntries(
    orders.map((order) => [
      order.id,
      listingByOs[order.id]?.cuttingSteps ?? {
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

      <ProductionOrderIndex
        orders={orders}
        stepsByOs={stepsByOs}
        canDelete={canDelete}
        canAddVaos={canAddVaos}
      />
    </div>
  );
}
