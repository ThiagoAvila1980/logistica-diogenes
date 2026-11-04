import { describe, expect, it } from "vitest";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  agendaVaoStatus,
  attachInstallerNames,
  extractAgendaVaos,
  getSaoPauloIsoDate,
  groupVaosByInstaller,
  groupVaosByOrder,
  isAgendaIsoDate,
  resolveAgendaDate,
  type AgendaMeasurementRow,
  type AgendaVaoItem,
} from "./agenda";

function makeItem(
  overrides: Partial<MeasurementLineItem> & {
    id: string;
    scheduledInstallationDate?: string | null;
    installerId?: string | null;
    estrutural?: boolean;
    vidros?: boolean;
    acabamento?: boolean;
    concluido?: boolean;
    vaoNumber?: number;
  },
): MeasurementLineItem {
  const {
    scheduledInstallationDate = null,
    installerId = null,
    estrutural = false,
    vidros = false,
    acabamento = false,
    concluido = false,
    vaoNumber,
    ...rest
  } = overrides;

  return {
    id: rest.id,
    qty: 1,
    largura: 100,
    altura: 100,
    vaoNumber,
    installationProgress: {
      estrutural,
      vidros,
      acabamento,
      concluido,
      installerId,
      scheduledInstallationDate,
    },
  };
}

function makeRow(
  overrides: Partial<AgendaMeasurementRow> = {},
): AgendaMeasurementRow {
  return {
    id: "os-1",
    number: "001",
    numeroOrcamento: "ORC-1",
    budgetReference: null,
    cliente: "Maria",
    endereco: "Rua A, 10",
    telefone: "11999999999",
    priority: "normal",
    items: [
      makeItem({
        id: "vao-1",
        vaoNumber: 1,
        installerId: "inst-1",
        scheduledInstallationDate: "2026-11-04",
      }),
    ],
    ...overrides,
  };
}

function makeVao(overrides: Partial<AgendaVaoItem> = {}): AgendaVaoItem {
  return {
    osId: "os-1",
    osNumber: "001",
    displayNumber: "ORC-1",
    clientName: "Maria",
    clientAddress: "Rua A, 10",
    clientPhone: "11999999999",
    priority: "normal",
    itemId: "vao-1",
    vaoNumber: 1,
    installerId: "inst-1",
    installerName: "Pedro",
    scheduledInstallationDate: "2026-11-04",
    estrutural: false,
    vidros: false,
    acabamento: false,
    concluido: false,
    ...overrides,
  };
}

describe("isAgendaIsoDate", () => {
  it("aceita yyyy-MM-dd válido", () => {
    expect(isAgendaIsoDate("2026-11-04")).toBe(true);
    expect(isAgendaIsoDate("2024-02-29")).toBe(true);
  });

  it("rejeita formato inválido e dia inexistente", () => {
    expect(isAgendaIsoDate("04/11/2026")).toBe(false);
    expect(isAgendaIsoDate("2026-13-01")).toBe(false);
    expect(isAgendaIsoDate("2026-02-30")).toBe(false);
    expect(isAgendaIsoDate("")).toBe(false);
  });
});

describe("resolveAgendaDate", () => {
  it("usa hoje quando o parâmetro falta ou é inválido", () => {
    expect(resolveAgendaDate(undefined, "2026-11-04")).toBe("2026-11-04");
    expect(resolveAgendaDate("ontem", "2026-11-04")).toBe("2026-11-04");
    expect(resolveAgendaDate("2026-02-30", "2026-11-04")).toBe("2026-11-04");
  });

  it("mantém a data válida da URL", () => {
    expect(resolveAgendaDate("2026-12-25", "2026-11-04")).toBe("2026-12-25");
  });
});

describe("getSaoPauloIsoDate", () => {
  it("usa o calendário de São Paulo, não UTC", () => {
    expect(getSaoPauloIsoDate(new Date("2026-11-05T02:00:00.000Z"))).toBe(
      "2026-11-04",
    );
    expect(getSaoPauloIsoDate(new Date("2026-11-05T03:00:00.000Z"))).toBe(
      "2026-11-05",
    );
  });
});

