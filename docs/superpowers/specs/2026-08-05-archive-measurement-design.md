# Arquivar medição (lista de campo)

## Problema

O botão de excluir fica fora do card da medição. Falta uma ação de arquivar orçamentos/medições para consulta futura, sem apagar dados.

## Objetivo

1. Mover o botão **Excluir** para dentro do card, no canto superior direito.
2. À esquerda do excluir, adicionar ícone **Arquivar** com diálogo de confirmação.
3. Persistência via campo no banco; arquivadas somem da lista principal e ficam acessíveis em filtro **Arquivadas**.

## Comportamento

### Card (`FieldOrderCard`)

Layout das ações no canto superior direito (da esquerda para a direita):

`[PDF] · [Arquivar] · [Excluir]`

- **PDF**: menu existente (`PrintMeasurementMenu`) inalterado.
- **Arquivar**: ícone Lucide `Archive`; abre confirmação; visível para quem pode arquivar.
- **Excluir**: mesmo fluxo atual (`DeleteMeasurementDialog`); deixa de ficar fora do card.

O wrapper externo `FieldOrderCardWithDelete` passa a compor as ações **dentro** do card (via props/slots), sem coluna lateral.

### Confirmação de arquivamento

Diálogo no estilo do excluir:

- Título: “Arquivar medição?”
- Texto: explica que a OS sai da lista ativa e permanece disponível em Arquivadas; dados e arquivos não são apagados.
- Mostra cliente + número da OS.
- Botões: Cancelar / Arquivar.

Após sucesso: fecha o diálogo, `router.refresh()`, item some da lista Ativas.

### Lista `/field`

- Toggle/abas: **Ativas** (padrão) | **Arquivadas**.
- Ativas: `archived_at IS NULL` + filtro atual de etapa `medicao*`.
- Arquivadas: `archived_at IS NOT NULL` + mesmo filtro de etapa `medicao*`.
- Contagem do `PageHeading` reflete o conjunto visível no filtro ativo.
- Na aba Arquivadas: botão Arquivar oculto (já arquivada); Excluir permanece se o usuário tiver permissão.

### Permissões

Alinhado ao excluir: apenas **admin** (`canDeleteMeasurement` / mesma checagem na action).

Helper opcional `canArchiveMeasurement` — mesmo critério do delete — para clareza na UI.

## Dados

Tabela `measurements`:

| Coluna | Tipo | Default | Significado |
|--------|------|---------|-------------|
| `archived_at` | `timestamptz` nullable | `NULL` | `NULL` = ativa; timestamp = arquivada |

Índice: `idx_meas_archived_at` em `archived_at` (ou parcial `WHERE archived_at IS NOT NULL`).

Migration Drizzle gerada (`db:generate`) e aplicada em dev (`db:migrate`).

`OrderListItem` ganha `archivedAt: Date | null`.

## Backend

### Action `archiveMeasurement(osId)`

- Role: admin (igual delete).
- Valida UUID e existência.
- Se já arquivada: sucesso idempotente ou mensagem clara (“Já arquivada”).
- `UPDATE measurements SET archived_at = now(), updated_at = now() WHERE id = ? AND archived_at IS NULL`.
- Audit: `FIELD_MEASUREMENT_ARCHIVED` (`field.measurement_archived`).
- `revalidateOSRoutes(osId)`.
- Não remove arquivos do storage.

### Listagem

- `listServiceOrdersDb` / mapeamento incluem `archivedAt`.
- Página `/field` (ou query helper) separa ativos vs arquivados por `archivedAt`.
- Offline cache: listagem ativa continua sem arquivadas (hidratação usa o mesmo conjunto Ativas).

## Fora de escopo

- Desarquivar / restaurar.
- Tela dedicada além do filtro na lista de medições.
- Arquivamento automático ou por tipo (`orcamento` vs `final`) — qualquer medição em `/field` pode ser arquivada.
- Alterar comportamento de outras listas (produção, logística, etc.) nesta entrega: outras listagens podem continuar mostrando a OS até regra própria; se `listServiceOrders` for compartilhado, filtrar arquivadas só em `/field` (ou filtrar globalmente ativas por padrão e documentar).

**Decisão de listagem global:** por padrão, `listServiceOrders` / `listServiceOrdersDb` **excluem** arquivadas (`archived_at IS NULL`), exceto quando a chamada pedir explicitamente arquivadas (ex.: flag `includeArchived: 'only' | 'none' | 'all'`). Assim produção/logística não listam itens arquivados sem querer.

## Testes

- Mapping / filtro de `archivedAt`.
- Action: admin arquiva; não-admin rejeitado; idempotência.
- UI opcional: presença dos botões no card (se houver testes de componente).

## Superfícies tocadas

| Arquivo / área | Mudança |
|----------------|---------|
| `src/db/schema.ts` + migration | coluna `archived_at` |
| `src/lib/data/types.ts`, `db-repository.ts` | campo + filtro |
| `src/actions/field-actions.ts` | `archiveMeasurement` |
| `src/lib/audit/actions.ts` + labels | novo audit action |
| `src/components/field/*` | card, dialog, índice com abas |
| `app/(dashboard)/field/page.tsx` | passar dados / permissão |

## Critérios de aceite

1. Excluir e Arquivar ficam dentro do card, canto superior direito; Arquivar à esquerda do Excluir.
2. Arquivar exige confirmação e persiste `archived_at`.
3. Item some da aba Ativas e aparece em Arquivadas.
4. Dados e arquivos permanecem; excluir continua apagando de fato.
5. Migration aplicável no banco de desenvolvimento.
