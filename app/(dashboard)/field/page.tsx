import { listServiceOrders } from "@/lib/data/orders";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { FieldOrderIndex } from "@/components/field/field-order-index";
import { CreateMeasurementDialog } from "@/components/field/create-measurement-dialog";
import { PageHeading } from "@/components/dashboard/page-heading";
import { SyncStatusBar } from "@/components/offline/sync-status-bar";
import { FieldCacheHydrator } from "@/components/offline/field-cache-hydrator";
import { Ruler } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canDeleteMeasurement, hasAnyRole } from "@/lib/auth/permissions";

export default async function FieldIndexPage() {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const canCreate = hasAnyRole(roles, ["admin", "gerente"]);
  const canDelete = canDeleteMeasurement(roles);

  const [allOrders, lookups] = await Promise.all([
    listServiceOrders(),
    listMeasurementLookups(),
  ]);
  const fieldOrders = allOrders.filter((o) => o.status.startsWith("medicao"));

  return (
    <div className="space-y-4">
      <PageHeading title="Medições" count={fieldOrders.length} icon={Ruler}>
        {canCreate && <CreateMeasurementDialog />}
      </PageHeading>

      <SyncStatusBar />
      <FieldOrderIndex orders={fieldOrders} canDelete={canDelete} />
      <FieldCacheHydrator orders={fieldOrders} lookups={lookups} />
    </div>
  );
}
