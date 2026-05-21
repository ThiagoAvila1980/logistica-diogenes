import type { OsStatus } from "@/db/schema";
import type { MeasurementFlow } from "@/db/schema";

export type OrderListItem = {
  id: string;
  number: string;
  status: OsStatus;
  measurementFlow: MeasurementFlow;
  priority: "baixa" | "normal" | "alta" | "urgente";
  clientName: string;
  assignedUserId: string | null;
  scheduledDate: Date | null;
  updatedAt: Date;
  budgetReference: string | null;
};

export type OrderDetail = OrderListItem & {
  description: string | null;
  revisionReason: string | null;
  revisionFromStatus: OsStatus | null;
  clientPhone: string | null;
  sourcePdfUrl: string | null;
};
