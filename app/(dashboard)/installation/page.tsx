import { listServiceOrders } from "@/lib/data/orders";
import { getInstallationStepsForOrders } from "@/lib/data/installation-steps-batch";
import { InstallationOrderIndex } from "@/components/installation/installation-order-index";
import { PageHeading } from "@/components/dashboard/page-heading";
import { getSession } from "@/lib/auth/session";
import {
  isActiveInstallationListing,
  isInstallationIndexCandidate,
} from "@/lib/installation/filter-orders";
import { Hammer } from "lucide-react";

export default async function InstallationIndexPage() {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const orders = await listServiceOrders();

  const candidates = orders.filter((order) =>
    isInstallationIndexCandidate(order, roles),
  );

  const installationStepsByOs = await getInstallationStepsForOrders(
    candidates.map((order) => order.id),
  );

  const installationOrders = candidates.filter((order) =>
    isActiveInstallationListing(
      order,
      installationStepsByOs[order.id] ?? null,
    ),
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
        installationStepsByOs={installationStepsByOs}
      />
    </div>
  );
}
