import { listServiceOrders } from "@/lib/data/orders";
import { InstallationOrderCard } from "@/components/installation/installation-order-card";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Wrench } from "lucide-react";

export default async function InstallationIndexPage() {
  const orders = await listServiceOrders();
  const installationOrders = orders.filter(
    (o) =>
      o.status.startsWith("transporte_") ||
      o.status.startsWith("instalacao") ||
      o.status === "concluido",
  );

  return (
    <>
      <PageHeading
        title="Instalação"
        count={installationOrders.length}
        description="Checklist de etapas e registro fotográfico do serviço na obra."
        icon={Wrench}
      />

      {installationOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma medição em instalação no momento.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {installationOrders.map((order) => (
            <li key={order.id}>
              <InstallationOrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
