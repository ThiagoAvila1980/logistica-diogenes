import { sql, type SQL } from "drizzle-orm";
import { measurements } from "@/db/schema";
import type { MeasurementDbType } from "@/lib/workflow/measurement-actions";

/** Compara `measurements.type` com cast explícito (Postgres não aceita enum = text). */
export function eqMeasurementType(type: MeasurementDbType): SQL {
  return sql`${measurements.type} = ${type}::measurement_types`;
}

export const measurementClientName = sql<string>`coalesce(${measurements.cliente}, 'Cliente não informado')`;

export const measurementClientPhone = measurements.telefone;

export const measurementClientAddress = measurements.endereco;

export const resolvedBudgetReference = sql<string | null>`coalesce(
  nullif(btrim(${measurements.budgetReference}), ''),
  nullif(btrim(${measurements.numeroOrcamento}), '')
)`;

/** true quando a medição já foi registrada (status = medida ou itens preenchidos). */
export const hasMeasurementItems = sql<boolean>`(
  ${measurements.status} = 'medida'::measurement_status
  OR (
    ${measurements.items} IS NOT NULL
    AND jsonb_array_length(${measurements.items}) > 0
  )
)`;
