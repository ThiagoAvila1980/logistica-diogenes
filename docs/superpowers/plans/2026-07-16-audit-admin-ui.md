# Audit Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela `/admin/auditoria` (só admin) com feed global de `audit_events`, filtros e drill-down por OS.

**Architecture:** Page server lê `searchParams` → `listAuditEvents` (Drizzle + joins) → painel client com formulário GET de filtros e lista. Labels PT em mapa tipado. Menu em `ADMIN_NAV_ITEMS`.

**Tech Stack:** Next.js App Router, Drizzle, Vitest, componentes UI existentes (`PageHeading`, `Button`, `Input`, `Badge`).

**Spec:** `docs/superpowers/specs/2026-07-16-audit-admin-ui-design.md`  
**Worktree:** `c:\dev\logistica_diogenes\.worktrees\audit-events` (branch `feat/audit-events`)

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/audit/action-labels.ts` | Labels PT + `formatAuditPayloadSummary` |
| `src/lib/audit/action-labels.test.ts` | Cobertura de todas as `AUDIT_ACTIONS` |
| `src/lib/data/audit-events.ts` | `listAuditEvents` + tipos de filtro/resultado |
| `src/components/admin/audit-admin-panel.tsx` | UI filtros + lista + paginação |
| `app/(dashboard)/admin/auditoria/page.tsx` | Gate admin + load dados |
| `src/lib/auth/permissions.ts` | Nav item Auditoria |
| `src/components/dashboard/administrative-nav-section.tsx` | Ícone |
| `src/components/dashboard/dashboard-shell.tsx` | Título da rota |

---

### Task 1: Labels PT + testes

**Files:**
- Create: `src/lib/audit/action-labels.ts`
- Create: `src/lib/audit/action-labels.test.ts`

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it, expect } from "vitest";
import { AUDIT_ACTIONS } from "./actions";
import { AUDIT_ACTION_LABELS, getAuditActionLabel } from "./action-labels";

describe("AUDIT_ACTION_LABELS", () => {
  it("tem label para cada AUDIT_ACTIONS", () => {
    for (const action of Object.values(AUDIT_ACTIONS)) {
      expect(AUDIT_ACTION_LABELS[action], action).toBeTruthy();
      expect(typeof AUDIT_ACTION_LABELS[action]).toBe("string");
    }
  });

  it("getAuditActionLabel retorna label conhecido e fallback bruto", () => {
    expect(getAuditActionLabel(AUDIT_ACTIONS.CUTTING_STEP_CHECKED)).toMatch(/corte/i);
    expect(getAuditActionLabel("unknown.action")).toBe("unknown.action");
  });
});
```

- [ ] **Step 2: Rodar e confirmar FAIL**

```bash
npx vitest run src/lib/audit/action-labels.test.ts
```

- [ ] **Step 3: Implementar `action-labels.ts`**

Exportar `AUDIT_ACTION_LABELS: Record<AuditAction, string>` com todas as keys de `AUDIT_ACTIONS` (textos curtos em PT, ex. `"cutting.step_checked"` → `"Corte marcado"`).

```ts
export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] ?? action;
}

export function formatAuditPayloadSummary(
  action: string,
  payload: Record<string, unknown> | null | undefined,
): string {
  // Resumo curto: step, fromStatus→toStatus, fields, lookup, etc.
  // Sem JSON bruto. Retornar "" se vazio.
}
```

- [ ] **Step 4: Testes PASS + commit**

```bash
git add src/lib/audit/action-labels.ts src/lib/audit/action-labels.test.ts
git commit -m "feat(audit): labels em portugues para actions"
```

---

### Task 2: Query `listAuditEvents`

**Files:**
- Create: `src/lib/data/audit-events.ts`

- [ ] **Step 1: Implementar query**

```ts
export type AuditEventListFilters = {
  measurementId?: string | null; // uuid OS
  osNumber?: string | null;      // busca por measurements.number (ilike)
  actorId?: string | null;
  action?: string | null;
  from?: Date | null;
  to?: Date | null;
  page?: number; // 1-based
  pageSize?: number; // default 50
};

export type AuditEventListItem = {
  id: string;
  createdAt: Date;
  action: string;
  actorId: string | null;
  actorName: string | null;
  measurementId: string | null;
  osNumber: string | null;
  cliente: string | null;
  itemId: string | null;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
};

export type AuditEventListResult = {
  items: AuditEventListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAuditEvents(
  filters: AuditEventListFilters,
): Promise<AuditEventListResult>
```

Usar `getDb()`, `auditEvents`, `users`, `measurements`, `and`/`eq`/`gte`/`lte`/`ilike`/`count`/`desc`.  
Se `osNumber` preenchido, filtrar `ilike` em `measurements.number` (join).  
Se `measurementId` preenchido, `eq(auditEvents.measurementId, ...)`.

Também: `listActiveUsersForAuditFilter()` → `{ id, name }[]` ordenado por nome (para o select).

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/audit-events.ts
git commit -m "feat(audit): query listAuditEvents com filtros"
```

---

### Task 3: Painel UI + page + nav

**Files:**
- Create: `src/components/admin/audit-admin-panel.tsx`
- Create: `app/(dashboard)/admin/auditoria/page.tsx`
- Modify: `src/lib/auth/permissions.ts` — add to `ADMIN_NAV_ITEMS`
- Modify: `src/components/dashboard/administrative-nav-section.tsx` — ícone `ScrollText` ou `History`
- Modify: `src/components/dashboard/dashboard-shell.tsx` — título "Auditoria"

- [ ] **Step 1: Page**

Espelhar `admin/scoring/page.tsx`:

```tsx
// gate admin
// parse searchParams: measurementId, os, actorId, action, from, to, page
// listAuditEvents + listActiveUsersForAuditFilter
// PageHeading + AuditAdminPanel
```

Search params (GET form):
- `os` → número OS (texto)
- `measurementId` → uuid (opcional; se vier de link interno)
- `actorId`, `action`, `from`, `to`, `page`

- [ ] **Step 2: Panel**

- Form `method="get"` com filtros (não precisa server action).
- Se `osNumber` ou `measurementId` ativo: banner “Histórico da OS …” + link limpar (`/admin/auditoria`).
- Tabela/lista: data · ator · ação · OS · vão · detalhe.
- Paginação: links `?page=N` preservando demais params.
- Empty states conforme spec.
- Usar classes/padrões dos outros painéis admin (card border, tipografia).

- [ ] **Step 3: Nav**

```ts
{ href: "/admin/auditoria", label: "Auditoria", match: "/admin/auditoria" },
```

Ícone + shell title.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/admin/auditoria src/components/admin/audit-admin-panel.tsx src/lib/auth/permissions.ts src/components/dashboard/administrative-nav-section.tsx src/components/dashboard/dashboard-shell.tsx
git commit -m "feat(audit): tela admin de auditoria com filtros e drill-down"
```

---

### Task 4: Verificação

- [ ] `npx tsc --noEmit`
- [ ] `npx vitest run src/lib/audit/action-labels.test.ts` (ou suite se worktree permitir)
- [ ] Smoke: abrir `/admin/auditoria` logado como admin; confirmar menu; filtrar por OS.

---

## Spec coverage

| Spec | Task |
|---|---|
| Rota + menu Admin | Task 3 |
| Feed + filtros + paginação | Tasks 2–3 |
| Drill-down OS | Task 3 (`os` / `measurementId`) |
| Labels PT | Task 1 |
| Só admin | Task 3 page gate |
| Sem C / export / gerente | — |
