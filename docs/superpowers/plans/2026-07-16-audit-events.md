# Audit Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir trilha append-only `audit_events` (quem / o quê / quando) para mutações operacionais e admin, sem UI nova.

**Architecture:** Nova tabela Drizzle `audit_events` + helper `recordAuditEvent` chamado dentro das mesmas transactions das server actions. Ator = `session.userId` de `requireRole`. Undo gera novo evento; nunca apaga audit. `work_events` permanece só para pontuação. `status_history.changed_by_id` passa a ser preenchido.

**Tech Stack:** Next.js server actions, Drizzle ORM + PostgreSQL, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-07-16-audit-events-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `src/db/schema.ts` | Tabela `audit_events` + tipos exportados |
| `src/db/migrations/0001_audit_events.sql` (gerado) | Migration SQL |
| `src/lib/audit/actions.ts` | Constantes tipadas de `action` |
| `src/lib/audit/record-audit-event.ts` | Insert append-only |
| `src/lib/audit/record-audit-event.test.ts` | Unit tests com fake DB |
| `src/actions/cutting-actions.ts` | Instrumentar ticagens/notas/desenho/envio/avanço |
| `src/actions/transport-actions.ts` | Instrumentar ticagens/atriuições/notas |
| `src/actions/installation-step-actions.ts` | Instrumentar steps + concluir vão |
| `src/actions/installation-actions.ts` | Fotos + notas diárias |
| `src/actions/installer-actions.ts` | Atribuir instalador / enviar vãos |
| `src/actions/field-actions.ts` | Create/save/header/delete medição |
| `src/actions/kanban-actions.ts` | moveOSCard + changedById |
| `src/actions/stage-revert-actions.ts` | revert + changedById |
| `src/actions/user-admin-actions.ts` | CRUD usuários |
| `src/actions/vehicle-actions.ts` | save/delete veículo |
| `src/actions/lookup-admin-actions.ts` | save/delete lookups |
| `src/actions/role-access-actions.ts` | matriz de acesso |
| `src/actions/scoring-actions.ts` | update regra |

---

### Task 1: Schema `audit_events`

**Files:**
- Modify: `src/db/schema.ts`
- Generate: migration via drizzle-kit

- [ ] **Step 1: Adicionar tabela ao schema**

No final da seção de pontuação (antes de `roleScreenAccess` ou após `workEvents`), inserir:

```ts
/** Trilha append-only de auditoria operacional e admin */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    measurementId: uuid("measurement_id").references(() => measurements.id, {
      onDelete: "set null",
    }),
    itemId: text("item_id"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_audit_events_measurement_created").on(t.measurementId, t.createdAt),
    index("idx_audit_events_actor_created").on(t.actorId, t.createdAt),
    index("idx_audit_events_action_created").on(t.action, t.createdAt),
    index("idx_audit_events_entity").on(t.entityType, t.entityId),
  ],
);

export type AuditEvent = typeof auditEvents.$inferSelect;
```

Adicionar relation opcional em `usersRelations` / `measurementsRelations` se o arquivo já usa relations para `workEvents` — espelhar o padrão existente (`many(auditEvents)`).

- [ ] **Step 2: Gerar e aplicar migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: arquivo novo em `src/db/migrations/` (ex. `0001_*.sql`) com `CREATE TABLE "audit_events"` e índices; migrate conclui sem erro.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts src/db/migrations
git commit -m "feat(db): adiciona tabela audit_events"
```

---

### Task 2: Constantes de action + helper `recordAuditEvent`

**Files:**
- Create: `src/lib/audit/actions.ts`
- Create: `src/lib/audit/record-audit-event.ts`
- Create: `src/lib/audit/record-audit-event.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/audit/record-audit-event.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar teste e confirmar falha**

```bash
npx vitest run src/lib/audit/record-audit-event.test.ts
```

Expected: FAIL (módulo/arquivo inexistente).

- [ ] **Step 3: Criar `src/lib/audit/actions.ts`**

