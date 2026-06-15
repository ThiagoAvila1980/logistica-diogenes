import type { OrderListItem } from "@/lib/data/types";
import type { OrderFilterFields } from "@/lib/filters/order-filters";

export function serviceOrderFilterFields(
  order: OrderListItem,
): OrderFilterFields {
  return {
    clientName: order.clientName,
    number: order.number,
    budgetReference: order.budgetReference,
    priority: order.priority,
    scheduledDate: order.scheduledDate,
  };
}
