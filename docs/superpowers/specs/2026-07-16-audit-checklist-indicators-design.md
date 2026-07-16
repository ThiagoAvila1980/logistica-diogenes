# Design: Indicadores de auditoria nas checklists (etapa C)

**Data:** 2026-07-16  
**Status:** aprovado para implementação  
**Depende de:** `audit_events` (etapas A/B)

## Objetivo

Nas checklists de corte, transporte e instalação, o **admin** vê quem marcou cada ticagem e quando: `Feito por {nome} em dd/MM/yyyy HH:mm`.

## Decisões

1. Visível **somente para admin**.
2. Fonte: `audit_events` (último `*.step_checked` por `itemId` + `step` no payload).
3. UI mista: tooltip no corte; texto inline no painel expandido de transporte/instalação.
4. Sem evento → não mostra nada (OS antigas / pré-audit).
5. Não altera modelo JSONB nem a tela `/admin/auditoria`.

## Dados

Helper `getStepCompletionMetaForOs(osId)` em `src/lib/data/audit-events.ts`:

```ts
type StepCompletionMeta = { actorName: string; completedAt: Date };
// Map: itemId → step → meta
type StepCompletionMetaMap = Record<string, Partial<Record<string, StepCompletionMeta>>>;
```

Query: eventos da OS com `action IN (cutting.step_checked, transport.step_checked, installation.step_checked)`, join `users.name`, ordenar `created_at DESC`, reduzir no JS ao primeiro por `(itemId, payload.step)`.

## UI

| Checklist | Onde |
|---|---|
| Corte | `title` no Checkbox quando `done` |
| Transporte | Linha muted abaixo do step no expand |
| Instalação | Idem |

Prop: `stepAuditMeta?: StepCompletionMetaMap` (só preenchida se admin).

## Arquivos

- `src/lib/data/audit-events.ts` — helper
- `src/lib/audit/format-step-audit.ts` — `formatStepAuditLabel(meta)` → string PT
- `cutting-checklist.tsx`, `transport-checklist.tsx`, `installation-checklist.tsx`
- Pages/views que montam os checklists — passar meta se admin

## Fora de escopo

- Gerente / operadores
- Backfill
- Indicadores em atribuições (motorista/instalador) — só ticagens de step