```ts
export const AUDIT_ACTIONS = {
  CUTTING_STEP_CHECKED: "cutting.step_checked",
  CUTTING_STEP_UNCHECKED: "cutting.step_unchecked",
  CUTTING_NOTES_UPDATED: "cutting.notes_updated",
  CUTTING_DRAWING_UPDATED: "cutting.drawing_updated",
  CUTTING_ITEMS_SENT: "cutting.items_sent",

  TRANSPORT_STEP_CHECKED: "transport.step_checked",
  TRANSPORT_STEP_UNCHECKED: "transport.step_unchecked",
  TRANSPORT_DRIVER_ASSIGNED: "transport.driver_assigned",
  TRANSPORT_DRIVER_UNASSIGNED: "transport.driver_unassigned",
  TRANSPORT_VEHICLE_ASSIGNED: "transport.vehicle_assigned",
  TRANSPORT_VEHICLE_UNASSIGNED: "transport.vehicle_unassigned",
  TRANSPORT_NOTES_UPDATED: "transport.notes_updated",

  INSTALLATION_STEP_CHECKED: "installation.step_checked",
  INSTALLATION_STEP_UNCHECKED: "installation.step_unchecked",
  INSTALLATION_VAO_COMPLETED: "installation.vao_completed",
  INSTALLATION_INSTALLER_ASSIGNED: "installation.installer_assigned",
  INSTALLATION_INSTALLER_UNASSIGNED: "installation.installer_unassigned",
  INSTALLATION_NOTES_UPDATED: "installation.notes_updated",
  INSTALLATION_PHOTOS_UPDATED: "installation.photos_updated",
  INSTALLATION_VAOS_SENT: "installation.vaos_sent",

  FIELD_MEASUREMENT_CREATED: "field.measurement_created",
  FIELD_MEASUREMENT_SAVED: "field.measurement_saved",
  FIELD_HEADER_UPDATED: "field.header_updated",
  FIELD_MEASUREMENT_DELETED: "field.measurement_deleted",

  OS_STAGE_CHANGED: "os.stage_changed",
  OS_STAGE_REVERTED: "os.stage_reverted",

  ADMIN_USER_CREATED: "admin.user_created",
  ADMIN_USER_UPDATED: "admin.user_updated",
  ADMIN_USER_DELETED: "admin.user_deleted",
  ADMIN_VEHICLE_CREATED: "admin.vehicle_created",
  ADMIN_VEHICLE_UPDATED: "admin.vehicle_updated",
  ADMIN_VEHICLE_DELETED: "admin.vehicle_deleted",
  ADMIN_LOOKUP_CREATED: "admin.lookup_created",
  ADMIN_LOOKUP_UPDATED: "admin.lookup_updated",
  ADMIN_LOOKUP_DELETED: "admin.lookup_deleted",
  ADMIN_ROLE_ACCESS_UPDATED: "admin.role_access_updated",
  ADMIN_SCORING_RULE_UPDATED: "admin.scoring_rule_updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export function stepCheckAction(
  domain: "cutting" | "transport" | "installation",
  done: boolean,
): AuditAction {
  if (domain === "cutting") {
    return done
      ? AUDIT_ACTIONS.CUTTING_STEP_CHECKED
      : AUDIT_ACTIONS.CUTTING_STEP_UNCHECKED;
  }
  if (domain === "transport") {
    return done
      ? AUDIT_ACTIONS.TRANSPORT_STEP_CHECKED
      : AUDIT_ACTIONS.TRANSPORT_STEP_UNCHECKED;
  }
  return done
    ? AUDIT_ACTIONS.INSTALLATION_STEP_CHECKED
    : AUDIT_ACTIONS.INSTALLATION_STEP_UNCHECKED;
}
```

- [ ] **Step 4: Criar `src/lib/audit/record-audit-event.ts`**

```ts
import "server-only";

import { auditEvents } from "@/db/schema";
import type { getDb } from "@/db";
import type { AuditAction } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Pick<ReturnType<typeof getDb>, "insert">;

export type RecordAuditEventParams = {
  actorId: string | null;
  action: AuditAction | string;
  measurementId?: string | null;
  itemId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

export async function recordAuditEvent(
  db: AnyDb,
  params: RecordAuditEventParams,
): Promise<void> {
  await db.insert(auditEvents).values({
    actorId: params.actorId,
    action: params.action,
    measurementId: params.measurementId ?? null,
    itemId: params.itemId ?? null,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    payload: params.payload ?? {},
  });
}
```

