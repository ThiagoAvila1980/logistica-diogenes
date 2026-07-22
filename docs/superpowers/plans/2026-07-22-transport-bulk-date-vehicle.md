# Transporte em massa: data e veículo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir aplicar data e veículo a todas as etapas de todos os vãos no header de Transporte por vão, espelhando o bulk de motorista.

**Architecture:** Helpers puros + server actions + selects em massa no `TransportChecklist`, cada um alterando só o próprio campo em `stepAssignments`.

**Tech Stack:** Next.js App Router, Vitest, Drizzle, Zod.

---

### Task 1: Helpers

**Files:**
- Create: `src/lib/logistics/apply-assignment-to-all-vaos.ts` (ou estender `apply-driver-to-all-vaos.ts` com date/vehicle)
- Create/Modify: testes ao lado

- [ ] Testes RED para `applyScheduledDateToAllVaoSteps` e `applyVehicleToAllVaoSteps`
- [ ] Implementar helpers
- [ ] Testes GREEN

### Task 2: Actions

**Files:**
- Modify: `src/actions/transport-actions.ts`
- Modify: `src/lib/audit/actions.ts` + labels se precisar ações de data

- [ ] `assignScheduledDateToAllVaosAction`
- [ ] `assignVehicleToAllVaosAction`

### Task 3: UI

**Files:**
- Create: `transport-bulk-date-select.tsx`, `transport-bulk-vehicle-select.tsx`
- Modify: `transport-checklist.tsx`

- [ ] Controles no header junto ao motorista
- [ ] Commit
