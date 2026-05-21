/** Campos usados para exibir o identificador da medição na UI (nº do orçamento). */
export type OrderDisplaySource = {
  number: string;
  budgetReference?: string | null;
  numeroOrcamento?: string | null;
};

/**
 * Número exibido ao usuário: prioriza nº do orçamento da medição,
 * depois referência na OS; mantém número interno da OS só como fallback.
 */
export function getOrderDisplayNumber(order: OrderDisplaySource): string {
  const fromMeasurement = order.numeroOrcamento?.trim();
  if (fromMeasurement) return fromMeasurement;

  const fromBudget = order.budgetReference?.trim();
  if (fromBudget) return fromBudget;

  return order.number;
}
