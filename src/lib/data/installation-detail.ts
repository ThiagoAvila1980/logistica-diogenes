import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { installationLogs, transportLogs, measurements } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import type { TransportSteps, InstallationSteps, CuttingSteps } from "@/lib/transport-gates";
import type { MeasurementLineItem, InstallationDailyNote } from "@/lib/workflow/schemas";
import { resolveUploadDisplayUrl } from "@/lib/upload/resolve-display-url";
import {
  aggregateCuttingStepsFromItems,
  aggregateTransportStepsFromItems,
  aggregateInstallationStepsFromItems,
  effectiveCuttingSteps,
  isInstallationOrLater,
} from "@/lib/workflow/aggregates";

/**
 * @deprecated Importe de `@/lib/workflow/aggregates`.
 * Reexport mantido para compatibilidade com importadores existentes.
 */
export { aggregateInstallationStepsFromItems };

async function resolveItemMedia(items: MeasurementLineItem[]): Promise<MeasurementLineItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      drawingUrl: item.drawingUrl
        ? await resolveUploadDisplayUrl(item.drawingUrl)
        : item.drawingUrl,
      drawings: item.drawings?.length
        ? await Promise.all(
            item.drawings.map(async (d) => ({
              ...d,
              url: await resolveUploadDisplayUrl(d.url),
            })),
          )
        : item.drawings,
      photos: item.photos?.length
        ? await Promise.all(item.photos.map((url) => resolveUploadDisplayUrl(url)))
        : item.photos,
    })),
  );
}

export type InstallationDetail = {
  osId: string;
  osStatus: OsStatus;
  cliente: string | null;
  items: MeasurementLineItem[];
  cuttingSteps: CuttingSteps;
  transportSteps: TransportSteps;
  installationSteps: InstallationSteps;
  notes: string | null;
  servicePhotos: string[];
  dailyNotes: InstallationDailyNote[];
};

export async function getInstallationDetailForOs(
  osId: string,
  osStatus: OsStatus,
): Promise<InstallationDetail> {
  const db = getDb();

  const isLatePhase = isInstallationOrLater(osStatus);

  const [measRows, transport, installation] = await Promise.all([
    db
      .select({ cliente: measurements.cliente, items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1),
    db
      .select({
        levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
        levarPerfilTotal: transportLogs.levarPerfilTotal,
        levarAcessorios: transportLogs.levarAcessorios,
        levarVidros: transportLogs.levarVidros,
        transporteConcluido: transportLogs.transporteConcluido,
      })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1),
    db
      .select({
        instalacaoEstruturalFeita: installationLogs.instalacaoEstruturalFeita,
        instalacaoVidrosFeita: installationLogs.instalacaoVidrosFeita,
        instalacaoAcabamentoFeito: installationLogs.instalacaoAcabamentoFeito,
        notes: installationLogs.notes,
        dailyNotes: installationLogs.dailyNotes,
        photos: installationLogs.photos,
      })
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, osId))
      .limit(1),
  ]);

  const meas = measRows[0];
  const trans = transport[0];
  const inst = installation[0];
  const rawItems = (meas?.items as MeasurementLineItem[]) ?? [];
  const items = await resolveItemMedia(rawItems);

  // Cutting steps from items aggregate
  const cuttingSteps: CuttingSteps = effectiveCuttingSteps(
    aggregateCuttingStepsFromItems(items),
    isLatePhase,
  );

  // Transport steps from items aggregate (with fallback to transport_logs)
  const hasTransportPerVaoData = items.some((i) => i.transportProgress !== undefined);
  const transportSteps: TransportSteps = hasTransportPerVaoData
    ? aggregateTransportStepsFromItems(items)
    : {
        levarPerfilEstrutural: trans?.levarPerfilEstrutural ?? false,
        levarPerfilTotal: trans?.levarPerfilTotal ?? false,
        levarAcessorios: trans?.levarAcessorios ?? false,
        levarVidros: trans?.levarVidros ?? false,
        transporteConcluido: trans?.transporteConcluido ?? false,
      };

  // Installation steps from items aggregate (with fallback to installation_logs)
  const hasInstPerVaoData = items.some((i) => i.installationProgress !== undefined);
  const installationSteps: InstallationSteps = hasInstPerVaoData
    ? aggregateInstallationStepsFromItems(items)
    : {
        instalacaoEstruturalFeita: inst?.instalacaoEstruturalFeita ?? false,
        instalacaoVidrosFeita: inst?.instalacaoVidrosFeita ?? false,
        instalacaoAcabamentoFeito: inst?.instalacaoAcabamentoFeito ?? false,
      };

  return {
    osId,
    osStatus,
    cliente: meas?.cliente ?? null,
    items,
    cuttingSteps,
    transportSteps,
    installationSteps,
    notes: inst?.notes ?? null,
    servicePhotos: inst?.photos?.service ?? [],
    dailyNotes: inst?.dailyNotes ?? [],
  };
}
