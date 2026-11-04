import { describe, it, expect } from "vitest";
import {
  aggregateCuttingStepsFromItems,
  aggregateTransportStepsFromItems,
  aggregateInstallationStepsFromItems,
  aggregateAllVaosInstallationConcluded,
  isVaoInstallationStepsComplete,
  isVaoInstallationConcluded,
  selectCuttingLineItems,
  selectInstallationLineItems,
  selectUnsentMeasurementLineItems,
  hasRemainingUnsentMeasurementItems,
  canOperateCuttingForItems,
  effectiveCuttingSteps,
  hasPendingCuttingWorkOnItems,
  hasPendingLogisticsWorkOnItems,
  shouldListOrderInCutting,
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

  it("vão de espelho só precisa de vidros para concluir o corte", () => {
    const espelho = new Set(["esp"]);
    const items = [
      item("a", {
        idTipoEnvidracamento: "esp",
        cuttingProgress: { corte: false, embalagem: false, acessorios: false, vidros: true },
      }),
      item("b", {
        idTipoEnvidracamento: "sac",
        cuttingProgress: { corte: true, embalagem: true, acessorios: true, vidros: true },
      }),
    ];
    const agg = aggregateCuttingStepsFromItems(items, espelho);
    expect(agg.corteFeito).toBe(true);
    expect(agg.embalagemFeita).toBe(true);
    expect(agg.acessoriosFeitos).toBe(true);
    expect(agg.vidrosFeitos).toBe(true);
    expect(hasPendingCuttingWorkOnItems(items, espelho)).toBe(false);
  });

  it("OS só de espelho conclui o corte quando todos os vidros estão prontos", () => {
    const espelho = new Set(["esp"]);
    const pending = [
      item("a", {
        idTipoEnvidracamento: "esp",
        cuttingProgress: { corte: false, embalagem: false, acessorios: false, vidros: false },
      }),
    ];
    expect(aggregateCuttingStepsFromItems(pending, espelho).vidrosFeitos).toBe(false);
    expect(hasPendingCuttingWorkOnItems(pending, espelho)).toBe(true);

    const done = [
      item("a", {
        idTipoEnvidracamento: "esp",
        cuttingProgress: { corte: false, embalagem: false, acessorios: false, vidros: true },
      }),
    ];
    const agg = aggregateCuttingStepsFromItems(done, espelho);
    expect(agg.corteFeito).toBe(true);
    expect(agg.embalagemFeita).toBe(true);
    expect(agg.acessoriosFeitos).toBe(true);
    expect(agg.vidrosFeitos).toBe(true);
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

  it("permite cortar um vão atrasado mesmo com a OS já concluída", () => {
    const done = {
      corte: true,
      embalagem: true,
      acessorios: true,
      vidros: true,
    } as const;
    const items = [
      item("atrasado", { sentToCutting: true }),
      item("pronto", { sentToCutting: true, cuttingProgress: done }),
    ];
    expect(canOperateCuttingForItems("concluido", items)).toBe(true);
  });
});

describe("shouldListOrderInCutting", () => {
  const done = {
    corte: true,
    embalagem: true,
    acessorios: true,
    vidros: true,
  } as const;

  it("mantém no plano de corte o vão enviado que ainda não foi cortado, com a OS concluída", () => {
    const items = [
      item("vao-1", { sentToCutting: true }),
      item("vao-2", {
        sentToCutting: true,
        cuttingProgress: done,
        installationProgress: {
          estrutural: true,
          vidros: true,
          acabamento: true,
          concluido: true,
        },
      }),
    ];
    expect(shouldListOrderInCutting("concluido", items)).toBe(true);
  });

  it("não lista OS concluída quando todos os vãos enviados já foram cortados", () => {
    const items = [
      item("a", { sentToCutting: true, cuttingProgress: done }),
      item("b", { sentToCutting: true, cuttingProgress: done }),
    ];
    expect(shouldListOrderInCutting("concluido", items)).toBe(false);
  });

  it("não lista medição que ainda não foi enviada ao corte", () => {
    expect(
      shouldListOrderInCutting("medicao_final", [item("a"), item("b")]),
    ).toBe(false);
  });
});

describe("hasPendingLogisticsWorkOnItems", () => {
  const cutDone = {
    corte: true,
    embalagem: true,
    acessorios: true,
    vidros: true,
  } as const;
  const transportDone = {
    perfilEstrutural: true,
    perfilTotal: true,
    acessorios: true,
    vidros: true,
  } as const;

  it("leva ao transporte cada etapa de corte já ticada, sem esperar o corte inteiro", () => {
    const items = [
      item("atrasado", {
        sentToCutting: true,
        cuttingProgress: {
          corte: true,
          embalagem: false,
          acessorios: true,
          vidros: false,
        },
      }),
      item("pronto", {
        sentToCutting: true,
        cuttingProgress: cutDone,
        transportProgress: transportDone,
        installationProgress: {
          estrutural: true,
          vidros: true,
          acabamento: true,
          concluido: true,
        },
      }),
    ];
    expect(hasPendingLogisticsWorkOnItems(items)).toBe(true);
  });

  it("não trata como transporte o vão que ainda está no corte", () => {
    const items = [
      item("atrasado", { sentToCutting: true }),
      item("pronto", {
        sentToCutting: true,
        cuttingProgress: cutDone,
        transportProgress: transportDone,
        installationProgress: {
          estrutural: true,
          vidros: true,
          acabamento: true,
          concluido: true,
        },
      }),
    ];
    expect(hasPendingLogisticsWorkOnItems(items)).toBe(false);
  });

  it("mantém no transporte o vão já cortado que ainda não foi enviado à instalação", () => {
    const items = [
      item("atrasado", {
        sentToCutting: true,
        cuttingProgress: cutDone,
        transportProgress: transportDone,
      }),
      item("pronto", {
        sentToCutting: true,
        cuttingProgress: cutDone,
        transportProgress: transportDone,
        installationProgress: {
          estrutural: true,
          vidros: true,
          acabamento: true,
          concluido: true,
        },
      }),
    ];
    expect(hasPendingLogisticsWorkOnItems(items)).toBe(true);
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

  it("vão de espelho só precisa entregar vidros", () => {
    const espelho = new Set(["esp"]);
    const items = [
      item("a", {
        idTipoEnvidracamento: "esp",
        transportProgress: {
          perfilEstrutural: false,
          perfilTotal: false,
          acessorios: false,
          vidros: true,
        },
      }),
      item("b", {
        idTipoEnvidracamento: "sac",
        transportProgress: {
          perfilEstrutural: true,
          perfilTotal: true,
          acessorios: true,
          vidros: true,
        },
      }),
    ];
    expect(aggregateTransportStepsFromItems(items, espelho).transporteConcluido).toBe(true);
  });

  it("OS só de espelho conclui o transporte quando os vidros foram entregues", () => {
    const espelho = new Set(["esp"]);
    const items = [
      item("a", {
        idTipoEnvidracamento: "esp",
        transportProgress: {
          perfilEstrutural: false,
          perfilTotal: false,
          acessorios: false,
          vidros: true,
        },
      }),
    ];
    expect(aggregateTransportStepsFromItems(items, espelho).transporteConcluido).toBe(true);
  });

  it("ignora vãos fora do plano de corte ao calcular transporteConcluido", () => {
    const full = {
      perfilEstrutural: true,
      perfilTotal: true,
      acessorios: true,
      vidros: true,
    };
    const items = [
      item("a", { sentToCutting: true, transportProgress: full }),
      item("b", { sentToCutting: true, transportProgress: full }),
      // Vão medido mas não enviado ao corte — não deve bloquear o transporte
      item("c", { sentToCutting: false }),
    ];
    expect(aggregateTransportStepsFromItems(items).transporteConcluido).toBe(true);
  });
});

describe("selectCuttingLineItems", () => {
  it("retrocompat: sem flag sentToCutting, retorna todos", () => {
    const items = [item("a"), item("b")];
    expect(selectCuttingLineItems(items)).toEqual(items);
  });

  it("filtra só vãos com sentToCutting=true quando algum foi enviado", () => {
    const items = [
      item("a", { sentToCutting: true }),
      item("b", { sentToCutting: false }),
      item("c", { sentToCutting: true }),
    ];
    expect(selectCuttingLineItems(items).map((i) => i.id)).toEqual(["a", "c"]);
  });
});

describe("selectUnsentMeasurementLineItems / hasRemainingUnsentMeasurementItems", () => {
  it("sem envio parcial, todos os vãos ainda estão na medição", () => {
    const items = [item("a"), item("b")];
    expect(selectUnsentMeasurementLineItems(items)).toEqual(items);
    expect(hasRemainingUnsentMeasurementItems(items)).toBe(false);
  });

  it("após envio parcial, retorna só os vãos que ficaram na medição", () => {
    const items = [
      item("a", { sentToCutting: true }),
      item("b", { sentToCutting: false }),
      item("c"),
    ];
    expect(selectUnsentMeasurementLineItems(items).map((i) => i.id)).toEqual([
      "b",
      "c",
    ]);
    expect(hasRemainingUnsentMeasurementItems(items)).toBe(true);
  });

  it("quando todos foram enviados, não há remanescentes na medição", () => {
    const items = [
      item("a", { sentToCutting: true }),
      item("b", { sentToCutting: true }),
    ];
    expect(selectUnsentMeasurementLineItems(items)).toEqual([]);
    expect(hasRemainingUnsentMeasurementItems(items)).toBe(false);
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

  it("vão de espelho conclui a instalação com vidros e acabamento", () => {
    const espelho = new Set(["esp"]);
    const mirror = item("a", {
      idTipoEnvidracamento: "esp",
      installationProgress: { estrutural: false, vidros: true, acabamento: true },
    });
    expect(isVaoInstallationStepsComplete(mirror, espelho)).toBe(true);
    expect(
      aggregateInstallationStepsFromItems([mirror], espelho).instalacaoEstruturalFeita,
    ).toBe(true);

    const missingFinish = item("b", {
      idTipoEnvidracamento: "esp",
      installationProgress: { estrutural: false, vidros: true, acabamento: false },
    });
    expect(isVaoInstallationStepsComplete(missingFinish, espelho)).toBe(false);
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

  it("aggregateAllVaosInstallationConcluded ignora vãos não enviados à instalação", () => {
    const items = [
      item("a", {
        installationProgress: { ...allSteps, concluido: true },
      }),
      item("b", {
        installationProgress: { ...allSteps, concluido: true },
      }),
      // Ainda não enviado — não deve impedir a OS de sair da listagem
      item("c"),
    ];
    expect(aggregateAllVaosInstallationConcluded(items)).toBe(true);
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
