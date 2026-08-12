"use client";

import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { OrderListItem } from "@/lib/data/types";

type OrderCardDeleteActionProps = {
  order: OrderListItem;
  redirectHref: string;
};

/** Botão de excluir para embutir na linha do orçamento do card. */
export function OrderCardDeleteAction({
  order,
  redirectHref,
}: OrderCardDeleteActionProps) {
  const displayNumber = getOrderDisplayNumber(order);

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DeleteMeasurementDialog
        osId={order.id}
        displayNumber={displayNumber}
        clientName={order.clientName}
        redirectHref={redirectHref}
      />
    </div>
  );
}
