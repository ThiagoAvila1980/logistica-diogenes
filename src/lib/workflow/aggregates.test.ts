import { describe, it, expect } from "vitest";
import {
  aggregateCuttingStepsFromItems,
  aggregateTransportStepsFromItems,
  aggregateInstallationStepsFromItems,
  aggregateAllVaosInstallationConcluded,
  isVaoInstallationStepsComplete,
  isVaoInstallationConcluded,
  selectInstallationLineItems,
  canOperateCuttingForItems,
  effectiveCuttingSteps,
  hasPendingCuttingWorkOnItems,
  isTransportOrLater,
  isInstallationOrLater,
} from "./aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function item(
  id: string,
  overrides: Partial<MeasurementLineItem> = {},
): MeasurementLineItem {
  return {
    id,
    qty: 1,
    largura: 100,
    altura: 100,
    ...overrides,
  };
}

describe("aggregateCuttingStepsFromItems", () => {
  it("retorna tudo falso para lista vazia", () => {
    expect(aggregateCuttingStepsFromItems([])).toEqual({
      corteFeito: false,
      embalagemFeita: false,
      acessoriosFeitos: false,
      vidrosFeitos: false,
    });
  });

  it("corteFeito é true se ALGUM vão tem corte (libera transporte paralelo)", () => {
    const items = [
      item("a", { cuttingProgress: { corte: true, embalagem: false, acessorios: false, vidros: false } }),
      item("b", { cuttingProgress: { corte: false, embalagem: false, acessorios: false, vidros: false } }),
    ];
    const agg = aggregateCuttingStepsFromItems(items);
    expect(agg.corteFeito).toBe(true);
    expect(agg.embalagemFeita).toBe(false);
  });

  it("embalagem/acessorios/vidros exigem TODOS os vãos", () => {
    const items = [
      item("a", { cuttingProgress: { corte: true, embalagem: true, acessorios: true, vidros: true } }),
      item("b", { cuttingProgress: { corte: true, embalagem: true, acessorios: true, vidros: false } }),
    ];
    const agg = aggregateCuttingStepsFromItems(items);
    expect(agg.embalagemFeita).toBe(true);
    expect(agg.acessoriosFeitos).toBe(true);
    expect(agg.vidrosFeitos).toBe(false);
  });
});

describe("hasPendingCuttingWorkOnItems", () => {
  it("detecta vão sem corte mesmo quando o agregado parece concluído", () => {
    const items = [
      item("a", {
        cuttingProgress: {
          corte: false,
          embalagem: true,
          acessorios: true,
          vidros: true,
        },
      }),
      item("b", {
        cuttingProgress: {
          corte: true,
          embalagem: true,
          acessorios: true,
          vidros: true,
        },
      }),
    ];

    expect(aggregateCuttingStepsFromItems(items).corteFeito).toBe(true);
    expect(hasPendingCuttingWorkOnItems(items)).toBe(true);
  });

  it("retorna false quando todos os vãos concluíram as 4 etapas", () => {
    const done = {
      corte: true,
      embalagem: true,
      acessorios: true,
      vidros: true,
    } as const;
    const items = [item("a", { cuttingProgress: done }), item("b", { cuttingProgress: done })];
    expect(hasPendingCuttingWorkOnItems(items)).toBe(false);
  });
});

describe("canOperateCuttingForItems", () => {
  it("permite operação em transporte quando ainda há vão sem corte", () => {
    const items = [
      item("a", {
        cuttingProgress: {
          corte: false,
          embalagem: true,
          acessorios: true,
          vidros: true,
        },
      }),
      item("b", {
        cuttingProgress: {
          corte: true,
          embalagem: true,
          acessorios: true,
          vidros: true,
        },
      }),
    ];

    expect(canOperateCuttingForItems("transporte_perfil", items)).toBe(true);
  });

  it("bloqueia operação em transporte quando todos os vãos estão completos", () => {
    const done = {
      corte: true,
      embalagem: true,
      acessorios: true,
      vidros: true,
    } as const;
    const items = [item("a", { cuttingProgress: done }), item("b", { cuttingProgress: done })];
    expect(canOperateCuttingForItems("transporte_perfil", items)).toBe(false);
  });
});

