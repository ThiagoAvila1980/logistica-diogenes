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
  /** true quando o medidor já registrou itens de medição (items não vazio). */
  hasMeasurement: boolean;
};

export type OrderDetail = OrderListItem & {
  description: string | null;
  revisionReason: string | null;
  revisionFromStatus: OsStatus | null;
  clientPhone: string | null;
  sourcePdfUrl: string | null;
};
