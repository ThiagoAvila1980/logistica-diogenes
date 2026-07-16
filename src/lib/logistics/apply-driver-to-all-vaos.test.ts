import { describe, expect, it } from "vitest";
import { applyDriverToAllVaoSteps } from "./apply-driver-to-all-vaos";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function makeItem(
  id: string,
  transportProgress: MeasurementLineItem["transportProgress"],
): MeasurementLineItem {
  return {
    id,
    qty: 1,
    pieces: [],
    transportProgress,
  } as MeasurementLineItem;
}

describe("applyDriverToAllVaoSteps", () => {
  it("aplica o motorista a todas as etapas de todos os vãos, preservando data e veículo", () => {
    const items = [
      makeItem("a", {
        perfilEstrutural: false,
        perfilTotal: false,
        acessorios: false,
        vidros: false,
        driverId: "m-old",
        scheduledTransportDate: "2026-01-10",
        vehicleId: "v1",
        stepAssignments: {
          vidros: {
            driverId: "m-other",
            scheduledDate: "2026-01-20",
            vehicleId: "v2",
          },
        },
      }),
      makeItem("b", {
        perfilEstrutural: true,
        perfilTotal: false,
        acessorios: false,
        vidros: false,
      }),
    ];

    const next = applyDriverToAllVaoSteps(items, "m-bulk");

    expect(next[0].transportProgress?.stepAssignments).toEqual({
      perfilEstrutural: {
        driverId: "m-bulk",
        scheduledDate: "2026-01-10",
        vehicleId: "v1",
      },
      perfilTotal: {
        driverId: "m-bulk",
        scheduledDate: "2026-01-10",
        vehicleId: "v1",
      },
      acessorios: {
        driverId: "m-bulk",
        scheduledDate: "2026-01-10",
        vehicleId: "v1",
      },
      vidros: {
        driverId: "m-bulk",
        scheduledDate: "2026-01-20",
        vehicleId: "v2",
      },
    });

    expect(next[1].transportProgress?.stepAssignments).toEqual({
      perfilEstrutural: {
        driverId: "m-bulk",
        scheduledDate: null,
        vehicleId: null,
      },
      perfilTotal: {
        driverId: "m-bulk",
        scheduledDate: null,
        vehicleId: null,
      },
      acessorios: {
        driverId: "m-bulk",
        scheduledDate: null,
        vehicleId: null,
      },
      vidros: {
        driverId: "m-bulk",
        scheduledDate: null,
        vehicleId: null,
      },
    });
  });

  it("permite limpar o motorista em lote (null)", () => {
    const items = [
      makeItem("a", {
        perfilEstrutural: false,
        perfilTotal: false,
        acessorios: false,
        vidros: false,
        stepAssignments: {
          perfilEstrutural: {
            driverId: "m1",
            scheduledDate: "2026-02-01",
            vehicleId: "v1",
          },
        },
      }),
    ];

    const next = applyDriverToAllVaoSteps(items, null);
    expect(next[0].transportProgress?.stepAssignments?.perfilEstrutural).toEqual({
      driverId: null,
      scheduledDate: "2026-02-01",
      vehicleId: "v1",
    });
  });
});
