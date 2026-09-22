"use client";

import { FieldOrderCard } from "@/components/field/field-order-card";
import { ArchiveMeasurementDialog } from "@/components/field/archive-measurement-dialog";
import { UnarchiveMeasurementDialog } from "@/components/field/unarchive-measurement-dialog";
import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { OrderListItem } from "@/lib/data/types";

type FieldOrderCardWithDeleteProps = {
  order: OrderListItem;
  canDelete: boolean;
  canArchive?: boolean;
  /** true = lista ativa (mostra Arquivar); false = lista de arquivadas (mostra Desarquivar) */
  showArchive?: boolean;
};

export function FieldOrderCardWithDelete({
  order,
  canDelete,
  canArchive = canDelete,
  showArchive = true,
}: FieldOrderCardWithDeleteProps) {
  const displayNumber = getOrderDisplayNumber(order);
  const showUnarchive = canArchive && !showArchive;
  const showArchiveButton = canArchive && showArchive;

  const actions =
    canDelete || showArchiveButton || showUnarchive ? (
      <div
        className="flex shrink-0 items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {showArchiveButton && (
          <ArchiveMeasurementDialog
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
          />
        )}
        {showUnarchive && (
          <UnarchiveMeasurementDialog
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
