import { and, eq, sql } from "drizzle-orm";
import { measurements, serviceOrders } from "@/db/schema";
import { FINAL_MEASUREMENT_TYPE } from "@/lib/workflow/measurement-actions";

/** Junção da medição principal (final) da OS — fonte dos dados de cliente. */
export const primaryMeasurementJoin = and(
  eq(measurements.osId, serviceOrders.id),
  eq(measurements.type, FINAL_MEASUREMENT_TYPE),
);

export const measurementClientName = sql<string>`coalesce(${measurements.cliente}, 'Cliente não informado')`;

export const measurementClientPhone = measurements.telefone;
