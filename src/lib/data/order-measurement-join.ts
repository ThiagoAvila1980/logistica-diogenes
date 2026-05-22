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

/**
 * Subquery correlacionada: true se ao menos uma medição da OS tem itens registrados.
 * Usada no card da tela de Medições para distinguir "Liberada" de "Medida".
 */
export const hasMeasurementItems = sql<boolean>`exists (
  select 1 from "measurements" m2
  where m2."os_id" = ${serviceOrders.id}
  and m2."items" is not null
  and jsonb_array_length(m2."items") > 0
)`;
