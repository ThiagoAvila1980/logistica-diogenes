import type { OsStatus } from "@/db/schema";
import { aggregateAllVaosInstallationConcluded } from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export type OsClose = {
  fromStatus: OsStatus;
  concludedAt: Date;
};

/** A OS fecha quando o último vão de instalação acaba de ser confirmado. */
export function osCloseOnVaoConfirmed(input: {
  etapa: OsStatus;
  items: MeasurementLineItem[];
  now: Date;
}): OsClose | null {
  if (input.etapa === "concluido") return null;
  if (!aggregateAllVaosInstallationConcluded(input.items)) return null;
  return { fromStatus: input.etapa, concludedAt: input.now };
}

/** Reabre a OS se um vão confirmado voltar a ficar pendente. */
export function osReopenOnVaoUnchecked(input: {
  etapa: OsStatus;
  items: MeasurementLineItem[];
  restoreStatus: OsStatus;
}): OsStatus | null {
  if (input.etapa !== "concluido") return null;
  if (aggregateAllVaosInstallationConcluded(input.items)) return null;
  if (input.restoreStatus === "concluido") return null;
  return input.restoreStatus;
}
