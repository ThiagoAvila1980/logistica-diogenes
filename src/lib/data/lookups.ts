import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { cores, tipoEnvidracamento, tipoVidro, ambientes } from "@/db/schema";
import { useMockData } from "./config";
import type { LookupOption, MeasurementLookups } from "./lookup-types";

export type { LookupOption, MeasurementLookups } from "./lookup-types";
export { resolveLookupLabel } from "./lookup-types";

export async function listMeasurementLookups(): Promise<MeasurementLookups> {
  if (useMockData()) {
    const {
      corMockStore,
      tipoVidroMockStore,
      tipoEnvidracamentoMockStore,
      ambienteMockStore,
    } = await import("./admin-mock-store");
    return {
      cores: corMockStore.list(),
      tipoVidro: tipoVidroMockStore.list(),
      tipoEnvidracamento: tipoEnvidracamentoMockStore.list(),
      ambientes: ambienteMockStore.list(),
    };
  }

  const db = getDb();
  const [coresRows, vidroRows, envRows, ambienteRows] = await Promise.all([
    db
      .select({ id: cores.idCor, descricao: cores.descricao })
      .from(cores)
      .orderBy(asc(cores.descricao)),
    db
      .select({ id: tipoVidro.idTipoVidro, descricao: tipoVidro.descricao })
      .from(tipoVidro)
      .orderBy(asc(tipoVidro.descricao)),
    db
      .select({
        id: tipoEnvidracamento.idTipoEnvidracamento,
        descricao: tipoEnvidracamento.descricao,
      })
      .from(tipoEnvidracamento)
      .orderBy(asc(tipoEnvidracamento.descricao)),
    db
      .select({ id: ambientes.idAmbiente, descricao: ambientes.descricao })
      .from(ambientes)
      .orderBy(asc(ambientes.descricao)),
  ]);

  return {
    cores: coresRows.map((r) => ({ id: r.id, descricao: r.descricao })),
    tipoVidro: vidroRows.map((r) => ({ id: r.id, descricao: r.descricao })),
    tipoEnvidracamento: envRows.map((r) => ({
      id: r.id,
      descricao: r.descricao,
    })),
    ambientes: ambienteRows.map((r) => ({ id: r.id, descricao: r.descricao })),
  };
}
