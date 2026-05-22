import { and, eq, sql } from "drizzle-orm";
import { measurements, serviceOrders } from "@/db/schema";

/**
 * Junção da medição ativa da OS — fonte dos dados de cliente.
 * Em `medicao_orcamento` usa a medição de orçamento; demais fases usam a final.
 */
export const primaryMeasurementJoin = and(
  eq(measurements.osId, serviceOrders.id),
  sql`${measurements.type} = case when ${serviceOrders.status} = 'medicao_orcamento' then 'orcamento'::measurement_types else 'final'::measurement_types end`,
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
