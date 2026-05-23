import { and, eq, sql, type SQL } from "drizzle-orm";
import { measurements, serviceOrders } from "@/db/schema";
import type { MeasurementDbType } from "@/lib/workflow/measurement-actions";

/** Compara `measurements.type` com cast explícito (Postgres não aceita enum = text). */
export function eqMeasurementType(type: MeasurementDbType): SQL {
  return sql`${measurements.type} = ${type}::measurement_types`;
}

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
 * Nº do orçamento para exibição: prioriza `service_orders.budget_reference`,
 * depois `measurements.numero_orcamento` (preferindo medição de orçamento).
 */
export const resolvedBudgetReference = sql<string | null>`coalesce(
  nullif(btrim(${serviceOrders.budgetReference}), ''),
  (
    select nullif(btrim(m_ref."numero_orcamento"), '')
    from "measurements" m_ref
    where m_ref."os_id" = ${serviceOrders.id}
      and nullif(btrim(m_ref."numero_orcamento"), '') is not null
    order by case when m_ref."type" = 'orcamento'::measurement_types then 0 else 1 end
    limit 1
  )
)`;

/**
 * Subquery correlacionada: true se ao menos uma medição da OS tem itens registrados.
 * Usada no card da tela de Medições para distinguir "Pendente" de "Medida".
 */
export const hasMeasurementItems = sql<boolean>`exists (
  select 1 from "measurements" m2
  where m2."os_id" = ${serviceOrders.id}
  and m2."items" is not null
  and jsonb_array_length(m2."items") > 0
)`;
