# Escopo do instalador por vão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalador só vê OS com vãos designados a ele (`installerId`) e, dentro da OS, só esses vãos — sem fallback de `assignedUserId` e sem listagem em transporte.

**Architecture:** Endurecer helpers em `installation-installer-access` e `filter-orders`; alinhar `canAccessOrder`, listagem/detalhe de instalação e filtro de Concluídos. Admin/gerente permanecem com visão total. TDD: atualizar testes que documentam o legado, depois o código.

**Tech Stack:** Next.js App Router, Vitest, helpers de acesso em `src/lib`.

**Spec:** `docs/superpowers/specs/2026-07-22-installer-vao-scope-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/installation/installation-installer-access.ts` | Responsabilidade e pendência estritas por vão |
| `src/lib/installation/installation-installer-access.test.ts` | Testes dos helpers |
| `src/lib/installation/filter-orders.ts` | Candidatos da listagem (sem transporte p/ instalador) |
| `src/lib/installation/filter-orders.test.ts` | Testes da listagem |
| `src/lib/auth/order-access.ts` | Assinatura de chamada (pode simplificar args) |
| `src/lib/auth/order-access.test.ts` | Expectativas de acesso |
| `src/lib/data/concluded-orders.ts` | Filtro de Concluídos sem legado |
| `src/lib/data/concluded-orders.test.ts` | Testes de Concluídos |
| `app/(dashboard)/installation/[osId]/page.tsx` | Checklist só com vãos do instalador |
| `app/(dashboard)/installation/page.tsx` | Chamada do helper (se assinatura mudar) |

---

### Task 1: Responsabilidade estrita por vão

**Files:**
- Modify: `src/lib/installation/installation-installer-access.ts`
- Modify: `src/lib/installation/installation-installer-access.test.ts`
- Modify: `src/lib/auth/order-access.ts` (chamadas)
- Modify: `src/lib/auth/order-access.test.ts`
- Modify: `app/(dashboard)/installation/page.tsx` (se assinatura de `hasPending…` mudar)

- [ ] **Step 1: Atualizar testes para a regra estrita (falhando no legado atual)**

Em `installation-installer-access.test.ts`, substituir os casos de legado:

```ts
it("exige designação por vão (sem fallback de responsável geral)", () => {
  expect(isInstallerResponsibleForOrder("u1", [])).toBe(false);
  expect(isInstallerResponsibleForOrder("u1", ["u2"])).toBe(false);
  expect(isInstallerResponsibleForOrder("u1", ["u1"])).toBe(true);
});
```

No describe de `hasPendingInstallationWorkForInstaller`, trocar o teste legado por:

```ts
it("sem vão designado ao instalador, não há pendência (sem fallback)", () => {
  const items = [
    {
      id: "a",
      qty: 1,
      largura: 1,
      altura: 1,
      installationProgress: {
        estrutural: false,
        vidros: false,
        acabamento: false,
        concluido: false,
      },
    },
  ] as MeasurementLineItem[];

  expect(hasPendingInstallationWorkForInstaller(items, "u1")).toBe(false);
});
```

Atualizar as chamadas existentes de `hasPendingInstallationWorkForInstaller` / `isInstallerResponsibleForOrder` nos testes para a nova assinatura (sem `assignedUserId`).

Em `order-access.test.ts`, alterar:

```ts
it("bloqueia instalação só com assignedUserId (sem vão designado)", () => {
  expect(
    canAccessOrder(pedro, {
      assignedUserId: "instalador-pedro",
      status: "instalacao_estrutural",
      installerIds: [],
    }),
  ).toBe(false);
});
```

(Remover ou renomear o teste atual `permite responsável geral legado…`.)

- [ ] **Step 2: Rodar testes e confirmar falha**

Run:

```bash
npx vitest run src/lib/installation/installation-installer-access.test.ts src/lib/auth/order-access.test.ts
```

Expected: FAIL nos casos que ainda esperam fallback legado no código.

- [ ] **Step 3: Implementar helpers estritos**

Em `installation-installer-access.ts`:

```ts
/** Designação por vão apenas — sem fallback de responsável geral da OS. */
export function isInstallerResponsibleForOrder(
  userId: string,
  installerIds: readonly string[] | undefined,
): boolean {
  return isAssignedInstaller(userId, installerIds);
}

/**
 * Há vão de instalação incompleto designado a este instalador?
 * Sem vão no nome dele → false (OS some da listagem).
 */
export function hasPendingInstallationWorkForInstaller(
  items: MeasurementLineItem[],
  installerId: string,
): boolean {
  const scoped = selectInstallationLineItems(items);
  const relevant = scoped.filter(
    (i) => i.installationProgress?.installerId === installerId,
  );
  if (relevant.length === 0) return false;
  return relevant.some((i) => !isVaoInstallationConcluded(i));
}
```

Atualizar chamadas em `order-access.ts` (remover 3º arg `assignedUserId`) e em `app/(dashboard)/installation/page.tsx`:

```ts
hasPendingInstallationWorkForInstaller(items, session.userId)
```

- [ ] **Step 4: Rodar testes e confirmar passagem**

Run:

```bash
npx vitest run src/lib/installation/installation-installer-access.test.ts src/lib/auth/order-access.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/installation/installation-installer-access.ts src/lib/installation/installation-installer-access.test.ts src/lib/auth/order-access.ts src/lib/auth/order-access.test.ts "app/(dashboard)/installation/page.tsx"
git commit -m "fix(installation): responsabilidade do instalador só por vão."
```

