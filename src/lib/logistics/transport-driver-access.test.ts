import { describe, expect, it } from "vitest";
import {
  collectDriverIdsFromMeasurementItems,
  mergeDriverIds,
} from "./transport-driver-access";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

describe("transport-driver-access", () => {
  it("coleta motoristas únicos dos vãos", () => {
    const items = [
      {
        id: "a",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: { driverId: "m1" },
      },
      {
        id: "b",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: { driverId: "m2" },
      },
      {
        id: "c",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: { driverId: "m1" },
      },
    ] as MeasurementLineItem[];

    expect(collectDriverIdsFromMeasurementItems(items)).toEqual(["m1", "m2"]);
  });

  it("mescla motoristas do log legado com os vãos", () => {
    expect(mergeDriverIds(["m1"], ["m2"], [null, "m1"])).toEqual(["m1", "m2"]);
  });
});
