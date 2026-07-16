export type StepCompletionMeta = {
  actorName: string;
  completedAt: Date;
};

/** itemId → step → meta do último step_checked */
export type StepCompletionMetaMap = Record<
  string,
  Partial<Record<string, StepCompletionMeta>>
>;

export function formatStepAuditLabel(meta: StepCompletionMeta): string {
  const when = meta.completedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Feito por ${meta.actorName} em ${when}`;
}

type StepCheckedRow = {
  itemId: string | null;
  actorName: string | null;
  createdAt: Date;
  payload: Record<string, unknown> | null | undefined;
};

/** Reduz eventos step_checked (já ordenados DESC) ao mais recente por item+step. */
export function buildStepCompletionMetaMap(
  rows: StepCheckedRow[],
): StepCompletionMetaMap {
  const map: StepCompletionMetaMap = {};

  for (const row of rows) {
    if (!row.itemId) continue;
    const step = row.payload?.step;
    if (typeof step !== "string" || !step) continue;
    const actorName = row.actorName?.trim();
    if (!actorName) continue;

    const byItem = map[row.itemId] ?? {};
    if (byItem[step]) continue; // já tem o mais recente
    byItem[step] = {
      actorName,
      completedAt: row.createdAt,
    };
    map[row.itemId] = byItem;
  }

  return map;
}
