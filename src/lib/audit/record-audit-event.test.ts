import { describe, it, expect, beforeEach } from "vitest";
import { recordAuditEvent } from "./record-audit-event";
import { AUDIT_ACTIONS } from "./actions";

type FakeRow = {
  actorId: string | null;
  action: string;
  measurementId?: string | null;
  itemId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
};

function createFakeDb(rows: FakeRow[] = []) {
  return {
    _rows: rows,
    insert(_table: unknown) {
      return {
        values(vals: FakeRow) {
          rows.push({
            ...vals,
            payload: vals.payload ?? {},
          });
          return Promise.resolve();
        },
      };
    },
  };
}

describe("recordAuditEvent", () => {
  let rows: FakeRow[];

  beforeEach(() => {
    rows = [];
  });

  it("grava actor, action, measurement, item e payload", async () => {
    const db = createFakeDb(rows);
    await recordAuditEvent(db as never, {
      actorId: "user-1",
      action: AUDIT_ACTIONS.CUTTING_STEP_CHECKED,
      measurementId: "os-1",
      itemId: "vao-1",
      payload: { step: "corte", done: true },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorId: "user-1",
      action: "cutting.step_checked",
      measurementId: "os-1",
      itemId: "vao-1",
      payload: { step: "corte", done: true },
    });
  });

  it("usa payload vazio por padrão", async () => {
    const db = createFakeDb(rows);
    await recordAuditEvent(db as never, {
      actorId: "user-1",
      action: AUDIT_ACTIONS.OS_STAGE_CHANGED,
    });
    expect(rows[0].payload).toEqual({});
  });

  it("permite actorId null", async () => {
    const db = createFakeDb(rows);
    await recordAuditEvent(db as never, {
      actorId: null,
      action: AUDIT_ACTIONS.ADMIN_USER_UPDATED,
      entityType: "user",
      entityId: "u-2",
    });
    expect(rows[0].actorId).toBeNull();
    expect(rows[0].entityType).toBe("user");
    expect(rows[0].entityId).toBe("u-2");
  });
});
