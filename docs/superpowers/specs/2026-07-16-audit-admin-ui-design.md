# Design: Tela de Auditoria (Admin)

**Data:** 2026-07-16  
**Status:** aprovado para implementação  
**Depende de:** `audit_events` (gravação — entrega A / branch `feat/audit-events`)  
**Fora de escopo:** indicadores nas checklists (entrega C), export CSV, acesso gerente

## Problema

Os eventos de auditoria já são gravados em `audit_events`, mas só são consultáveis via SQL. O admin precisa de uma tela no sistema para ver quem fez o quê e quando.

## Objetivo

Tela em **Administrativo** onde o admin:

1. Vê um **feed global** de eventos recentes, com filtros.
2. Faz **drill-down por OS** (filtrar/selecionar uma OS e ver só o histórico dela).

Sucesso: admin abre `/admin/auditoria`, filtra por OS ou usuário, e entende as ações sem sair do app.

## Decisões

1. **Abordagem 1:** uma única rota `/admin/auditoria` — feed + modo OS via query string (ex.: `?os=OS-123` ou `?measurementId=uuid`).
2. **Acesso:** somente `admin` (middleware `/admin/*` + gate na page).
3. **Menu:** item “Auditoria” em `ADMIN_NAV_ITEMS` (seção Administrativo), não em Configurações/Settings.
4. **Sem** embutir painel nas páginas operacionais de detalhe da OS nesta entrega.
5. Labels de ação em português (mapa a partir de `AUDIT_ACTIONS`).

## Alternativas descartadas

| Opção | Motivo |
|---|---|
| Painel embutido em cada `[osId]` | Usuário pediu tela específica em Administrativo |
| Duas rotas (`/auditoria` + `/auditoria/[osId]`) | Mais código; query string resolve |
| Colocar em `/reports` | Pedido explícito: Administrativo |

## UX

### Layout

- `PageHeading`: título “Auditoria”, descrição curta (“Quem fez o quê e quando nas operações e no admin”).
- Barra de filtros.
- Lista/tabela de eventos (mais recentes primeiro).
- Paginação (50 itens por página).

### Filtros

| Filtro | Comportamento |
|---|---|
| OS | Texto (número da OS) ou seleção; ao aplicar, entra em modo drill-down |
| Usuário | Select de usuários ativos (ou busca) |
| De / Até | Datas (opcional) |
| Tipo de ação | Select agrupado ou lista das actions conhecidas (opcional; pode ser “Todos”) |

Botão **Limpar filtros** volta ao feed global.

### Modo drill-down por OS

Quando há filtro de OS ativo:

- Banner/cabeçalho: “Histórico da OS {number}” (+ cliente se disponível).
- Lista só com `measurement_id` dessa OS.
- Link “Ver todas as OS” limpa o filtro de OS.
- Opcional: link para abrir a OS no módulo operacional (`getOsModuleHref…`) se a OS ainda existir.

### Linha do evento

| Campo | Fonte |
|---|---|
| Data/hora | `created_at` (timezone BR formatado) |
| Ator | `users.name` via join; “—” se `actor_id` null |
| Ação | Label PT de `action` |
| OS | `measurements.number` (join); “—” se null (eventos admin) |
| Vão | `item_id` (mostrar número do vão se resolvível; senão id curto) |
| Detalhe | Resumo do `payload` (step, from→to, etc.), sem dump JSON bruto na UI |

### Empty states

- Sem eventos (filtros vazios): “Nenhum evento registrado ainda.”
- Filtros sem resultado: “Nenhum evento com esses filtros.”

## Dados

### Query

`listAuditEvents(filters)` em `src/lib/data/audit-events.ts`:

- `FROM audit_events`
- `LEFT JOIN users` (ator)
- `LEFT JOIN measurements` (número OS / cliente)
- `WHERE` dinâmico por filtros
- `ORDER BY created_at DESC`
- `LIMIT` / `OFFSET` (paginação)

### Labels

Mapa em `src/lib/audit/action-labels.ts` (ou junto de `actions.ts`):

```ts
// ex.: "cutting.step_checked" → "Corte marcado"
```

Actions desconhecidas: mostrar o código bruto.

## Arquivos principais

| Arquivo | Papel |
|---|---|
| `app/(dashboard)/admin/auditoria/page.tsx` | Page server: auth admin, lê searchParams, carrega dados |
| `src/components/admin/audit-admin-panel.tsx` | Client/server UI: filtros + lista |
| `src/lib/data/audit-events.ts` | Query + tipos de filtro |
| `src/lib/audit/action-labels.ts` | Labels PT |
| `src/lib/auth/permissions.ts` | `ADMIN_NAV_ITEMS` + item Auditoria |
| `src/components/dashboard/administrative-nav-section.tsx` | Ícone do item |
| `src/components/dashboard/dashboard-shell.tsx` | Título da rota no shell |

## Segurança

- Page: `session.roles.includes("admin")` → senão `redirect("/unauthorized")`.
- Sem server action de escrita; só leitura.
- Não expor payload sensível além do necessário (notas longas já não vão no audit de instalação).

## Testes

- Unit: labels de action cobrem todas as keys de `AUDIT_ACTIONS`.
- Unit (opcional): builder de filtros SQL / cláusulas (se extrair helper puro).
- Sem E2E obrigatório nesta entrega.

## Fora de escopo

- Entrega C (badges nas checklists)
- Export CSV
- Acesso gerente
- Backfill de eventos antigos
- WebSockets / live refresh (reload/navegação basta)

## Entregáveis

1. Rota `/admin/auditoria` + item no menu Administrativo  
2. Feed global com filtros e paginação  
3. Drill-down por OS via query  
4. Labels em português  
5. Teste de labels  
