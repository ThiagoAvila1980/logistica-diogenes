# Fluxo Diógenes

Sistema de gestão de vidraçaria com pipeline em **máquina de estados** (medição → orçamento → produção → logística → instalação).

## Início rápido

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — redireciona para `/dashboard`.

Sem Supabase configurado, o app usa **dados mock** em memória. Com `DATABASE_URL` apontando para o Supabase, persiste no banco remoto.

### Com Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → Database**, copie:
   - **Connection string (Session pooler)** → `DATABASE_URL`
   - **Connection string (Direct)** → `DIRECT_URL`
3. Em **Project Settings → API**, copie URL e anon key (opcional por enquanto).
4. Configure o ambiente:

```bash
cp .env.example .env.local
# edite DATABASE_URL e DIRECT_URL
```

5. Aplique migrations e seed:

```bash
npm run db:migrate
npm run db:seed
```

> **Importante:** use `DIRECT_URL` (porta 5432) para `db:migrate` e `db:seed`. O app em runtime usa `DATABASE_URL` (pooler, porta 6543).

## Artefatos principais

| Arquivo | Descrição |
|---------|-----------|
| `src/db/schema.ts` | Schema Drizzle completo (relations + indexes) |
| `src/db/env.ts` | URLs Supabase (`DATABASE_URL` + `DIRECT_URL`) |
| `src/lib/workflow/status-machine.ts` | Grafo de transições + guards de negócio |
| `src/actions/service-order.ts` | Server Action de transição com validação |
| `src/components/workflow/status-wizard.tsx` | Wizard visual (shadcn + Lucide) |
| `docs/ESTRUTURA_PROJETO.md` | Árvore de pastas Next.js recomendada |

## Exemplo de transição

```typescript
import { advanceOSStatus } from "@/actions/os-actions";

const result = await advanceOSStatus({
  osId: "...",
  nextStatus: "em_corte",
  payload: {
    cuts: [{ item: "Perfil", length: 2100, width: 50, qty: 4 }],
  },
});

if (!result.success) {
  console.error(result.message);
}
```

### Scripts de banco

```bash
npm run db:generate            # gera migration a partir do schema
npm run db:migrate             # aplica migrations pendentes (via DIRECT_URL)
npm run db:migration-status    # diagnóstico: o que o Drizzle vai aplicar ou ignorar
npm run db:sync-drizzle-journal # registra hashes após apply manual (db-apply-*)
npm run db:seed                # popula dados iniciais
npm run db:studio              # Drizzle Studio
```

#### Migrations manuais

Algumas migrations (índices, refactors grandes) usam scripts `scripts/db-apply-*.mjs` em vez do `db:migrate`.

O `drizzle-kit migrate` **não usa hash** para decidir o que aplicar — compara o campo `when` do `_journal.json` com o **maior** `created_at` em `drizzle.__drizzle_migrations`. Se `when` for menor que esse máximo, a migration é ignorada silenciosamente.

Fluxo recomendado após apply manual:

```bash
npm run db:sync-drizzle-journal   # registra hashes faltantes
npm run db:migration-status       # confirma que não há pendências ignoradas
```

Para migrations novas geradas pelo Drizzle (`db:generate`), o `when` já vem correto e `db:migrate` funciona normalmente.

## Exemplo de UI

```tsx
import { StatusWizard } from "@/components/workflow/status-wizard";

<StatusWizard currentStatus="em_corte" overdueSteps={["medicao_final"]} />
```
