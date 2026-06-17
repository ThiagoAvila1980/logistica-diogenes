import type {
  MeasurementDbStatus,
  MeasurementDbType,
  MeasurementPriority,
  OsStatus,
} from "@/db/schema";

export type OrderListItem = {
  id: string;
  number: string;
  /** Etapa operacional do fluxo (antigo status da OS) */
  status: OsStatus;
  type: MeasurementDbType;
  measurementStatus: MeasurementDbStatus;
  priority: MeasurementPriority;
  clientName: string;
  assignedUserId: string | null;
  scheduledDate: Date | null;
  updatedAt: Date;
  budgetReference: string | null;
  hasMeasurement: boolean;
};

export type OrderDetail = OrderListItem & {
  description: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  sourcePdfUrl: string | null;
  notes: string | null;
};
