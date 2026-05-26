import { listServiceOrders } from "@/lib/data/orders";
import { InstallationOrderCard } from "@/components/installation/installation-order-card";
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
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-xl font-bold sm:text-2xl">Instalação</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Checklist de etapas e registro fotográfico do serviço na obra.
        </p>
      </header>

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
    </div>
  );
}
