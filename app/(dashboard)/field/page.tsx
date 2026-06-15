import { listServiceOrders } from "@/lib/data/orders";
import { FieldOrderIndex } from "@/components/field/field-order-index";
import { CreateMeasurementDialog } from "@/components/field/create-measurement-dialog";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Ruler } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";

export default async function FieldIndexPage() {
  const session = await getSession();
  const canCreate = hasAnyRole(session?.roles ?? [], ["admin", "gerente"]);

  const orders = await listServiceOrders();
  const fieldOrders = orders.filter((o) => o.status.startsWith("medicao"));

  return (
    <div className="space-y-4">
      <PageHeading title="Medições" count={fieldOrders.length} icon={Ruler}>
        {canCreate && <CreateMeasurementDialog />}
      </PageHeading>

      <FieldOrderIndex orders={fieldOrders} canDelete={canCreate} />
    </div>
  );
}