describe("aggregateTransportStepsFromItems", () => {
  it("perfilEstrutural é some; demais (perfilTotal/acessorios/vidros) são every", () => {
    const items = [
      item("a", { transportProgress: { perfilEstrutural: true, perfilTotal: true, acessorios: true, vidros: false } }),
      item("b", { transportProgress: { perfilEstrutural: false, perfilTotal: true, acessorios: true, vidros: false } }),
    ];
    const agg = aggregateTransportStepsFromItems(items);
    expect(agg.levarPerfilEstrutural).toBe(true); // some
    expect(agg.levarPerfilTotal).toBe(true); // every
    expect(agg.levarVidros).toBe(false); // every — um vão sem vidros
    expect(agg.transporteConcluido).toBe(false); // vidros incompletos
  });

  it("transporteConcluido depende de perfilEstrutural(some) + demais(every)", () => {
    const items = [
      item("a", { transportProgress: { perfilEstrutural: true, perfilTotal: true, acessorios: true, vidros: true } }),
      item("b", { transportProgress: { perfilEstrutural: false, perfilTotal: true, acessorios: true, vidros: true } }),
    ];
    // perfilEstrutural é "some" → basta um vão; os demais são "every" e estão completos
    expect(aggregateTransportStepsFromItems(items).transporteConcluido).toBe(true);
  });

  it("transporteConcluido true quando todos os vãos entregaram tudo", () => {
    const full = { perfilEstrutural: true, perfilTotal: true, acessorios: true, vidros: true };
    const items = [item("a", { transportProgress: full }), item("b", { transportProgress: full })];
    expect(aggregateTransportStepsFromItems(items).transporteConcluido).toBe(true);
  });
});

describe("selectInstallationLineItems", () => {
  it("retrocompat: sem progresso de instalação em nenhum vão, retorna todos", () => {
    const items = [
      item("a"),
      item("b", { cuttingProgress: { corte: true, embalagem: false, acessorios: false, vidros: false } }),
    ];
    expect(selectInstallationLineItems(items)).toEqual(items);
  });

  it("filtra só vãos com installationProgress quando algum vão já entrou na instalação", () => {
    const withProgress = item("a", {
      installationProgress: { estrutural: false, vidros: false, acabamento: false },
    });
    const without = item("b");
    const items = [withProgress, without];
    expect(selectInstallationLineItems(items)).toEqual([withProgress]);
  });
});

describe("aggregateInstallationStepsFromItems", () => {
  it("exige TODOS os vãos em cada etapa", () => {
    const items = [
      item("a", { installationProgress: { estrutural: true, vidros: true, acabamento: false } }),
      item("b", { installationProgress: { estrutural: true, vidros: false, acabamento: false } }),
    ];
    const agg = aggregateInstallationStepsFromItems(items);
    expect(agg.instalacaoEstruturalFeita).toBe(true);
    expect(agg.instalacaoVidrosFeita).toBe(false);
  });
});

describe("installation vão conclusion", () => {
  const allSteps = {
    estrutural: true,
    vidros: true,
    acabamento: true,
  } as const;

  it("isVaoInstallationStepsComplete exige as 3 fases", () => {
    expect(
      isVaoInstallationStepsComplete(
        item("a", { installationProgress: { estrutural: true, vidros: true, acabamento: false } }),
      ),
    ).toBe(false);
    expect(
      isVaoInstallationStepsComplete(item("a", { installationProgress: allSteps })),
    ).toBe(true);
  });

  it("isVaoInstallationConcluded exige flag concluido", () => {
    expect(
      isVaoInstallationConcluded(
        item("a", { installationProgress: { ...allSteps, concluido: false } }),
      ),
    ).toBe(false);
    expect(
      isVaoInstallationConcluded(
        item("a", { installationProgress: { ...allSteps, concluido: true } }),
      ),
    ).toBe(true);
  });

  it("aggregateAllVaosInstallationConcluded exige todos os vãos confirmados", () => {
    const items = [
      item("a", { installationProgress: { ...allSteps, concluido: true } }),
      item("b", { installationProgress: { ...allSteps, concluido: false } }),
    ];
    expect(aggregateAllVaosInstallationConcluded(items)).toBe(false);

    const allConfirmed = [
      item("a", { installationProgress: { ...allSteps, concluido: true } }),
      item("b", { installationProgress: { ...allSteps, concluido: true } }),
    ];
    expect(aggregateAllVaosInstallationConcluded(allConfirmed)).toBe(true);
  });
});

describe("effectiveCuttingSteps", () => {
  const partial = {
    corteFeito: true,
    embalagemFeita: false,
    acessoriosFeitos: false,
    vidrosFeitos: false,
  };

  it("retorna o agregado original quando não é fase adiantada", () => {
    expect(effectiveCuttingSteps(partial, false)).toEqual(partial);
  });

  it("considera tudo concluído em fase adiantada", () => {
    expect(effectiveCuttingSteps(partial, true)).toEqual({
      corteFeito: true,
      embalagemFeita: true,
      acessoriosFeitos: true,
      vidrosFeitos: true,
    });
  });
});

describe("isTransportOrLater / isInstallationOrLater", () => {
  it("transporte inclui transporte, instalação e concluído", () => {
    expect(isTransportOrLater("transporte_perfil")).toBe(true);
    expect(isTransportOrLater("instalacao_vidros")).toBe(true);
    expect(isTransportOrLater("concluido")).toBe(true);
    expect(isTransportOrLater("cortes")).toBe(false);
  });

  it("instalação inclui apenas instalação e concluído", () => {
    expect(isInstallationOrLater("instalacao_estrutural")).toBe(true);
    expect(isInstallationOrLater("concluido")).toBe(true);
    expect(isInstallationOrLater("transporte_perfil")).toBe(false);
  });
});
