import { BadgeCheck } from "lucide-react";
import { listConcludedOrdersDb } from "@/lib/data/concluded-orders";
import { ConcludedOrderIndex } from "@/components/concluded/concluded-order-index";
import { PageHeading } from "@/components/dashboard/page-heading";

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

      <ConcludedOrderIndex orders={orders} />
    </div>
  );
}
