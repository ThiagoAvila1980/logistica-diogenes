import { describe, expect, it } from "vitest";
import {
  applicableCuttingSteps,
  applicableInstallationSteps,
  applicableTransportSteps,
  descricaoIndicaEspelho,
  espelhoTipoIdsFromDescricoes,
  isEspelhoVao,
} from "./espelho-vao";

describe("descricaoIndicaEspelho", () => {
  it("reconhece a palavra espelho em qualquer tipo", () => {
    expect(descricaoIndicaEspelho("Espelho bisotê")).toBe(true);
    expect(descricaoIndicaEspelho("ESPELHO BRONZE")).toBe(true);
    expect(descricaoIndicaEspelho("Box com espelho")).toBe(true);
    expect(descricaoIndicaEspelho("Espelhos")).toBe(true);
  });

  it("não trata vidro espelhado como espelho", () => {
    expect(descricaoIndicaEspelho("Vidro espelhado")).toBe(false);
    expect(descricaoIndicaEspelho("Sacada Reiki")).toBe(false);
    expect(descricaoIndicaEspelho(null)).toBe(false);
  });
});

describe("etapas aplicáveis ao vão de espelho", () => {
  const ids = espelhoTipoIdsFromDescricoes([
    { id: "esp", descricao: "Espelho bronze" },
    { id: "sac", descricao: "Sacada Reiki" },
  ]);

  it("corte, transporte e instalação ficam só com as etapas do espelho", () => {
    const espelho = { idTipoEnvidracamento: "esp" };
    expect(isEspelhoVao(espelho, ids)).toBe(true);
    expect(applicableCuttingSteps(espelho, ids)).toEqual(["vidros"]);
    expect(applicableTransportSteps(espelho, ids)).toEqual(["vidros"]);
    expect(applicableInstallationSteps(espelho, ids)).toEqual([
      "vidros",
      "acabamento",
    ]);
  });

  it("vão de outro tipo mantém o checklist completo", () => {
    const sacada = { idTipoEnvidracamento: "sac" };
    expect(applicableCuttingSteps(sacada, ids)).toEqual([
      "corte",
      "embalagem",
      "acessorios",
      "vidros",
    ]);
    expect(applicableTransportSteps(sacada, ids)).toEqual([
      "perfilEstrutural",
      "perfilTotal",
      "acessorios",
      "vidros",
    ]);
    expect(applicableInstallationSteps(sacada, ids)).toEqual([
      "estrutural",
      "vidros",
      "acabamento",
    ]);
  });
});
