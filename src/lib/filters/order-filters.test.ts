import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDER_FILTERS,
  filterOrderList,
  matchesOrderFilters,
} from "./order-filters";

describe("order-filters", () => {
  const sample = {
    clientName: "João Silva",
    number: "042",
    budgetReference: "ORC-100",
    priority: "alta" as const,
    scheduledDate: new Date(2026, 5, 10),
    displayNumber: "ORC-100",
  };

  it("filtra por busca no nome do cliente", () => {
    expect(
      matchesOrderFilters(sample, { ...DEFAULT_ORDER_FILTERS, search: "joao" }),
    ).toBe(true);
    expect(
      matchesOrderFilters(sample, {
        ...DEFAULT_ORDER_FILTERS,
        search: "inexistente",
      }),
    ).toBe(false);
  });

  it("filtra por prioridade e intervalo de datas", () => {
    const orders = [
      sample,
      {
        ...sample,
        number: "043",
        priority: "normal" as const,
        scheduledDate: new Date(2026, 5, 20),
      },
    ];

    const filtered = filterOrderList(
      orders,
      {
        ...DEFAULT_ORDER_FILTERS,
        priority: "alta",
        dateFrom: "10/06/2026",
        dateTo: "15/06/2026",
      },
      (order) => order,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.number).toBe("042");
  });
});