---

### Task 2: Listagem `/installation` sem transporte para instalador

**Files:**
- Modify: `src/lib/installation/filter-orders.ts`
- Modify: `src/lib/installation/filter-orders.test.ts`

- [ ] **Step 1: Atualizar teste de transporte**

Em `filter-orders.test.ts`, substituir o caso que inclui transporte para instalador:

```ts
it("exclui transporte da listagem do instalador", () => {
  expect(
    isInstallationIndexCandidate(
      makeOrder({ status: "transporte_levar_vidro" }),
      ["instalador"],
    ),
  ).toBe(false);
});
```

Manter o caso admin/gerente incluindo transporte.

- [ ] **Step 2: Rodar teste e confirmar falha**

Run:

```bash
npx vitest run src/lib/installation/filter-orders.test.ts
```

Expected: FAIL em `exclui transporte da listagem do instalador`

- [ ] **Step 3: Ajustar `isInstallationIndexCandidate`**

```ts
export function isInstallationIndexCandidate(
  order: OrderListItem,
  roles: readonly UserRole[],
): boolean {
  if (order.status === "concluido") return false;
  if (order.status.startsWith("instalacao")) return true;
  if (isTransportPhaseStatus(order.status)) {
    return canViewAllOrders(roles);
  }
  return false;
}
```

- [ ] **Step 4: Rodar testes**

Run:

```bash
npx vitest run src/lib/installation/filter-orders.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/installation/filter-orders.ts src/lib/installation/filter-orders.test.ts
git commit -m "fix(installation): instalador não lista OS em transporte."
```

---

### Task 3: Concluídos sem fallback legado

**Files:**
- Modify: `src/lib/data/concluded-orders.ts`
- Modify: `src/lib/data/concluded-orders.test.ts`

- [ ] **Step 1: Atualizar testes**

Remover/alterar casos que esperam legado com `assignedUserId` e `installerId: null`.

Substituir `usa responsável geral legado…` e `no legado, devolve só os vãos concluídos…` por:

```ts
it("sem vão com installerId do usuário, não lista a OS", () => {
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
            installerName: null,
            estrutural: true,
            vidros: false,
            acabamento: false,
            concluido: true,
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

  expect(result).toHaveLength(0);
});
```

Manter os casos de designação por vão (só vãos dele / `concluido`).

- [ ] **Step 2: Rodar e confirmar falha**

Run:

```bash
npx vitest run src/lib/data/concluded-orders.test.ts
```

Expected: FAIL no caso novo (ainda passa no código legado) — o novo teste deve falhar até o Step 3.

- [ ] **Step 3: Simplificar `filterConcludedOrdersForInstaller`**

```ts
/** Instalador vê apenas OS/vãos com installerId dele e conclusão registrada. */
export function filterConcludedOrdersForInstaller(
  orders: ConcludedOrderItem[],
  userId: string,
): ConcludedOrderItem[] {
  return orders
    .map((order) => {
      const workedVaos = order.vaos.filter(
        (vao) => vao.installerId === userId && hasVaoInstallationWork(vao),
      );
      if (workedVaos.length === 0) return null;
      return {
        ...order,
        ...summarizeVaos(workedVaos),
      };
    })
    .filter((order): order is ConcludedOrderItem => order !== null);
}
```

- [ ] **Step 4: Rodar testes**

Run:

```bash
npx vitest run src/lib/data/concluded-orders.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/concluded-orders.ts src/lib/data/concluded-orders.test.ts
git commit -m "fix(concluded): instalador só vê vãos com installerId dele."
```

---

### Task 4: Detalhe `/installation/[osId]` só com vãos do instalador

**Files:**
- Modify: `app/(dashboard)/installation/[osId]/page.tsx`

- [ ] **Step 1: Remover ramo `assignedUserId` no filtro de itens**

Trocar o bloco `visibleItems` por:

```tsx
  const visibleItems = isManager
    ? detail.items
    : detail.items.filter(
        (item) => item.installationProgress?.installerId === session?.userId,
      );

  if (!isManager && visibleItems.length === 0) {
    notFound();
  }
```

(`getServiceOrderById` já bloqueia OS sem o instalador em `installerIds`; este `notFound` cobre o edge de lista vazia.)

- [ ] **Step 2: Verificação manual rápida**

Com `npm run dev`:

1. Logar como instalador com vão designado → ver só esses vãos.
2. Abrir OS sem vão no nome (URL direta) → 404.
3. Admin → todos os vãos.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/installation/[osId]/page.tsx"
git commit -m "fix(installation): checklist do instalador só com seus vãos."
```

---

### Task 5: Verificação final

- [ ] **Step 1: Suite dos módulos tocados**

Run:

```bash
npx vitest run src/lib/installation src/lib/auth/order-access.test.ts src/lib/data/concluded-orders.test.ts
```

Expected: all PASS

- [ ] **Step 2: Push se o usuário pedir**

Não fazer push automaticamente; só se solicitado.

---

## Spec coverage check

| Requisito do spec | Task |
|-------------------|------|
| Só OS com vão `installerId === userId` | 1, 4 |
| Dentro da OS só esses vãos | 4 |
| Sem fallback `assignedUserId` | 1, 3, 4 |
| Listagem só `instalacao_*` | 2 |
| Concluídos mesma regra | 3 |
| Admin/gerente inalterados | 1–4 (ramos `canViewAll` / `isManager`) |
| Fora de escopo (kanban, fotos, designação) | — não tocado |
