import { listServiceOrders } from "@/lib/data/orders";
import { getInstallationListingProgressForOrders } from "@/lib/data/installation-steps-batch";
import { getInstallationSummaries } from "@/lib/data/installation";
import { InstallationOrderIndex } from "@/components/installation/installation-order-index";
import { PageHeading } from "@/components/dashboard/page-heading";
import { getSession } from "@/lib/auth/session";
import {
  isActiveInstallationListing,
  isInstallationIndexCandidate,
} from "@/lib/installation/filter-orders";
import { hasPendingInstallationWorkForInstaller } from "@/lib/installation/installation-installer-access";
import { canViewAllOrders } from "@/lib/auth/permissions";
import { Hammer } from "lucide-react";

export default async function InstallationIndexPage() {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const orders = await listServiceOrders();
  const viewAll = canViewAllOrders(roles);

  const candidates = orders.filter((order) =>
    isInstallationIndexCandidate(order, roles),
  );

  const listingByOs = await getInstallationListingProgressForOrders(
    candidates.map((order) => order.id),
  );

  const installationOrders = candidates.filter((order) => {
    const entry = listingByOs[order.id];
    if (!entry) {
      // Sem medição/items: gestor segue regra padrão; instalador não vê.
      if (!viewAll) return false;
      return isActiveInstallationListing(order, null);
    }
    const { items, ...progress } = entry;
    if (!viewAll && session) {
      return isActiveInstallationListing(order, progress, {
        hasOperatorPendingWork: hasPendingInstallationWorkForInstaller(
          items,
          session.userId,
        ),
      });
    }
    return isActiveInstallationListing(order, progress);
  });

  const installationStepsByOs = Object.fromEntries(
    Object.entries(listingByOs).map(([id, { items: _items, ...progress }]) => [
      id,
      progress,
    ]),
  );

  const isManager = viewAll;
  const canDelete = isManager;
  const installerIdFilter =
    !isManager && session ? session.userId : undefined;

  const summaries = await getInstallationSummaries(
    installationOrders.map((order) => order.id),
    installerIdFilter,
  );

  return (
    <div className="space-y-4">
      <PageHeading
        title="Instalação"
        count={installationOrders.length}
        description="Checklist de etapas e registro fotográfico do serviço na obra."
        icon={Hammer}
      />

      <InstallationOrderIndex
        orders={installationOrders}
        summaries={summaries}
        installationStepsByOs={installationStepsByOs}
        canDelete={canDelete}
      />
    </div>
  );
}
