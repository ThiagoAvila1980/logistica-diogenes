# Audit Checklist Indicators (C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or execute inline.

**Goal:** Admin vê “Feito por X em dd/MM/yyyy HH:mm” nas ticagens (tooltip no corte; inline em transporte/instalação).

**Spec:** `docs/superpowers/specs/2026-07-16-audit-checklist-indicators-design.md`

### Task 1: Helper + format
- `getStepCompletionMetaForOs` in audit-events.ts
- `formatStepAuditLabel` 
- unit test for reduce logic if extractable

### Task 2: Wire pages + checklists
- Pass meta only for admin
- cutting / transport / installation UI

### Task 3: Verify tsc + smoke
