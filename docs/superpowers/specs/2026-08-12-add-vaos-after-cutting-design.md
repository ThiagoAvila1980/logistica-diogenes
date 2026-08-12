# Adicionar vãos após plano de corte (admin)

## Problema

Enquanto a OS está em medição, é possível incluir quantos vãos forem necessários. Depois que todos os vãos vão para o plano de corte, a página de campo passa a mostrar “etapa avançada” e não há como o admin incluir vãos extras sem contornar o fluxo.

## Objetivo

1. No **card do orçamento em plano de corte** (`/production`), exibir um botão (só ícone) para **admin** adicionar mais vãos.
2. O clique abre a medição em modo explícito: `/field/[osId]?addVaos=1`.
3. Reutilizar o formulário de medição, o merge que preserva vãos já enviados e o envio parcial ao corte — sem mock de dados nem migration.

## Comportamento

### Card (`ProductionOrderCard` / `ProductionOrderIndex`)

Layout das ações no canto superior direito (da esquerda para a direita):

`[Adicionar vãos] · [Excluir]`

- **Adicionar vãos**: ícone Lucide `Plus` (sem texto); `aria-label` / `title` “Adicionar vãos”; `Link` ou navegação para `/field/[osId]?addVaos=1`; `stopPropagation` no container (igual ao excluir).
- **Excluir**: inalterado (`OrderCardDeleteAction`).
- Visível somente para **admin** (`canAddVaosAfterCutting` — mesmo critério de `canDeleteMeasurement`).
- O restante do card continua linkando para `/production/[osId]`.

### Página de campo (`/field/[osId]`)

Hoje: se `!inMedicao && !hasRemaining` → `FieldMeasurementPastStage` (admin/gerente) ou bloqueio.

Novo gate:

| Condição | Resultado |
|----------|-----------|
| `inMedicao` ou `hasRemaining` | Formulário atual (sem mudança) |
| `!inMedicao && !hasRemaining` e **admin** e `searchParams.addVaos === "1"` | Formulário em modo “adicionar vãos” |
| `!inMedicao && !hasRemaining` sem flag (ou não-admin) | Past-stage / bloqueio atual |

Modo “adicionar vãos”:

- Tipo de medição: **final** (vãos operacionais do corte).
- Itens exibidos: só os **não enviados** (`selectUnsentMeasurementLineItems`). Com todos já enviados, a lista começa **vazia**; admin usa “Adicionar vão”.
- Vãos com `sentToCutting === true` não entram no formulário e não são sobrescritos no save (`mergePreservingSentToCutting` já existente).
- Após salvar novos vãos, o fluxo de **enviar ao corte** já existente (`sendItemsToCuttingAction` com `alreadyPastMedicao`) marca os novos sem regredir a etapa.
- Banner/texto curto opcional no formulário: “Adicionando vãos a uma OS já em plano de corte.”

### Past-stage

Sem botão obrigatório nesta spec (entrada principal é o card de produção). Opcional futuro: link “Adicionar vãos” na `FieldMeasurementPastStage` só para admin.

## Permissões

- UI e bypass da past-stage via query: **somente admin**.
- Helper `canAddVaosAfterCutting(roles)` em `permissions.ts` — mesmo predicado que `canDeleteMeasurement` (só admin), para clareza na UI.
- Gerente, cortador, medidor e demais: sem botão e sem abrir o formulário só com a query.
- Não há nova action dedicada: `saveFieldMeasurement` e `sendItemsToCuttingAction` já cobrem persistência e envio.

## Dados

Nenhuma migration. Reusa:

- `measurements.items` (JSON) com `sentToCutting`
- `mergePreservingSentToCutting`
- `hasRemainingUnsentMeasurementItems` / `selectUnsentMeasurementLineItems`
- `sendItemsToCuttingAction` (ramo `alreadyPastMedicao`)

## Componentes / arquivos (orientação)

| Área | Mudança |
|------|---------|
| `permissions.ts` (+ teste) | `canAddVaosAfterCutting` |
| `production/page.tsx` + `ProductionOrderIndex` | passar `canAddVaos` |
| Novo `order-card-add-vaos-action.tsx` (ou slot no index) | ícone Plus → link com query |
| `ProductionOrderCard` | já aceita `actions` — compor Plus + Delete |
| `field/[osId]/page.tsx` | ler `searchParams.addVaos`; gate admin |
| `FieldMeasurementForm` (opcional) | banner quando modo add-vaos |

## Erros / edge cases

- Query `addVaos=1` sem ser admin → ignora flag (past-stage / bloqueio).
- OS inexistente → `notFound` atual.
- Admin salva sem novos itens → comportamento atual do save (validação do formulário).
- Admin adiciona e não envia ao corte → OS permanece na etapa atual; vãos ficam como “remanescentes” e `/field/[osId]` volta a abrir normalmente por `hasRemaining` (sem precisar da query).
- Offline: fora de escopo desta spec (mesmo caminho online do formulário).

## Testes

- Unit: `canAddVaosAfterCutting` (admin vs outros).
- Unit/página (se houver padrão): gate `addVaos` só libera com admin.
- Não exigir E2E novo; smoke manual: admin no card → form vazio → add vão → save → enviar ao corte → vão aparece em produção.

## Fora de escopo

- Permitir gerente.
- Editar vãos já enviados ao corte.
- Diálogo de quantidade no card.
- Botão no kanban.
- Seed/mock de dados (BD já possui registros reais).