- [ ] **Step 5: Rodar testes e confirmar PASS**

```bash
npx vitest run src/lib/audit/record-audit-event.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit
git commit -m "feat(audit): helper recordAuditEvent e constantes de action"
```

---

### Task 3: Instrumentar cutting-actions + status_history

**Files:**
- Modify: `src/actions/cutting-actions.ts`

Padrão em cada action mutável:

1. Capturar sessão: `const session = await requireRole([...])` (hoje muitas só fazem `await requireRole`).
2. Dentro do `db.transaction`, após a mutação bem-sucedida, chamar `recordAuditEvent(tx, { actorId: session.userId, ... })`.
3. Em todo `tx.insert(statusHistory).values({...})`, adicionar `changedById: session.userId`.

- [ ] **Step 1: Imports**

```ts
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS, stepCheckAction } from "@/lib/audit/actions";
```

- [ ] **Step 2: `updateItemCuttingStepAction`**

Trocar `await requireRole(...)` por `const session = await requireRole(...)`.

Após o update do JSONB (e pontuação), ainda dentro do `tx`:

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: stepCheckAction("cutting", done),
  measurementId: osId,
  itemId,
  payload: { step, done },
});
```

No insert de `statusHistory` do unlock automático, adicionar `changedById: session.userId` e gravar também:

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.OS_STAGE_CHANGED,
  measurementId: osId,
  payload: {
    fromStatus: status,
    toStatus: "transporte_perfil",
    source: "cutting_unlock_transport_per_vao",
  },
});
```

- [ ] **Step 3: `advanceCuttingToTransportAction`**

Mesmo padrão: `session`, `changedById`, `OS_STAGE_CHANGED` com `source: "cutting_advance_to_transport"`.

- [ ] **Step 4: `updateCuttingNotesAction`**

```ts
await recordAuditEvent(tx /* ou db se não houver tx */, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.CUTTING_NOTES_UPDATED,
  measurementId: osId,
});
```

Se a action não usa transaction, envolver update + audit em `db.transaction`.

- [ ] **Step 5: `sendItemsToCuttingAction`**

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.CUTTING_ITEMS_SENT,
  measurementId: osId,
  payload: { selectedItemIds },
});
```

+ `changedById` no `statusHistory`.

- [ ] **Step 6: `updateItemDrawingAction`**

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.CUTTING_DRAWING_UPDATED,
  measurementId: osId,
  itemId,
});
```

- [ ] **Step 7: Commit**

```bash
git add src/actions/cutting-actions.ts
git commit -m "feat(audit): instrumenta ações de corte e status_history"
```

---

### Task 4: Instrumentar transport-actions

**Files:**
- Modify: `src/actions/transport-actions.ts`

- [ ] **Step 1: Imports** (`recordAuditEvent`, `AUDIT_ACTIONS`, `stepCheckAction`)

- [ ] **Step 2: `updateItemTransportStepAction`**

Já captura `session` em alguns pontos — reutilizar. Após mutação:

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: stepCheckAction("transport", done),
  measurementId: osId,
  itemId,
  payload: { step, done },
});
```

- [ ] **Step 3: `assignDriverToVaoAction`**

Capturar `const session = await requireRole(["admin"])`.

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: driverId
    ? AUDIT_ACTIONS.TRANSPORT_DRIVER_ASSIGNED
    : AUDIT_ACTIONS.TRANSPORT_DRIVER_UNASSIGNED,
  measurementId: osId,
  itemId,
  payload: { step, driverId, previousDriverId, scheduledTransportDate, vehicleId },
});
```

Incluir no payload só os campos que a action realmente altera (ler o corpo atual e espelhar).

- [ ] **Step 4: `assignDriverToAllVaosAction`**

Um evento por OS (não por vão), com payload `{ driverId, itemCount }` **ou** um evento por vão atualizado — preferir **um evento por vão** para granularidade de auditoria.

- [ ] **Step 5: `assignVehicleToVaoAction` / `assignVehicleToTransportAction`**

```ts
action: vehicleId
  ? AUDIT_ACTIONS.TRANSPORT_VEHICLE_ASSIGNED
  : AUDIT_ACTIONS.TRANSPORT_VEHICLE_UNASSIGNED,
```

