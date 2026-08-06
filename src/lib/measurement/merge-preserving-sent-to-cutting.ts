import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";

/**
 * Ao salvar medição com vãos já enviados ao corte, preserva no servidor
 * os itens com `sentToCutting` e aplica apenas as edições dos remanescentes
 * (e novos vãos). Evita apagar progresso de corte/transporte/instalação.
 */
export function mergePreservingSentToCutting(
  clientItems: MeasurementLineItem[],
  serverItems: MeasurementLineItem[],
): MeasurementLineItem[] {
  const hasSentFlag = serverItems.some((item) => item.sentToCutting === true);
  if (!hasSentFlag) {
    return sortMeasurementItemsOldestFirst(clientItems);
  }

  const sentFromServer = serverItems.filter(
    (item) => item.sentToCutting === true,
  );
  const sentIds = new Set(sentFromServer.map((item) => item.id));
  const clientUnsent = clientItems.filter((item) => !sentIds.has(item.id));

  return sortMeasurementItemsOldestFirst([...sentFromServer, ...clientUnsent]);
}
