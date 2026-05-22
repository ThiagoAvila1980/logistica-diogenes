import { listServiceOrders } from "@/lib/data/orders";
import { FieldOrderCardWithDelete } from "@/components/field/field-order-card-with-delete";
import { CreateMeasurementDialog } from "@/components/field/create-measurement-dialog";
import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";

export default async function FieldIndexPage() {
  const session = await getSession();
  const canCreate = hasAnyRole(session?.roles ?? [], ["admin", "gerente"]);

  const orders = await listServiceOrders();
  const fieldOrders = orders.filter((o) => o.status.startsWith("medicao"));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">Medições</h1>
          {fieldOrders.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {fieldOrders.length}
            </span>
          )}
        </div>
        {canCreate && <CreateMeasurementDialog />}
      </div>

      {fieldOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? "Nenhuma medição pendente. Toque em Nova Medição para iniciar."
              : "Nenhuma medição pendente no momento."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
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
