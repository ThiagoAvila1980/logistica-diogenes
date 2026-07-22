import { describe, expect, it } from "vitest";
import { driversForTransportViewer } from "./transport-driver-access";

describe("driversForTransportViewer", () => {
  const allDrivers = [
    { id: "d1", name: "Ana" },
    { id: "d2", name: "Bruno" },
  ];

  it("admin/gerente recebem a lista completa para resolver nomes", () => {
    expect(
      driversForTransportViewer(["admin"], { userId: "x", name: "X" }, allDrivers),
    ).toEqual(allDrivers);
    expect(
      driversForTransportViewer(["gerente"], { userId: "x", name: "X" }, allDrivers),
    ).toEqual(allDrivers);
  });

  it("motorista recebe a si mesmo para exibir o nome no campo somente leitura", () => {
    expect(
      driversForTransportViewer(
        ["motorista"],
        { userId: "d2", name: "Bruno" },
        allDrivers,
      ),
    ).toEqual([{ id: "d2", name: "Bruno" }]);
  });

  it("sem sessão e sem visão ampla, lista vazia", () => {
    expect(driversForTransportViewer(["motorista"], null, allDrivers)).toEqual(
      [],
    );
  });
});