- [ ] **Step 6: `updateItemTransportNotesAction`**

`TRANSPORT_NOTES_UPDATED` com `measurementId` + `itemId`.

- [ ] **Step 7: Commit**

```bash
git add src/actions/transport-actions.ts
git commit -m "feat(audit): instrumenta ações de transporte"
```

---

### Task 5: Instrumentar instalação

**Files:**
- Modify: `src/actions/installation-step-actions.ts`
- Modify: `src/actions/installation-actions.ts`
- Modify: `src/actions/installer-actions.ts`

- [ ] **Step 1: `updateItemInstallationStepAction`**

`const session = await requireRole(...)` + `stepCheckAction("installation", done)`.

- [ ] **Step 2: `completeInstallationVaoAction`**

```ts
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.INSTALLATION_VAO_COMPLETED,
  measurementId: osId,
  itemId,
  payload: { concluido: true },
});
```

- [ ] **Step 3: `assignInstallerToVaoAction`**

`INSTALLATION_INSTALLER_ASSIGNED` / `UNASSIGNED` conforme `installerId` null.

- [ ] **Step 4: `sendVaosToInstallationAction`**

`INSTALLATION_VAOS_SENT` com `payload: { itemIds }`.

- [ ] **Step 5: `saveInstallationServicePhotos`**

`INSTALLATION_PHOTOS_UPDATED` com `measurementId: osId`.

- [ ] **Step 6: `saveInstallationDailyNote`**

`INSTALLATION_NOTES_UPDATED` com `payload: { date }` (não gravar o texto completo se for longo — opcional: truncar a 200 chars no payload; preferível só `{ date }` para privacidade/tamanho).

- [ ] **Step 7: Commit**

```bash
git add src/actions/installation-step-actions.ts src/actions/installation-actions.ts src/actions/installer-actions.ts
git commit -m "feat(audit): instrumenta ações de instalação"
```

---

### Task 6: Field + kanban + revert

**Files:**
- Modify: `src/actions/field-actions.ts`
- Modify: `src/actions/kanban-actions.ts`
- Modify: `src/actions/stage-revert-actions.ts`

- [ ] **Step 1: Field**

| Function | Action |
|---|---|
| `createMeasurementFromPdf` | `FIELD_MEASUREMENT_CREATED` + `entityType/Id` ou só `measurementId` do novo id |
| `saveFieldMeasurement` | `FIELD_MEASUREMENT_SAVED` |
| `updateMeasurementHeader` | `FIELD_HEADER_UPDATED` |
| `deleteMeasurement` | `FIELD_MEASUREMENT_DELETED` (gravar **antes** do delete cascade, ou com `measurementId` e aceitar SET NULL no FK — preferir gravar o evento **na mesma tx imediatamente antes** do delete; se FK SET NULL, o `measurement_id` fica null após delete — então **incluir `number` da OS no payload** e gravar audit antes do delete com measurementId ainda válido; após cascade o FK vira null se ON DELETE SET NULL. Spec usa SET NULL: o evento permanece com actor/action/payload mesmo se measurement_id for anulado. Para delete, colocar `osNumber` no payload.) |

Sempre `const session = await requireRole(...)`.

- [ ] **Step 2: `moveOSCard`**

```ts
const session = await requireRole(["gerente", "admin"]);
// ...
await tx.insert(statusHistory).values({
  measurementId: osId,
  fromStatus,
  toStatus: target,
  changedById: session.userId,
  metadata: { source: "kanban_drag" },
});
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.OS_STAGE_CHANGED,
  measurementId: osId,
  payload: { fromStatus, toStatus: target, source: "kanban_drag" },
});
```

- [ ] **Step 3: `revertOSPhaseForVaosAction`**

```ts
changedById: session.userId,
// +
await recordAuditEvent(tx, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.OS_STAGE_REVERTED,
  measurementId: osId,
  payload: { phase, fromStatus, toStatus: targetStatus, revertedItemIds: itemIds },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/field-actions.ts src/actions/kanban-actions.ts src/actions/stage-revert-actions.ts
git commit -m "feat(audit): instrumenta field, kanban e revert de etapa"
```

---

### Task 7: Admin actions

