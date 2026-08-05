# Arquivar medição — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir arquivar medições com confirmação, persistindo `archived_at`, movendo ações para dentro do card e separando Ativas/Arquivadas em `/field`.

**Architecture:** Coluna nullable `archived_at` em `measurements`; listagens padrão excluem arquivadas; `/field` carrega ativas e arquivadas e alterna por abas no cliente; action `archiveMeasurement` (admin) + diálogo espelhando o de exclusão; botões Arquivar/Excluir passam a viver dentro do `FieldOrderCard`.

**Tech Stack:** Next.js App Router, Drizzle/Postgres, Lucide, Vitest, shadcn Dialog/Button.

**Commits:** Só criar commits se o usuário pedir explicitamente. Marcar steps de commit como opcionais.

**Spec:** `docs/superpowers/specs/2026-08-05-archive-measurement-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/db/schema.ts` + migration | Coluna `archived_at` |
| `src/lib/data/types.ts` | `archivedAt` em `OrderListItem` |
| `src/lib/data/db-repository.ts` | Select/map + filtro de arquivo |
| `src/lib/data/orders.ts` | Propagar `archiveFilter` |
| `src/lib/offline/db.ts` | Cache offline com `archivedAt` |
| `src/lib/auth/permissions.ts` | `canArchiveMeasurement` |
| `src/lib/audit/actions.ts` + `action-labels.ts` | Audit action |
| `src/actions/field-actions.ts` | `archiveMeasurement` |
| `src/components/field/archive-measurement-dialog.tsx` | UI confirmação |
| `src/components/field/field-order-card.tsx` | Slot de ações no canto |
| `src/components/field/field-order-card-with-delete.tsx` | Compor Arquivar+Excluir |
| `src/components/field/field-order-index.tsx` | Abas Ativas/Arquivadas |
| `app/(dashboard)/field/page.tsx` | Carregar ambos conjuntos |

---

### Task 1: Schema + migration `archived_at`

**Files:**
- Modify: `src/db/schema.ts` (tabela `measurements`)
- Create: migration via `npm run db:generate` (ou SQL manual `src/db/migrations/0004_*.sql` + journal)

- [ ] **Step 1: Adicionar coluna no schema**

Em `measurements`, após `deviceId` (ou junto dos timestamps):

```ts
archivedAt: timestamp("archived_at", { withTimezone: true }),
```

No array de índices da tabela, adicionar:

```ts
index("idx_meas_archived_at").on(t.archivedAt),
```

- [ ] **Step 2: Gerar e aplicar migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: migration cria `archived_at` timestamptz nullable + índice; migrate aplica no banco de dev.

Se `db:generate` falhar por journal legado, criar à mão:

```sql
ALTER TABLE "measurements" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_meas_archived_at" ON "measurements" USING btree ("archived_at");
```

e registrar em `src/db/migrations/meta/_journal.json` com `when` **maior** que o último entry.

- [ ] **Step 3: Commit (opcional)** — só se o usuário pedir

---

### Task 2: Types + filtro na listagem

**Files:**
- Modify: `src/lib/data/types.ts`
- Modify: `src/lib/data/db-repository.ts`
- Modify: `src/lib/data/orders.ts`
- Modify: `src/lib/offline/db.ts`
- Test: `src/lib/data/archive-filter.test.ts` (novo)

- [ ] **Step 1: Teste falhando — helper de filtro**

Criar `src/lib/data/archive-filter.ts`:

```ts
export type ArchiveFilter = "active" | "archived" | "all";

export function matchesArchiveFilter(
  archivedAt: Date | null | undefined,
  filter: ArchiveFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "archived") return archivedAt != null;
  return archivedAt == null;
}
```

Test `src/lib/data/archive-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchesArchiveFilter } from "./archive-filter";

describe("matchesArchiveFilter", () => {
  it("active: só sem archivedAt", () => {
    expect(matchesArchiveFilter(null, "active")).toBe(true);
    expect(matchesArchiveFilter(new Date(), "active")).toBe(false);
  });
  it("archived: só com archivedAt", () => {
    expect(matchesArchiveFilter(null, "archived")).toBe(false);
    expect(matchesArchiveFilter(new Date(), "archived")).toBe(true);
  });
  it("all: sempre true", () => {
    expect(matchesArchiveFilter(null, "all")).toBe(true);
    expect(matchesArchiveFilter(new Date(), "all")).toBe(true);
  });
});
```

Run: `npx vitest run src/lib/data/archive-filter.test.ts`  
Expected: FAIL (módulo inexistente) até implementar o helper.

- [ ] **Step 2: Implementar helper** (código acima) e re-rodar — PASS

- [ ] **Step 3: Estender tipos**

Em `OrderListItem`:

```ts
archivedAt: Date | null;
```

- [ ] **Step 4: db-repository — select, map, where**

1. Importar `isNotNull` de `drizzle-orm` se necessário; já tem `isNull`, `and`.
2. Em `mapMeasurementRow`, aceitar `archivedAt: Date | null` e incluir no retorno.
3. Em ambos selects (`listServiceOrdersDb`, `getServiceOrderByIdDb`), selecionar `archivedAt: measurements.archivedAt`.
4. Assinatura:

```ts
export type ListOrdersOptions = {
  archiveFilter?: ArchiveFilter; // default "active"
};

export async function listServiceOrdersDb(
  session?: SessionUser | null,
  options?: ListOrdersOptions,
): Promise<OrderListItem[]> {
  const archiveFilter = options?.archiveFilter ?? "active";
  // ...
  const archiveClause =
    archiveFilter === "all"
      ? undefined
      : archiveFilter === "archived"
        ? isNotNull(measurements.archivedAt)
        : isNull(measurements.archivedAt);

  const whereParts = [accessWhere, archiveClause].filter(Boolean);
  if (whereParts.length) {
    query = query.where(and(...whereParts));
  }
}
```

Nota: `getServiceOrderByIdDb` **não** filtra por arquivo (detalhe continua acessível).

- [ ] **Step 5: orders.ts**

```ts
export async function listServiceOrders(
  options?: ListOrdersOptions,
): Promise<OrderListItem[]> {
  // ...
  const orders = await listServiceOrdersDb(session, options);
  // resto igual
}
```

- [ ] **Step 6: Offline cache**

Em `CachedMeasurement`, `toCachedMeasurement`, `fromCachedMeasurement`: incluir `archivedAt: string | null` (ISO). Default `null` na leitura se ausente (compatibilidade com cache antigo):

```ts
archivedAt: cached.archivedAt ? new Date(cached.archivedAt) : null,
```

- [ ] **Step 7: Commit (opcional)**

---

### Task 3: Permissions + audit + action

**Files:**
- Modify: `src/lib/auth/permissions.ts`
- Modify: `src/lib/auth/permissions.test.ts`
- Modify: `src/lib/audit/actions.ts`
- Modify: `src/lib/audit/action-labels.ts`
- Modify: `src/actions/field-actions.ts`
- Test: `src/lib/auth/permissions.test.ts`

- [ ] **Step 1: Teste — canArchiveMeasurement**

Em `permissions.test.ts`:

```ts
import { canDeleteMeasurement, canArchiveMeasurement } from "./permissions";

describe("canArchiveMeasurement", () => {
  it("igual ao delete: só admin", () => {
    expect(canArchiveMeasurement(["admin"])).toBe(true);
    expect(canArchiveMeasurement(["gerente"])).toBe(false);
    expect(canArchiveMeasurement(["medidor"])).toBe(false);
  });
});
```

Run — FAIL até exportar a função.

- [ ] **Step 2: Implementar**

```ts
/** Arquivar medição — somente admin (mesmo critério da exclusão). */
export function canArchiveMeasurement(roles: readonly UserRole[]): boolean {
  return canDeleteMeasurement(roles);
}
```

- [ ] **Step 3: Audit**

Em `AUDIT_ACTIONS`:

```ts
FIELD_MEASUREMENT_ARCHIVED: "field.measurement_archived",
```

Em `action-labels.ts`:

```ts
[AUDIT_ACTIONS.FIELD_MEASUREMENT_ARCHIVED]: "Medição arquivada",
```

- [ ] **Step 4: Action `archiveMeasurement`**

Em `field-actions.ts`, espelhar `deleteMeasurement` sem purge de arquivos:

```ts
export type ArchiveMeasurementResult =
  | { success: true }
  | { success: false; message: string };

export async function archiveMeasurement(
  osId: string,
): Promise<ArchiveMeasurementResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return {
      success: false,
      message: authErrorMessage(err) ?? "Sem permissão para arquivar medição.",
    };
  }

  if (!osId || !z.string().uuid().safeParse(osId).success) {
    return { success: false, message: "ID inválido." };
  }

  const { getServiceOrderById } = await import("@/lib/data/orders");
  const order = await getServiceOrderById(osId);
  if (!order) {
    return { success: false, message: "Medição não encontrada." };
  }

  if (order.archivedAt) {
    return { success: true }; // idempotente
  }

  try {
    const db = getDb();
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(measurements)
        .set({ archivedAt: now, updatedAt: now })
        .where(and(eq(measurements.id, osId), isNull(measurements.archivedAt)));

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.FIELD_MEASUREMENT_ARCHIVED,
        measurementId: osId,
        payload: { osNumber: order.number },
      });
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (error) {
    console.error("[archiveMeasurement]", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao arquivar medição",
    };
  }
}
```

Imports necessários: `and`, `isNull`, `AUDIT_ACTIONS.FIELD_MEASUREMENT_ARCHIVED`.

- [ ] **Step 5: Commit (opcional)**

---

### Task 4: Dialog + card UI

**Files:**
- Create: `src/components/field/archive-measurement-dialog.tsx`
- Modify: `src/components/field/field-order-card.tsx`
- Modify: `src/components/field/field-order-card-with-delete.tsx`
- Modify: `src/components/field/delete-measurement-dialog.tsx` (sem mudança de API, se já ok)

- [ ] **Step 1: `ArchiveMeasurementDialog`**

Espelhar `delete-measurement-dialog.tsx`:

