"use client";

import type { ReactNode } from "react";
import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { OrderListItem } from "@/lib/data/types";

type OrderCardWithDeleteProps = {
  order: OrderListItem;
  canDelete: boolean;
  redirectHref: string;
  children: ReactNode;
};

export function OrderCardWithDelete({
  order,
  canDelete,
  redirectHref,
  children,
}: OrderCardWithDeleteProps) {
  const displayNumber = getOrderDisplayNumber(order);

  if (!canDelete) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-w-0 items-stretch gap-1">
      <div className="min-w-0 flex-1">{children}</div>
      <div
        className="flex shrink-0 items-center pr-1"
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
    </div>
  );
}
