"use client";

import { FieldOrderCard } from "@/components/field/field-order-card";
import { ArchiveMeasurementDialog } from "@/components/field/archive-measurement-dialog";
import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { OrderListItem } from "@/lib/data/types";

type FieldOrderCardWithDeleteProps = {
  order: OrderListItem;
  canDelete: boolean;
  canArchive?: boolean;
  showArchive?: boolean;
};

export function FieldOrderCardWithDelete({
  order,
  canDelete,
  canArchive = canDelete,
  showArchive = true,
}: FieldOrderCardWithDeleteProps) {
  const displayNumber = getOrderDisplayNumber(order);
  const actions =
    canDelete || (canArchive && showArchive) ? (
      <div
        className="flex shrink-0 items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {canArchive && showArchive && (
          <ArchiveMeasurementDialog
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
          />
        )}
        {canDelete && (
          <DeleteMeasurementDialog
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
          />
        )}
      </div>
    ) : null;

  return <FieldOrderCard order={order} actions={actions} />;
}
