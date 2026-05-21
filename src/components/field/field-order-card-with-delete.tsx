"use client";

import { FieldOrderCard } from "@/components/field/field-order-card";
import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { OrderListItem } from "@/lib/data/types";

type FieldOrderCardWithDeleteProps = {
  order: OrderListItem;
  canDelete: boolean;
};

export function FieldOrderCardWithDelete({
  order,
  canDelete,
}: FieldOrderCardWithDeleteProps) {
  const displayNumber = getOrderDisplayNumber(order);

  return (
    <div className="flex items-stretch gap-1">
      <div className="min-w-0 flex-1">
        <FieldOrderCard order={order} />
      </div>
      {canDelete && (
        <div
          className="flex shrink-0 items-center pr-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DeleteMeasurementDialog
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
            variant="list"
          />
        </div>
      )}
    </div>
  );
}
