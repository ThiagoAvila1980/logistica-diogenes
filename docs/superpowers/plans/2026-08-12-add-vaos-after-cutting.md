# Adicionar vãos após plano de corte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que somente admin, a partir do card em `/production`, abra a medição com `?addVaos=1` e inclua novos vãos em OS já no plano de corte, sem alterar vãos já enviados.

**Architecture:** Botão ícone Plus no card de produção navega para `/field/[osId]?addVaos=1`. A página de campo libera o formulário só para admin + flag. O formulário inicia só com itens não enviados (lista vazia se todos já foram) e numera novos `vaoNumber` a partir de todos os itens da OS. `saveFieldMeasurement` ganha gate admin para salvar `final` após a medição mesmo sem remanescentes; o merge e o envio parcial ao corte já existentes completam o fluxo.

**Tech Stack:** Next.js App Router, Lucide, Vitest, shadcn Button.

**Commits:** Só criar commits se o usuário pedir explicitamente. Marcar steps de commit como opcionais.

**Spec:** `docs/superpowers/specs/2026-08-12-add-vaos-after-cutting-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/auth/permissions.ts` | `canAddVaosAfterCutting` |
| `src/lib/auth/permissions.test.ts` | Testes do helper |
| `src/lib/workflow/measurement-actions.ts` | Liberar ação `final` com intent `addVaosAfterCutting` |
| `src/lib/workflow/measurement-actions.test.ts` | Testes do gate de ações |
| `src/actions/field-actions.ts` | Gate de save: admin pode salvar novos vãos pós-medição |
| `src/components/order/order-card-add-vaos-action.tsx` | Ícone Plus → link com query |
| `src/components/production/production-order-index.tsx` | Compor Plus + Delete nas actions |
| `app/(dashboard)/production/page.tsx` | Passar `canAddVaos` |
| `app/(dashboard)/field/[osId]/page.tsx` | `searchParams` + gate + drafts vazios |
| `src/components/field/field-measurement-form.tsx` | Modo add-vaos: banner, lista vazia, `vaoNumber`, allowedActions |

---

### Task 1: Permissão `canAddVaosAfterCutting`

**Files:**
- Modify: `src/lib/auth/permissions.ts`
- Modify: `src/lib/auth/permissions.test.ts`

- [ ] **Step 1: Write the failing tests**

Em `src/lib/auth/permissions.test.ts`, adicionar:

```ts
import {
  canArchiveMeasurement,
  canDeleteMeasurement,
  canAddVaosAfterCutting,
} from "./permissions";

describe("canAddVaosAfterCutting", () => {
  it("permite somente admin", () => {
    expect(canAddVaosAfterCutting(["admin"])).toBe(true);
    expect(canAddVaosAfterCutting(["admin", "gerente"])).toBe(true);
  });

  it("nega gerente e demais papéis", () => {
    expect(canAddVaosAfterCutting(["gerente"])).toBe(false);
    expect(canAddVaosAfterCutting(["medidor"])).toBe(false);
    expect(canAddVaosAfterCutting(["cortador", "motorista", "instalador"])).toBe(
      false,
    );
    expect(canAddVaosAfterCutting([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/permissions.test.ts`

Expected: FAIL — `canAddVaosAfterCutting` is not exported / not a function.

- [ ] **Step 3: Implement helper**

Em `src/lib/auth/permissions.ts`, após `canArchiveMeasurement`:

```ts
/** Adicionar vãos após plano de corte — somente admin. */
export function canAddVaosAfterCutting(roles: readonly UserRole[]): boolean {
  return canDeleteMeasurement(roles);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth/permissions.test.ts`

Expected: PASS

- [ ] **Step 5: Commit (opcional — só se o usuário pedir)**

```bash
git add src/lib/auth/permissions.ts src/lib/auth/permissions.test.ts
git commit -m "feat(auth): permissão para admin adicionar vãos após o corte."
```

---

### Task 2: Liberar ação de medição `final` com intent add-vaos

**Files:**
- Modify: `src/lib/workflow/measurement-actions.ts`
- Modify: `src/lib/workflow/measurement-actions.test.ts`

