/** Grid responsivo para listagens de OS/medições em cards (padrão /field). */
export const ORDER_INDEX_GRID_CLASS =
  "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>li]:min-w-0";

/** Linhas visíveis por página nas listagens de cards (× colunas do grid). */
export const ORDER_INDEX_ROWS = 4;

/** Colunas do grid por breakpoint (Tailwind: sm=640px, lg=1024px). */
export function getOrderIndexGridColumns(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

export function getOrderIndexPageSize(
  width: number,
  rows = ORDER_INDEX_ROWS,
): number {
  return rows * getOrderIndexGridColumns(width);
}
