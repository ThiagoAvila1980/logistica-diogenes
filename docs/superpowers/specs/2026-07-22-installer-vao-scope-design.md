# Escopo do instalador por vão

## Problema

O instalador ainda pode ver OS via fallback de responsável geral (`assignedUserId`) quando não há designação por vão, e pode ver cards em transporte. A regra desejada é estrita: só OS com vãos no nome dele, e dentro da OS só esses vãos.

## Regra

Para papel `instalador` (sem `admin`/`gerente`):

1. **OS visível** apenas se existir ao menos um vão com `installationProgress.installerId === userId`.
2. **Dentro da OS**, só esses vãos aparecem no checklist / cards de concluídos.
3. **Sem fallback** para `assignedUserId` da OS.
4. **Listagem `/installation`**: somente status `instalacao_*` (não transporte em paralelo).
5. **Admin/gerente**: inalterados (veem todas as OS e todos os vãos).

## Superfícies

| Superfície | Comportamento |
|------------|---------------|
| `/installation` | Lista só OS em instalação com vão designado a ele e trabalho pendente nos vãos dele |
| `/installation/[osId]` | Sem vão dele → `notFound`; com vão → checklist filtrado |
| `/concluded` | Só OS/vãos com `installerId` dele (já concluídos no vão, como hoje) |
| `canAccessOrder` | Instalação: exige `installerIds` contendo o userId |

## Mudanças de código

- `isInstallerResponsibleForOrder`: reduzir a `installerIds.includes(userId)`.
- `isInstallationIndexCandidate`: instalador não inclui status de transporte.
- Página de detalhe de instalação: filtro só por `installerId` do vão (remover ramo `assignedUserId`).
- `filterConcludedOrdersForInstaller`: remover ramo sem designação por vão / `assignedUserId`.
- Ajustar helpers/listagens que ainda usam o fallback legado.

## Testes

Atualizar/adicionar casos em:

- `order-access` — bloqueia instalação só com `assignedUserId`, permite com vão designado
- `installation-installer-access` — responsabilidade estrita por vão
- `filter-orders` — instalador fora de transporte
- `concluded-orders` — sem fallback; só vãos dele

## Fora de escopo

- Kanban (instalador não usa)
- Mudança de quem pode designar instalador no vão (continua admin/gerente)
- Filtrar fotos gerais da OS por vão