describe("extractAgendaVaos", () => {
  it("extrai só os vãos do dia e ignora vãos sem data", () => {
    const vaos = extractAgendaVaos(
      [
        makeRow({
          items: [
            makeItem({
              id: "vao-1",
              vaoNumber: 1,
              installerId: "inst-1",
              scheduledInstallationDate: "2026-11-04",
            }),
            makeItem({
              id: "vao-2",
              vaoNumber: 2,
              scheduledInstallationDate: null,
            }),
            makeItem({
              id: "vao-3",
              vaoNumber: 3,
              scheduledInstallationDate: "2026-12-01",
            }),
          ],
        }),
      ],
      { isoDate: "2026-11-04" },
    );

    expect(vaos).toHaveLength(1);
    expect(vaos[0]).toMatchObject({
      osId: "os-1",
      displayNumber: "ORC-1",
      clientName: "Maria",
      itemId: "vao-1",
      vaoNumber: 1,
      scheduledInstallationDate: "2026-11-04",
      installerId: "inst-1",
    });
  });

  it("usa a posição do array quando o vão não tem vaoNumber", () => {
    const vaos = extractAgendaVaos(
      [
        makeRow({
          numeroOrcamento: null,
          budgetReference: "REF-9",
          items: [
            makeItem({
              id: "vao-a",
              scheduledInstallationDate: "2026-11-04",
            }),
          ],
        }),
      ],
      { isoDate: "2026-11-04" },
    );

    expect(vaos[0]?.vaoNumber).toBe(1);
    expect(vaos[0]?.displayNumber).toBe("REF-9");
  });

  it("filtra pelo instalador quando o id é informado", () => {
    const vaos = extractAgendaVaos(
      [
        makeRow({
          items: [
            makeItem({
              id: "meu",
              vaoNumber: 1,
              installerId: "eu",
              scheduledInstallationDate: "2026-11-04",
            }),
            makeItem({
              id: "outro",
              vaoNumber: 2,
              installerId: "eles",
              scheduledInstallationDate: "2026-11-04",
            }),
          ],
        }),
      ],
      {
        isoDate: "2026-11-04",
        installerId: "eu",
      },
    );

    expect(vaos.map((vao) => vao.itemId)).toEqual(["meu"]);
  });
});

describe("attachInstallerNames", () => {
  it("preenche o nome e deixa nulo quando não há instalador", () => {
    const named = attachInstallerNames(
      [
        makeVao({ installerId: "inst-1", installerName: null }),
        makeVao({
          itemId: "vao-2",
          installerId: null,
          installerName: null,
        }),
      ],
      new Map([["inst-1", "Pedro"]]),
    );

    expect(named[0]?.installerName).toBe("Pedro");
    expect(named[1]?.installerName).toBeNull();
  });
});

describe("agendaVaoStatus", () => {
  it("marca concluído, em andamento e a fazer", () => {
    expect(agendaVaoStatus(makeVao({ concluido: true, vidros: true }))).toBe(
      "concluido",
    );
    expect(agendaVaoStatus(makeVao({ estrutural: true }))).toBe("em_andamento");
    expect(agendaVaoStatus(makeVao())).toBe("a_fazer");
  });
});

describe("groupVaosByOrder", () => {
  it("agrupa vãos da mesma OS e ordena pelo número do vão", () => {
    const groups = groupVaosByOrder([
      makeVao({ itemId: "v2", vaoNumber: 2, displayNumber: "ORC-1" }),
      makeVao({
        osId: "os-2",
        displayNumber: "ORC-2",
        itemId: "x",
        vaoNumber: 1,
        clientName: "João",
      }),
      makeVao({ itemId: "v1", vaoNumber: 1, displayNumber: "ORC-1" }),
    ]);

    expect(groups.map((g) => g.osId)).toEqual(["os-1", "os-2"]);
    expect(groups[0]?.vaos.map((v) => v.vaoNumber)).toEqual([1, 2]);
  });
});

describe("groupVaosByInstaller", () => {
  it("agrupa por instalador e deixa sem instalador por último", () => {
    const groups = groupVaosByInstaller([
      makeVao({
        itemId: "sem",
        installerId: null,
        installerName: null,
      }),
      makeVao({
        osId: "os-2",
        itemId: "bruno",
        installerId: "inst-2",
        installerName: "Bruno",
      }),
      makeVao({
        itemId: "pedro",
        installerId: "inst-1",
        installerName: "Pedro",
      }),
    ]);

    expect(groups.map((g) => g.installerName)).toEqual([
      "Bruno",
      "Pedro",
      null,
    ]);
    expect(groups[2]?.installerId).toBeNull();
  });

  it("separa vãos da mesma OS quando os instaladores são diferentes", () => {
    const groups = groupVaosByInstaller([
      makeVao({
        itemId: "v1",
        installerId: "inst-1",
        installerName: "Pedro",
      }),
      makeVao({
        itemId: "v2",
        vaoNumber: 2,
        installerId: "inst-2",
        installerName: "Bruno",
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.orders[0]?.vaos).toHaveLength(1);
    expect(groups[1]?.orders[0]?.vaos).toHaveLength(1);
  });
});
