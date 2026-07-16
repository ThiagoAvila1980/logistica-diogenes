import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getPedidoByMeasurementId } from "@/lib/data/pedidos";
import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";
import { PageHeading } from "@/components/dashboard/page-heading";
import { PedidoManageForm } from "@/components/field/pedido-manage-form";
import { getOrderDisplayNumber } from "@/lib/order-display";

type Props = { params: Promise<{ osId: string }> };

export default async function PedidosPage({ params }: Props) {
  const { osId } = await params;

  const [order, pedido, session] = await Promise.all([
    getServiceOrderById(osId),
    getPedidoByMeasurementId(osId),
    getSession(),
  ]);

  if (!order) notFound();

  const canEdit = hasAnyRole(session?.roles ?? [], ["admin", "gerente"]);
  const displayNumber = getOrderDisplayNumber(order);

  return (
    <div className="space-y-4">
      <PageHeading
        title="Pedido"
        icon={Package}
        backHref="/field"
        backAriaLabel="Voltar às medições"
        description={`${displayNumber} — ${order.clientName}`}
      />
      <PedidoManageForm
        osId={osId}
        pedido={pedido}
        canEdit={canEdit}
      />
    </div>
  );
}
