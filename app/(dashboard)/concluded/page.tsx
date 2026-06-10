import { BadgeCheck } from "lucide-react";
import { listConcludedOrdersDb } from "@/lib/data/concluded-orders";
import { ConcludedOrderCard } from "@/components/concluded/concluded-order-card";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";

export default async function ConcludedPage() {
  const orders = await listConcludedOrdersDb();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Concluídos"
        count={orders.length}
        description="Progresso de instalação por vão — atualizado em tempo real conforme o instalador avança."
        icon={BadgeCheck}
      />

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center premium-card">
          <p className="text-sm text-muted-foreground">
            Nenhuma instalação em andamento no momento.
          </p>
        </div>
      ) : (
        <ul className={ORDER_INDEX_GRID_CLASS}>
          {orders.map((order) => (
            <li key={order.id} className="min-h-0">
              <ConcludedOrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
