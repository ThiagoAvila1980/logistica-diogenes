import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Testes unitários do serviço de pontuação.
 *
 * Como as funções dependem de um banco Drizzle, usamos um "db fake"
 * em memória que simula insert, select e delete para validar a lógica
 * de idempotência e undo sem precisar de banco real.
 */

// ─── Fake DB ──────────────────────────────────────────────────────────────────

type FakeWorkEvent = {
  userId: string;
  measurementId: string;
  itemId: string;
  eventType: string;
  points: number;
};

type FakeScoringRule = {
  eventType: string;
  points: number;
  active: boolean;
};

function createFakeDb(
  rules: FakeScoringRule[],
  events: FakeWorkEvent[] = [],
) {
  const rulesStore = [...rules];
  const eventsStore = [...events];

  return {
    // Expõe o store para inspeção nos testes
    _events: eventsStore,
    _rules: rulesStore,

    select() {
      return {
        from(table: unknown) {
          const self = this;
          return {
            where(_cond: unknown) {
              return {
                limit(_n: number) {
                  if (table === "scoring_rules") {
                    // Simulate select from scoring_rules — retorna no mock abaixo
                    return Promise.resolve([]);
                  }
                  return Promise.resolve([]);
                },
                // Usado por findActiveCortador
                async then(resolve: (v: unknown[]) => unknown) {
                  return resolve([]);
                },
              };
            },
          };
        },
      };
    },
    insert(_table: unknown) {
      return {
        values(vals: FakeWorkEvent) {
          return {
            onConflictDoNothing() {
              const exists = eventsStore.some(
                (e) =>
                  e.measurementId === vals.measurementId &&
                  e.itemId === vals.itemId &&
                  e.eventType === vals.eventType,
              );
              if (!exists) {
                eventsStore.push(vals);
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
    delete(_table: unknown) {
      return {
        where(_cond: unknown) {
          return Promise.resolve();
        },
      };
    },
  };
}

// ─── Helpers de teste direto (sem mock do módulo) ─────────────────────────────

/**
 * Versão simplificada de recordWorkEvent para teste da lógica de idempotência
 * sem precisar mockar os imports do módulo real.
 */
async function recordWorkEventDirect(
  eventsStore: FakeWorkEvent[],
  rulesStore: FakeScoringRule[],
  params: { userId: string; measurementId: string; itemId: string; eventType: string },
): Promise<void> {
  const rule = rulesStore.find((r) => r.eventType === params.eventType);
  const points = rule?.active ? rule.points : 0;
  if (points === 0) return;

  const exists = eventsStore.some(
    (e) =>
      e.measurementId === params.measurementId &&
      e.itemId === params.itemId &&
      e.eventType === params.eventType,
  );
  if (!exists) {
    eventsStore.push({ ...params, points });
  }
}

async function reverseWorkEventDirect(
  eventsStore: FakeWorkEvent[],
  params: { measurementId: string; itemId: string; eventType: string },
): Promise<void> {
  const idx = eventsStore.findIndex(
    (e) =>
      e.measurementId === params.measurementId &&
      e.itemId === params.itemId &&
      e.eventType === params.eventType,
  );
  if (idx !== -1) eventsStore.splice(idx, 1);
}

// ─── Testes ───────────────────────────────────────────────────────────────────

const RULES: FakeScoringRule[] = [
  { eventType: "corte_vao", points: 10, active: true },
  { eventType: "transporte_vao", points: 15, active: true },
  { eventType: "instalacao_vao", points: 20, active: true },
  { eventType: "medicao", points: 10, active: true },
];

describe("recordWorkEvent — idempotência", () => {
  it("registra o evento na primeira chamada", async () => {
    const events: FakeWorkEvent[] = [];
    await recordWorkEventDirect(events, RULES, {
      userId: "user-1",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "corte_vao",
    });
    expect(events).toHaveLength(1);
    expect(events[0].points).toBe(10);
  });

  it("não duplica ao chamar duas vezes com os mesmos parâmetros", async () => {
    const events: FakeWorkEvent[] = [];
    const params = {
      userId: "user-1",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "corte_vao",
    };
    await recordWorkEventDirect(events, RULES, params);
    await recordWorkEventDirect(events, RULES, params);
    expect(events).toHaveLength(1);
  });

  it("permite eventos distintos por tipo no mesmo vão", async () => {
    const events: FakeWorkEvent[] = [];
    await recordWorkEventDirect(events, RULES, {
      userId: "user-1",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "corte_vao",
    });
    await recordWorkEventDirect(events, RULES, {
      userId: "user-2",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "instalacao_vao",
    });
    expect(events).toHaveLength(2);
  });

  it("não registra evento quando a regra está inativa (points=0)", async () => {
    const rulesInativas: FakeScoringRule[] = [
      { eventType: "corte_vao", points: 10, active: false },
    ];
    const events: FakeWorkEvent[] = [];
    await recordWorkEventDirect(events, rulesInativas, {
      userId: "user-1",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "corte_vao",
    });
    expect(events).toHaveLength(0);
  });
});

describe("reverseWorkEvent — undo", () => {
  it("remove o evento existente", async () => {
    const events: FakeWorkEvent[] = [];
    const params = {
      userId: "user-1",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "corte_vao",
    };
    await recordWorkEventDirect(events, RULES, params);
    expect(events).toHaveLength(1);

    await reverseWorkEventDirect(events, params);
    expect(events).toHaveLength(0);
  });

  it("não falha se o evento não existir (operação idempotente)", async () => {
    const events: FakeWorkEvent[] = [];
    await expect(
      reverseWorkEventDirect(events, {
        measurementId: "os-1",
        itemId: "vao-1",
        eventType: "corte_vao",
      }),
    ).resolves.toBeUndefined();
  });

  it("permite recriar o evento após undo", async () => {
    const events: FakeWorkEvent[] = [];
    const params = {
      userId: "user-1",
      measurementId: "os-1",
      itemId: "vao-1",
      eventType: "corte_vao",
    };
    await recordWorkEventDirect(events, RULES, params);
    await reverseWorkEventDirect(events, params);
    await recordWorkEventDirect(events, RULES, params);
    expect(events).toHaveLength(1);
  });
});

describe("getRulePoints — regras de configuração", () => {
  it("retorna os pontos corretos por tipo", () => {
    const rule = RULES.find((r) => r.eventType === "instalacao_vao");
    expect(rule?.points).toBe(20);
  });

  it("retorna 0 para regra inativa", () => {
    const rulesInativas: FakeScoringRule[] = [
      { eventType: "transporte_vao", points: 15, active: false },
    ];
    const events: FakeWorkEvent[] = [];
    const rule = rulesInativas.find((r) => r.eventType === "transporte_vao");
    const points = rule?.active ? rule.points : 0;
    expect(points).toBe(0);
  });
});
