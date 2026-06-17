import { describe, expect, it } from "vitest";
import {
  filterConcludedOrdersForInstaller,
  type ConcludedOrderItem,
} from "./concluded-orders";
import {
  canAccessConcludedPage,
  canViewAllConcludedOrders,
} from "@/lib/auth/permissions";

function makeOrder(
  overrides: Partial<ConcludedOrderItem> = {},
): ConcludedOrderItem {
  return {
    id: "os-1",
    number: "OS-001",
    displayNumber: "OS-001",
    budgetReference: null,
    clientName: "Cliente",
    status: "instalacao_estrutural",
    priority: "normal",
    scheduledDate: null,
    updatedAt: new Date(),
    assignedUserId: null,
    vaos: [
      {
        id: "v1",
        index: 0,
        label: "Vão 1",
        installerId: "inst-1",
        estrutural: true,
        vidros: false,
        acabamento: false,
      },
      {
        id: "v2",
        index: 1,
        label: "Vão 2",
        installerId: "inst-2",
        estrutural: true,
        vidros: true,
        acabamento: false,
      },
    ],
    totalVaos: 2,
    estruturalCount: 2,
    vidrosCount: 1,
    acabamentoCount: 0,
    ...overrides,
  };
}

describe("concluded access roles", () => {
  it("permite admin, gerente e instalador", () => {
    expect(canAccessConcludedPage(["admin"])).toBe(true);
    expect(canAccessConcludedPage(["gerente"])).toBe(true);
    expect(canAccessConcludedPage(["instalador"])).toBe(true);
  });

  it("bloqueia demais papéis", () => {
    expect(canAccessConcludedPage(["medidor"])).toBe(false);
    expect(canAccessConcludedPage(["cortador"])).toBe(false);
    expect(canAccessConcludedPage(["motorista"])).toBe(false);
  });

  it("admin e gerente veem tudo", () => {
    expect(canViewAllConcludedOrders(["admin"])).toBe(true);
    expect(canViewAllConcludedOrders(["gerente"])).toBe(true);
    expect(canViewAllConcludedOrders(["instalador"])).toBe(false);
  });
});

describe("filterConcludedOrdersForInstaller", () => {
  it("mantém apenas vãos com trabalho do instalador logado", () => {
    const result = filterConcludedOrdersForInstaller([makeOrder()], "inst-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.vaos).toHaveLength(1);
    expect(result[0]?.vaos[0]?.id).toBe("v1");
    expect(result[0]?.estruturalCount).toBe(1);
    expect(result[0]?.vidrosCount).toBe(0);
  });

  it("ignora vão designado sem progresso registrado", () => {
    const result = filterConcludedOrdersForInstaller(
      [
        makeOrder({
          vaos: [
            {
              id: "v1",
              index: 0,
              label: "Vão 1",
              installerId: "inst-1",
              estrutural: false,
              vidros: false,
              acabamento: false,
            },
          ],
          totalVaos: 1,
          estruturalCount: 0,
          vidrosCount: 0,
          acabamentoCount: 0,
        }),
      ],
      "inst-1",
    );

    expect(result).toHaveLength(0);
  });

  it("usa responsável geral legado quando não há designação por vão", () => {
    const result = filterConcludedOrdersForInstaller(
      [
        makeOrder({
          assignedUserId: "inst-legacy",
          vaos: [
            {
              id: "v1",
              index: 0,
              label: "Vão 1",
              installerId: null,
              estrutural: true,
              vidros: false,
              acabamento: false,
            },
          ],
          totalVaos: 1,
          estruturalCount: 1,
          vidrosCount: 0,
          acabamentoCount: 0,
        }),
      ],
      "inst-legacy",
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.vaos).toHaveLength(1);
  });
});
