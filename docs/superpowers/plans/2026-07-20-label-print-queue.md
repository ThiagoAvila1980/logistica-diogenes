# Label Print Queue Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Impressão de etiquetas via fila no servidor, sem túnel nem URL de agente no celular.

**Architecture:** Browser cria job autenticado; agente Windows faz claim/result com token; UI faz poll do status.

**Tech Stack:** Next.js API routes, Drizzle/Postgres, label-print-agent Node.

---

### Task 1: Schema + migration

- [ ] Add `label_print_jobs` to `src/db/schema.ts`
- [ ] Add migration `0003_label_print_jobs.sql` + journal entry

### Task 2: Lib + API

- [ ] `src/lib/labels/print-jobs.ts` (create, get, claim, complete)
- [ ] POST/GET job routes (session)
- [ ] Agent claim/result routes (token)

### Task 3: Client print flow

- [ ] Enqueue + poll in `print-label.ts`
- [ ] Simplify `print-vao-label-button.tsx` (sem URL de agente)

### Task 4: Agente Windows

- [ ] Poll loop in `server.mjs`
- [ ] Update `impressao.bat` + docs + `.env.example`

### Task 5: Verify

- [ ] Lint/typecheck touched files; smoke-test logic
