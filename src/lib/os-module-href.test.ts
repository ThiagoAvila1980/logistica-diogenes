import { describe, expect, it } from "vitest";
import { getOsModuleHrefForKanbanPhase } from "./os-module-href";

describe("getOsModuleHrefForKanbanPhase", () => {
  it("abre instalação para cards na coluna concluídos, mesmo em transporte", () => {
    expect(
      getOsModuleHrefForKanbanPhase(
        "os-1",
        "concluidos",
        "transporte_levar_vidro",
      ),
    ).toBe("/installation/os-1");
  });
});