Hoje `getAllowedMeasurementActions` retorna `[]` quando a OS já saiu da medição e não há vãos remanescentes. No modo add-vaos o formulário e o save precisam de `[FINAL_MEASUREMENT_TYPE]`.

- [ ] **Step 1: Write the failing tests**

Em `src/lib/workflow/measurement-actions.test.ts`, adicionar casos (ajustar imports existentes):

```ts
it("com addVaosAfterCutting libera só final mesmo sem remanescentes", () => {
  expect(
    getAllowedMeasurementActions(
      {
        etapa: "cortes",
        items: [item("a", { sentToCutting: true })],
      },
      { addVaosAfterCutting: true },
    ),
  ).toEqual(["final"]);
});

it("sem flag e sem remanescentes continua vazio fora da medição", () => {
  expect(
    getAllowedMeasurementActions({
      etapa: "cortes",
      items: [item("a", { sentToCutting: true })],
    }),
  ).toEqual([]);
});
```

(`item` helper já existe no arquivo de teste; se o nome diferir, usar o helper local.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/workflow/measurement-actions.test.ts`

Expected: FAIL — segundo argumento / opção inexistente.

- [ ] **Step 3: Implement option on `getAllowedMeasurementActions`**

Em `src/lib/workflow/measurement-actions.ts`:

```ts
export type MeasurementActionOptions = {
  /** Admin abrindo medição para incluir vãos após envio total ao corte. */
  addVaosAfterCutting?: boolean;
};

export function getAllowedMeasurementActions(
  order: MeasurementOrderContext,
  options?: MeasurementActionOptions,
): MeasurementDbType[] {
  if (isMedicaoPhaseStatus(order.etapa)) {
    return [ORCAMENTO_MEASUREMENT_TYPE, FINAL_MEASUREMENT_TYPE];
  }
  if (
    order.items &&
    hasRemainingUnsentMeasurementItems(order.items)
  ) {
    return [FINAL_MEASUREMENT_TYPE];
  }
  if (options?.addVaosAfterCutting) {
    return [FINAL_MEASUREMENT_TYPE];
  }
  return [];
}

export function isMeasurementActionAllowed(
  order: MeasurementOrderContext,
  type: MeasurementDbType,
  options?: MeasurementActionOptions,
): boolean {
  return getAllowedMeasurementActions(order, options).includes(type);
}
```

Atualizar qualquer chamada de `isMeasurementActionAllowed` que precise da opção (Task 3).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/workflow/measurement-actions.test.ts`

Expected: PASS (incluindo casos antigos de remanescentes).

- [ ] **Step 5: Commit (opcional)**

```bash
git add src/lib/workflow/measurement-actions.ts src/lib/workflow/measurement-actions.test.ts
git commit -m "feat(workflow): liberar medição final com intent add-vaos."
```

---

### Task 3: Gate de `saveFieldMeasurement` para admin pós-corte

**Files:**
- Modify: `src/actions/field-actions.ts` (trecho ~576–596)

Sem isto, o admin abre o form mas o save responde `"Esta OS não está em etapa de medição."`.

- [ ] **Step 1: Ajustar gate e checagem de ação**

Substituir o bloco que calcula `allowRemainingEdit` / bloqueia save por:

```ts
  const serverItemsForGate =
    (measForGate?.items as MeasurementLineItem[] | null) ?? [];
  const allowRemainingEdit =
    !order.status.startsWith("medicao") &&
    hasRemainingUnsentMeasurementItems(serverItemsForGate);
  const allowAdminAddVaos =
    !order.status.startsWith("medicao") &&
    hasRole(session.roles, "admin") &&
    measurementType === FINAL_MEASUREMENT_TYPE;

  if (
    !order.status.startsWith("medicao") &&
    !allowRemainingEdit &&
    !allowAdminAddVaos
  ) {
    return {
      success: false,
      message: "Esta OS não está em etapa de medição.",
    };
  }

  const orderContext = {
    etapa: order.status,
    items: serverItemsForGate,
  };

  if (
    !isMeasurementActionAllowed(orderContext, measurementType, {
      addVaosAfterCutting: allowAdminAddVaos && !allowRemainingEdit,
    })
  ) {
    return {
      success: false,
      message: getMeasurementActionErrorMessage(measurementType),
    };
  }
```

Garantir imports: `hasRole` de `@/lib/auth/permissions` (ou de onde o projeto já importa papéis), `FINAL_MEASUREMENT_TYPE`, e que `isMeasurementActionAllowed` aceite o 3º argumento da Task 2.

Manter `mergePreservingSentToCutting` inalterado no restante da action.

- [ ] **Step 2: Smoke estático**

Run: `npx tsc --noEmit` (ou o script de typecheck do repo, se houver)

Expected: sem erros nos arquivos tocados.

- [ ] **Step 3: Commit (opcional)**

```bash
git add src/actions/field-actions.ts
git commit -m "feat(field): admin pode salvar novos vãos após plano de corte."
```

---

### Task 4: Botão ícone no card de produção

**Files:**
- Create: `src/components/order/order-card-add-vaos-action.tsx`
- Modify: `src/components/production/production-order-index.tsx`
- Modify: `app/(dashboard)/production/page.tsx`

- [ ] **Step 1: Create `OrderCardAddVaosAction`**

```tsx
"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderCardAddVaosActionProps = {
  osId: string;
};

/** Ícone para admin adicionar vãos em OS já no plano de corte. */
export function OrderCardAddVaosAction({ osId }: OrderCardAddVaosActionProps) {
  return (
    <div
      className="flex shrink-0 items-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Adicionar vãos"
        title="Adicionar vãos"
        asChild
      >
        <Link href={`/field/${osId}?addVaos=1`}>
          <Plus className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
```

Se `Button` + `asChild` + `Link` não for o padrão do repo, usar `Link` com as mesmas classes do botão ghost do `DeleteMeasurementDialog` (sem `asChild`).

- [ ] **Step 2: Wire `ProductionOrderIndex`**

```tsx
import { OrderCardAddVaosAction } from "@/components/order/order-card-add-vaos-action";
import { OrderCardDeleteAction } from "@/components/order/order-card-delete-action";

type ProductionOrderIndexProps = {
  orders: OrderListItem[];
  stepsByOs: Record<string, CuttingSteps>;
  canDelete?: boolean;
  canAddVaos?: boolean;
};

export function ProductionOrderIndex({
  orders,
  stepsByOs,
  canDelete = false,
  canAddVaos = false,
}: ProductionOrderIndexProps) {
  // ... FilteredOrderList ...
          actions={
            canAddVaos || canDelete ? (
              <div
                className="flex shrink-0 items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {canAddVaos ? (
                  <OrderCardAddVaosAction osId={order.id} />
                ) : null}
                {canDelete ? (
                  <OrderCardDeleteAction
                    order={order}
                    redirectHref="/production"
                  />
                ) : null}
              </div>
            ) : undefined
          }
}
```

Ordem: **Plus → Excluir** (spec).

- [ ] **Step 3: Pass flag from production page**

Em `app/(dashboard)/production/page.tsx`:

```ts
import { canAddVaosAfterCutting, canDeleteMeasurement } from "@/lib/auth/permissions";

const canDelete = canDeleteMeasurement(session?.roles ?? []);
const canAddVaos = canAddVaosAfterCutting(session?.roles ?? []);

// ...
<ProductionOrderIndex
  orders={orders}
  stepsByOs={stepsByOs}
  canDelete={canDelete}
  canAddVaos={canAddVaos}
/>
```

- [ ] **Step 4: Commit (opcional)**

```bash
git add src/components/order/order-card-add-vaos-action.tsx \
  src/components/production/production-order-index.tsx \
  app/(dashboard)/production/page.tsx
git commit -m "feat(production): botão admin para adicionar vãos no card."
```

---

### Task 5: Gate na página `/field/[osId]` com `?addVaos=1`

**Files:**
- Modify: `app/(dashboard)/field/[osId]/page.tsx`

- [ ] **Step 1: Aceitar `searchParams` e calcular `addVaosMode`**

```tsx
import { canAddVaosAfterCutting, canDeleteMeasurement, hasAnyRole } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ osId: string }>;
  searchParams: Promise<{ addVaos?: string }>;
};

export default async function FieldOsPage({ params, searchParams }: Props) {
  const { osId } = await params;
  const { addVaos } = await searchParams;
  // ... load order, session, items ...
  const canAddVaos = canAddVaosAfterCutting(roles);
  const addVaosMode =
    canAddVaos && addVaos === "1" && !inMedicao && !hasRemaining;

  if (!inMedicao && !hasRemaining && !addVaosMode) {
    if (canManage) {
      return <FieldMeasurementPastStage order={order} canDelete={canDelete} />;
    }
    // bloqueio atual...
  }

  const [draftOrcamento, draftFinal, lookups] = await Promise.all([/* igual */]);

  const unsentFinalItems = draftFinal?.items
    ? selectUnsentMeasurementLineItems(draftFinal.items)
    : [];

  const finalForForm =
    (hasRemaining || addVaosMode) && draftFinal
      ? { ...draftFinal, items: unsentFinalItems }
      : hasRemaining && draftFinal?.items
        ? {
            ...draftFinal,
            items: selectUnsentMeasurementLineItems(draftFinal.items),
          }
        : draftFinal;

  // Preferir a forma clara:
  const finalForFormResolved = (() => {
    if (!draftFinal) return draftFinal;
    if (hasRemaining || addVaosMode) {
      return {
        ...draftFinal,
        items: selectUnsentMeasurementLineItems(draftFinal.items ?? []),
      };
    }
    return draftFinal;
  })();

  return (
    <>
      <FieldMeasurementForm
        order={order}
        lookups={lookups}
        draftsByType={{
          orcamento: draftOrcamento,
          final: finalForFormResolved,
        }}
        canEditHeader={canManage}
        canDelete={canDelete}
        canSendToCutting={canManage}
        allMeasurementItems={allItems}
        addVaosMode={addVaosMode}
      />
      <FieldDetailCacheHydrator
        order={order}
        draftsByType={{
          orcamento: draftOrcamento,
          final: finalForFormResolved,
        }}
        lookups={lookups}
      />
    </>
  );
}
```

Usar **apenas** `finalForFormResolved` (uma implementação); não deixar as duas variantes no código.

Query sem admin: `addVaosMode` fica `false` → past-stage/bloqueio (spec).

- [ ] **Step 2: Commit (opcional)**

```bash
git add app/(dashboard)/field/[osId]/page.tsx
git commit -m "feat(field): abrir medição com ?addVaos=1 para admin."
```

---

### Task 6: `FieldMeasurementForm` no modo add-vaos

**Files:**
- Modify: `src/components/field/field-measurement-form.tsx`

Problemas a cobrir:

1. `resolveInitialItems` com `items: []` cai no fallback e cria 1 vão com `vaoNumber: 1` (colide com enviados).
2. `getAllowedMeasurementActions` sem flag retorna `[]`.
3. `addItem` deve usar o máximo de `vaoNumber` em `allMeasurementItems` + itens do form.

- [ ] **Step 1: Props + initial type/items**

```ts
type FieldMeasurementFormProps = {
  // ... existentes
  /** Admin incluindo vãos após envio total ao corte (`?addVaos=1`). */
  addVaosMode?: boolean;
};

export function FieldMeasurementForm({
  // ...
  allMeasurementItems,
  addVaosMode = false,
}: FieldMeasurementFormProps) {
  const initialType =
    measurementTypeFromOsStatus(order.status) ?? FINAL_MEASUREMENT_TYPE;
  // Em addVaosMode, status não é medicao_* → measurementTypeFromOsStatus é null → final. OK.

  const initialDraft =
    draftsByType[initialType] ??
    draftsByType.orcamento ??
    draftsByType.final;

  const initialItems = addVaosMode
    ? backfillVaoNumbers(
        sortMeasurementItemsOldestFirst(initialDraft?.items ?? []),
      )
    : resolveInitialItems(order.id, initialDraft);
  // Com items [], initialItems = [] — sem vão fantasma.

  const initialViewMode = addVaosMode
    ? false
    : hasSavedMeasurementForView(initialDraft);
```

- [ ] **Step 2: Allowed actions + send remaining**

```ts
  const allowedActions = getAllowedMeasurementActions(orderContext, {
    addVaosAfterCutting: addVaosMode,
  });
```

Manter `canSendRemaining` como está: após o primeiro save + `router.refresh()`, `hasRemaining` fica true e o diálogo de envio aparece. Em addVaosMode **antes** do save, não mostrar envio (ainda não há itens persistidos não enviados).

- [ ] **Step 3: `addItem` com numeração global**

```ts
  function addItem() {
    setItems((prev) => {
      const maxExisting = Math.max(
        0,
        ...prev.map((item) => item.vaoNumber ?? 0),
        ...(allMeasurementItems ?? []).map((item) => item.vaoNumber ?? 0),
      );
      const newItem: MeasurementLineItem = {
        ...createEmptyMeasurementItem(`${order.id}-item-${Date.now()}`),
        vaoNumber: maxExisting + 1,
      };
      setExpandedItemId(newItem.id);
      return [...prev, newItem];
    });
  }
```

- [ ] **Step 4: Banner opcional**

No topo do formulário (após `ServiceOrderHeader` / antes da lista), se `addVaosMode`:

```tsx
{addVaosMode && (
  <Alert>
    <AlertDescription>
      Adicionando vãos a uma OS já em plano de corte. Os vãos já enviados
      permanecem protegidos.
    </AlertDescription>
  </Alert>
)}
```

Usar o `Alert` já importado no arquivo.

- [ ] **Step 5: Empty state**

Com `items.length === 0` e `!viewMode`, a lista fica vazia e o botão “Nova medição” continua disponível — sem criar vão automático. Se a UI de “remover último item” impedir `items.length === 0`, não alterar essa regra além do necessário; no modo add-vaos o admin começa em 0 e clica em Nova medição.

- [ ] **Step 6: Commit (opcional)**

```bash
git add src/components/field/field-measurement-form.tsx
git commit -m "feat(field): modo add-vaos no formulário de medição."
```

---

### Task 7: Verificação

- [ ] **Step 1: Unit tests**

Run:

```bash
npx vitest run src/lib/auth/permissions.test.ts src/lib/workflow/measurement-actions.test.ts
```

Expected: PASS

- [ ] **Step 2: Typecheck / lint nos arquivos tocados** (se o repo tiver script)

Run: `npx tsc --noEmit` ou `npm run lint` conforme `package.json`

Expected: sem erros novos.

- [ ] **Step 3: Smoke manual (dados reais do BD)**

1. Login como **admin**.
2. Em `/production`, no card de uma OS já no corte, clicar no ícone **Plus**.
3. URL deve ser `/field/[osId]?addVaos=1`; formulário com banner e lista vazia (ou só não-enviados).
4. Adicionar vão, preencher dimensões mínimas, salvar.
5. Enviar ao corte pelo fluxo existente.
6. Confirmar o vão novo em `/production/[osId]`.
7. Login como **gerente** (ou outro): sem ícone Plus; abrir `?addVaos=1` manualmente → past-stage/bloqueio.

- [ ] **Step 4: Commit final (opcional — só se o usuário pedir)**

```bash
git add -A
git status
# commit apenas arquivos desta feature
```

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Botão só ícone no card produção | Task 4 |
| Só admin | Task 1 + 4 + 5 |
| `?addVaos=1` | Task 4 + 5 |
| Formulário só novos / vazios | Task 5 + 6 |
| Merge / envio existentes | Task 3 (merge) + fluxo já em `sendItemsToCutting` |
| Banner | Task 6 |
| Sem migration / sem mock | N/A |
| Testes permissão | Task 1 |
| Gate save admin | Task 3 (necessário; implícito no objetivo da spec) |
| `vaoNumber` sem colisão | Task 6 |

**Nota:** a spec diz que não há action nova; o ajuste em `saveFieldMeasurement` é extensão do gate, não action dedicada.
