import { listServiceOrders } from "@/lib/data/orders";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { FieldOrderIndex } from "@/components/field/field-order-index";
import { CreateMeasurementDialog } from "@/components/field/create-measurement-dialog";
import { PageHeading } from "@/components/dashboard/page-heading";
import { SyncStatusBar } from "@/components/offline/sync-status-bar";
import { FieldCacheHydrator } from "@/components/offline/field-cache-hydrator";
import { Ruler } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  canArchiveMeasurement,
  canDeleteMeasurement,
  hasAnyRole,
} from "@/lib/auth/permissions";

export default async function FieldIndexPage() {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const canCreate = hasAnyRole(roles, ["admin", "gerente"]);
  const canDelete = canDeleteMeasurement(roles);
  const canArchive = canArchiveMeasurement(roles);

  const [activeOrders, archivedOrders, lookups] = await Promise.all([
    listServiceOrders({ archiveFilter: "active" }),
    listServiceOrders({ archiveFilter: "archived" }),
    listMeasurementLookups(),
  ]);
  const fieldActive = activeOrders.filter((o) =>
    o.status.startsWith("medicao"),
  );
  const fieldArchived = archivedOrders.filter((o) =>
    o.status.startsWith("medicao"),
  );

  return (
    <div className="space-y-4">
      <PageHeading title="Medições" icon={Ruler}>
        {canCreate && <CreateMeasurementDialog />}
      </PageHeading>

      <SyncStatusBar />
      <FieldOrderIndex
        activeOrders={fieldActive}
        archivedOrders={fieldArchived}
        canDelete={canDelete}
        canArchive={canArchive}
      />
      <FieldCacheHydrator orders={fieldActive} lookups={lookups} />
    </div>
  );
}