- Ícone: `Archive` (lucide)
- `aria-label="Arquivar medição"`
- Título: “Arquivar medição?”
- Descrição: sai da lista ativa; disponível em Arquivadas; dados/arquivos preservados
- Botão confirmar: “Arquivar”
- Chama `archiveMeasurement(osId)`; em sucesso `router.refresh()` (sem redirect)

Classes do botão: ghost icon, muted hover (não destructive):

```ts
"h-9 w-9 shrink-0 text-muted-foreground hover:bg-primary/5 hover:text-primary"
```

- [ ] **Step 2: `FieldOrderCard` — slot de ações**

```ts
type FieldOrderCardProps = {
  order: OrderListItem;
  actions?: React.ReactNode;
};

// Na linha principal, após PrintMeasurementMenu:
{actions}
```

Manter `PrintMeasurementMenu` à esquerda das actions.

- [ ] **Step 3: `FieldOrderCardWithDelete`**

Remover layout lateral. Compor dentro do card:

```tsx
export function FieldOrderCardWithDelete({
  order,
  canDelete,
  canArchive = canDelete, // admin
  showArchive = true,
}: {
  order: OrderListItem;
  canDelete: boolean;
  canArchive?: boolean;
  showArchive?: boolean;
}) {
  const displayNumber = getOrderDisplayNumber(order);
  const actions =
    canDelete || (canArchive && showArchive) ? (
      <div
        className="flex shrink-0 items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {canArchive && showArchive && (
          <ArchiveMeasurementDialog
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
          />
        )}
        {canDelete && (
          <DeleteMeasurementDialog
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
          />
        )}
      </div>
    ) : null;

  return <FieldOrderCard order={order} actions={actions} />;
}
```

Ordem visual: PDF (no card) · Arquivar · Excluir.

- [ ] **Step 4: Commit (opcional)**

---

### Task 5: Página `/field` — Ativas | Arquivadas

**Files:**
- Modify: `app/(dashboard)/field/page.tsx`
- Modify: `src/components/field/field-order-index.tsx`

- [ ] **Step 1: Server page**

```tsx
const [activeOrders, archivedOrders, lookups] = await Promise.all([
  listServiceOrders({ archiveFilter: "active" }),
  listServiceOrders({ archiveFilter: "archived" }),
  listMeasurementLookups(),
]);

const fieldActive = activeOrders.filter((o) => o.status.startsWith("medicao"));
const fieldArchived = archivedOrders.filter((o) =>
  o.status.startsWith("medicao"),
);

const canArchive = canArchiveMeasurement(roles); // ou canDelete

// PageHeading count: não fixar; deixar o index controlar, OU passar count dinâmico via client.
// Abordagem: PageHeading sem count; FieldOrderIndex mostra count no toggle.
```

Preferência: manter `PageHeading` com título “Medições” e children; o índice recebe ambos arrays e um heading interno com count, **ou** `FieldOrderIndex` reporta via callback. Mais simples:

```tsx
<PageHeading title="Medições" icon={Ruler}>
  {canCreate && <CreateMeasurementDialog />}
</PageHeading>
<FieldOrderIndex
  activeOrders={fieldActive}
  archivedOrders={fieldArchived}
  canDelete={canDelete}
  canArchive={canArchive}
/>
<FieldCacheHydrator orders={fieldActive} lookups={lookups} />
```

- [ ] **Step 2: FieldOrderIndex com abas**

```tsx
type Tab = "active" | "archived";

const [tab, setTab] = useState<Tab>("active");
const orders = tab === "active" ? activeOrders : archivedOrders;

// Toggle UI:
<div className="flex gap-2">
  <Button variant={tab === "active" ? "default" : "outline"} size="sm"
    onClick={() => setTab("active")}>
    Ativas ({activeOrders.length})
  </Button>
  <Button variant={tab === "archived" ? "default" : "outline"} size="sm"
    onClick={() => setTab("archived")}>
    Arquivadas ({archivedOrders.length})
  </Button>
</div>

// renderItem:
<FieldOrderCardWithDelete
  order={order}
  canDelete={canDelete}
  canArchive={canArchive}
  showArchive={tab === "active"}
/>
```

Empty messages distintos por aba.

Offline: manter lógica atual só sobre `activeOrders`.

- [ ] **Step 3: Verificar no browser** com dados do banco de dev — arquivar uma OS, sumir de Ativas, aparecer em Arquivadas; excluir ainda no canto direito do card.

- [ ] **Step 4: Rodar testes**

```bash
npx vitest run src/lib/data/archive-filter.test.ts src/lib/auth/permissions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit (opcional)**

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Botões dentro do card, Arquivar à esquerda do Excluir | 4 |
| Diálogo de confirmação | 4 |
| Coluna `archived_at` + migration | 1 |
| Action + audit | 3 |
| Lista Ativas / Arquivadas | 5 |
| Listagens padrão sem arquivadas | 2 |
| Offline só ativas | 5 |
| Sem desarquivar | — (fora de escopo) |

## Self-review

- Sem TBD/placeholders de implementação.
- `archiveFilter` / `archivedAt` consistentes em types → db → UI.
- Commits marcados opcionais (regra do usuário).