**Files:**
- Modify: `src/actions/user-admin-actions.ts`
- Modify: `src/actions/vehicle-actions.ts`
- Modify: `src/actions/lookup-admin-actions.ts`
- Modify: `src/actions/role-access-actions.ts`
- Modify: `src/actions/scoring-actions.ts`

- [ ] **Step 1: Users**

Após create/update/delete bem-sucedido (na mesma tx se existir; senão envolver):

```ts
await recordAuditEvent(db, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.ADMIN_USER_CREATED, // ou UPDATED / DELETED
  entityType: "user",
  entityId: targetUserId,
  payload: { fields: ["name", "email", "roles", "active"] }, // só campos tocados no update
});
```

- [ ] **Step 2: Vehicles**

`ADMIN_VEHICLE_CREATED` / `UPDATED` / `DELETED` com `entityType: "vehicle"`.

- [ ] **Step 3: Lookups**

Usar `entityType` = `"cor" | "tipo_vidro" | "tipo_envidracamento" | "ambiente"` e `entityId` = id do registro. Actions: `ADMIN_LOOKUP_CREATED` / `UPDATED` / `DELETED` com `payload: { lookup: entityType }`.

- [ ] **Step 4: Role access**

`ADMIN_ROLE_ACCESS_UPDATED` com `payload` resumindo o que mudou (ex. contagem de cells) — evitar dump enorme da matriz inteira se possível; se a action salva a matriz toda, `payload: { roleCount, cellCount }` basta.

- [ ] **Step 5: Scoring**

```ts
await recordAuditEvent(db, {
  actorId: session.userId,
  action: AUDIT_ACTIONS.ADMIN_SCORING_RULE_UPDATED,
  entityType: "scoring_rule",
  entityId: eventType,
  payload: { points, active },
});
```

- [ ] **Step 6: Commit**

```bash
git add src/actions/user-admin-actions.ts src/actions/vehicle-actions.ts src/actions/lookup-admin-actions.ts src/actions/role-access-actions.ts src/actions/scoring-actions.ts
git commit -m "feat(audit): instrumenta ações admin"
```

---

### Task 8: Verificação final

- [ ] **Step 1: Grep de cobertura**

```bash
rg "insert\\(statusHistory\\)" src/actions -A 8
```

Expected: todo bloco `.values({` inclui `changedById`.

```bash
rg "recordAuditEvent" src/actions --stats
```

Expected: ocorrências em cutting, transport, installation*, installer, field, kanban, stage-revert, user-admin, vehicle, lookup-admin, role-access, scoring.

- [ ] **Step 2: Suite de testes**

```bash
npm test
```

Expected: todos os testes passando (incluindo `record-audit-event.test.ts`).

- [ ] **Step 3: Smoke manual (dev)**

1. Login como cortador/admin.
2. Marcar uma ticagem de corte.
3. SQL:

```sql
SELECT action, actor_id, item_id, payload, created_at
FROM audit_events
ORDER BY created_at DESC
LIMIT 5;
```

Expected: linha `cutting.step_checked` com `actor_id` do usuário logado.

4. Desmarcar a mesma ticagem → nova linha `cutting.step_unchecked`; a anterior permanece.

- [ ] **Step 4: Commit de polish se houver ajustes; senão encerrar**

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Tabela `audit_events` + índices | Task 1 |
| Helper + actions tipadas | Task 2 |
| Ticagens cutting/transport/installation | Tasks 3–5 |
| Atribuições driver/installer/vehicle | Tasks 4–5 |
| Field create/save/header/delete | Task 6 |
| Kanban + revert + `changedById` | Tasks 3, 6 |
| Admin users/vehicles/lookups/role/scoring | Task 7 |
| Undo = novo evento (não delete audit) | Tasks 2–5 (só insert) |
| Mesma transaction / falha rollback | Tasks 3–7 |
| Sem UI | — |
| Testes unitários helper | Task 2 |
| Sem backfill | — |

## Notes for implementers

- Preferir `const session = await requireRole(...)` em vez de descartar o retorno.
- Nunca chamar `recordAuditEvent` fora da transaction da mutação.
- Não alterar lógica de `work_events` / `findActiveCortador` além do necessário.
- PowerShell: commits sem heredoc bash; usar `-m "linha1"` ou mensagem multilinha PowerShell.
