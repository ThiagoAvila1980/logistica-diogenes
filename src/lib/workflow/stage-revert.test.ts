import { describe, it, expect } from "vitest";
import {
  clearVaoProgressForPhase,
  getPhaseRevertTarget,
  getRevertablePhase,
  vaoHasProgressForPhase,
} from "./stage-revert";
import type { MeasurementLineItem } from "./schemas";

function makeItem(overrides: Partial<MeasurementLineItem> = {}): MeasurementLineItem {
  return {
    id: "item-1",
    qty: 1,
    largura: 1000,
    altura: 1000,
    ...overrides,
  };
}

describe("getRevertablePhase", () => {
  it("identifica a fase revertível a partir de qualquer sub-status", () => {
    expect(getRevertablePhase("instalacao_estrutural")).toBe("instalacao");
    expect(getRevertablePhase("instalacao_vidros")).toBe("instalacao");
    expect(getRevertablePhase("transporte_perfil")).toBe("transporte");
    expect(getRevertablePhase("transporte_levar_vidro")).toBe("transporte");
    expect(getRevertablePhase("cortes")).toBe("plano_corte");
    expect(getRevertablePhase("acessorios_plano")).toBe("plano_corte");
  });

  it("retorna null para medição e concluído (não há fase anterior a voltar)", () => {
    expect(getRevertablePhase("medicao_orcamento")).toBeNull();
    expect(getRevertablePhase("medicao_final")).toBeNull();
    expect(getRevertablePhase("concluido")).toBeNull();
  });
});

describe("getPhaseRevertTarget", () => {
  it("mapeia cada fase para a etapa de destino correta", () => {
    expect(getPhaseRevertTarget("instalacao_vidros")).toBe("transporte_levar_vidro");
    expect(getPhaseRevertTarget("transporte_acessorios")).toBe("acessorios_plano");
    expect(getPhaseRevertTarget("embalagem")).toBe("medicao_final");
  });

  it("retorna null quando a fase não é revertível", () => {
    expect(getPhaseRevertTarget("medicao_orcamento")).toBeNull();
    expect(getPhaseRevertTarget("concluido")).toBeNull();
  });
});

describe("vaoHasProgressForPhase / clearVaoProgressForPhase", () => {
  it("detecta e limpa progresso de instalação", () => {
    const item = makeItem({
      installationProgress: { estrutural: true, vidros: true, acabamento: false },
    });
    expect(vaoHasProgressForPhase(item, "instalacao")).toBe(true);

    const cleared = clearVaoProgressForPhase(item, "instalacao");
    expect(cleared.installationProgress).toBeUndefined();
    expect(vaoHasProgressForPhase(cleared, "instalacao")).toBe(false);
  });

  it("detecta e limpa progresso de transporte", () => {
    const item = makeItem({
      transportProgress: { perfilEstrutural: true, perfilTotal: false, acessorios: false, vidros: false },
    });
    expect(vaoHasProgressForPhase(item, "transporte")).toBe(true);

    const cleared = clearVaoProgressForPhase(item, "transporte");
    expect(cleared.transportProgress).toBeUndefined();
  });

  it("detecta e limpa progresso de corte, incluindo sentToCutting", () => {
    const item = makeItem({
      sentToCutting: true,
      cuttingProgress: { corte: true, embalagem: false, acessorios: false, vidros: false },
    });
    expect(vaoHasProgressForPhase(item, "plano_corte")).toBe(true);

    const cleared = clearVaoProgressForPhase(item, "plano_corte");
    expect(cleared.cuttingProgress).toBeUndefined();
    expect(cleared.sentToCutting).toBe(false);
  });

  it("não altera outros campos do vão", () => {
    const item = makeItem({
      idAmbiente: "11111111-1111-1111-1111-111111111111",
      installationProgress: { estrutural: true, vidros: true, acabamento: true },
    });
    const cleared = clearVaoProgressForPhase(item, "instalacao");
    expect(cleared.id).toBe(item.id);
    expect(cleared.idAmbiente).toBe(item.idAmbiente);
  });
});
