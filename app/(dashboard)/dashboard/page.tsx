import Link from "next/link";
import { listServiceOrders } from "@/lib/data/orders";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { OsKanban } from "@/components/dashboard/os-kanban";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const orders = await listServiceOrders();

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} ordens de serviço — arraste pelo kanban ou abra o
            detalhe para avançar etapas.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/field">Ir para campo →</Link>
        </Button>
      </div>

      <OsKanban orders={orders} />

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Lista rápida</h2>
        <ul className="divide-y rounded-lg border">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/dashboard/${order.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
              >
                <span className="font-mono text-sm">
                  {getOrderDisplayNumber(order)}
                </span>
                <span className="text-sm">{order.clientName}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
