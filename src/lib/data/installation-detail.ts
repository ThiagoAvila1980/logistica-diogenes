import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { installationLogs, transportLogs, measurements, cuttingPlans } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import type { TransportSteps, InstallationSteps, CuttingSteps } from "@/lib/transport-gates";

export type InstallationDetail = {
  osId: string;
  osStatus: OsStatus;
  cliente: string | null;
  cuttingSteps: CuttingSteps;
  transportSteps: TransportSteps;
  installationSteps: InstallationSteps;
  notes: string | null;
  servicePhotos: string[];
};

export async function getInstallationDetailForOs(
  osId: string,
  osStatus: OsStatus,
): Promise<InstallationDetail> {
  const db = getDb();

  const [meas, cutting, transport, installation] = await Promise.all([
    db
      .select({ cliente: measurements.cliente })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1),
    db
      .select({
        corteFeito: cuttingPlans.corteFeito,
        embalagemFeita: cuttingPlans.embalagemFeita,
        acessoriosFeitos: cuttingPlans.acessoriosFeitos,
      })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1),
    db
      .select({
        levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
        levarPerfilTotal: transportLogs.levarPerfilTotal,
        levarAcessorios: transportLogs.levarAcessorios,
        transporteConcluido: transportLogs.transporteConcluido,
      })
      .from(transportLogs)
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1),
    db
      .select({
        instalacaoEstruturalFeita: installationLogs.instalacaoEstruturalFeita,
        instalacaoVidrosFeita: installationLogs.instalacaoVidrosFeita,
        notes: installationLogs.notes,
        photos: installationLogs.photos,
      })
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, osId))
      .limit(1),
  ]);

  const cut = cutting[0];
  const trans = transport[0];
  const inst = installation[0];

  return {
    osId,
    osStatus,
    cliente: meas[0]?.cliente ?? null,
    cuttingSteps: {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
    },
    transportSteps: {
      levarPerfilEstrutural: trans?.levarPerfilEstrutural ?? false,
      levarPerfilTotal: trans?.levarPerfilTotal ?? false,
      levarAcessorios: trans?.levarAcessorios ?? false,
      transporteConcluido: trans?.transporteConcluido ?? false,
    },
    installationSteps: {
      instalacaoEstruturalFeita: inst?.instalacaoEstruturalFeita ?? false,
      instalacaoVidrosFeita: inst?.instalacaoVidrosFeita ?? false,
    },
    notes: inst?.notes ?? null,
    servicePhotos: inst?.photos?.service ?? [],
  };
}
