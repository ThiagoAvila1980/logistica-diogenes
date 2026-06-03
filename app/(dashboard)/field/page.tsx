import { listServiceOrders } from "@/lib/data/orders";
import { FieldOrderCardWithDelete } from "@/components/field/field-order-card-with-delete";
import { CreateMeasurementDialog } from "@/components/field/create-measurement-dialog";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";
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

      {fieldOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center premium-card">
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? "Nenhuma medição pendente. Toque em Nova Medição para iniciar."
              : "Nenhuma medição pendente no momento."}
          </p>
        </div>
      ) : (
        <ul className={ORDER_INDEX_GRID_CLASS}>
          {fieldOrders.map((order) => (
            <li key={order.id}>
              <FieldOrderCardWithDelete order={order} canDelete={canCreate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
