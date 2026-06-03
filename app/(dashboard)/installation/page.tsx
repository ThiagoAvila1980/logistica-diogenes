import { listServiceOrders } from "@/lib/data/orders";
import { InstallationOrderCard } from "@/components/installation/installation-order-card";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";
import { Hammer } from "lucide-react";

export default async function InstallationIndexPage() {
  const orders = await listServiceOrders();
  const installationOrders = orders.filter(
    (o) =>
      o.status.startsWith("transporte_") ||
      o.status.startsWith("instalacao") ||
      o.status === "concluido",
  );

  return (
    <div className="space-y-4">
      <PageHeading
        title="Instalação"
        count={installationOrders.length}
        description="Checklist de etapas e registro fotográfico do serviço na obra."
        icon={Hammer}
      />

      {installationOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center premium-card">
          <p className="text-sm text-muted-foreground">
            Nenhuma medição em instalação no momento.
          </p>
        </div>
      ) : (
        <ul className={ORDER_INDEX_GRID_CLASS}>
          {installationOrders.map((order) => (
            <li key={order.id} className="min-h-0">
              <InstallationOrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
