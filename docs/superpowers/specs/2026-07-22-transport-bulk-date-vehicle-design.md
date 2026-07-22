# Transporte em massa: data e veículo para todos os vãos

## Problema

Em **Transporte por vão** já é possível escolher um motorista para todas as etapas de todos os vãos. Falta o mesmo atalho para **data** e **veículo**, obrigando o admin a repetir a escolha vão a vão / etapa a etapa.

## Regra

Para quem já pode designar em massa (hoje: admin, via `canAssignDriver` / `canAssignVehicle`):

1. **Data para todos os vãos** — ao escolher uma data, grava a mesma `scheduledDate` em todas as etapas (`perfilEstrutural`, `perfilTotal`, `acessorios`, `vidros`) de todos os vãos. Campo vazio remove a data de todas.
2. **Veículo para todos os vãos** — ao escolher um veículo, grava o mesmo `vehicleId` em todas as etapas de todos os vãos. Campo vazio remove o veículo de todas.
3. Cada controle altera **somente o próprio campo**, preservando motorista / data / veículo dos outros (mesmo padrão de `applyDriverToAllVaoSteps`).
4. Aplicação é imediata ao mudar o controle (sem botão “Aplicar”), igual ao select de motorista.

## Superfícies

| Superfície | Comportamento |
|------------|---------------|
| `TransportChecklist` (header) | Além de `TransportBulkDriverSelect`, exibe select/input de data e de veículo em massa |
| Actions server | Novas actions espelhando `assignDriverToAllVaosAction` (permissão admin, gates de transporte, audit) |
| Vão individual | Inalterado — continua editável por etapa |

## Mudanças de código

- Helpers puros (espelho de `apply-driver-to-all-vaos.ts`):
  - `applyScheduledDateToAllVaoSteps(items, scheduledDate)`
  - `applyVehicleToAllVaoSteps(items, vehicleId)`
- Actions em `transport-actions.ts`:
  - `assignScheduledDateToAllVaosAction`
  - `assignVehicleToAllVaosAction`
  - Validar veículo ativo quando `vehicleId` preenchido; validar data quando preenchida
  - Audit com `scope: "all_vaos"` (reutilizar actions de assign/unassign de data/veículo já existentes, se houver; senão payload explícito)
- UI:
  - `TransportBulkDateSelect` e `TransportBulkVehicleSelect` (ou um wrapper `TransportBulkAssignment` com três controles independentes — preferência: componentes separados no estilo do motorista)
  - Montados no `CardHeader` de `TransportChecklist` junto ao bulk de motorista
- Checklist: passar `vehicles` para o bulk de veículo

## Testes

- Helpers: aplica data/veículo em todas as etapas de todos os vãos
- Helpers: preserva os outros campos do `stepAssignments`
- Helpers: valor `null` limpa só o campo alvo
- (Opcional leve) smoke do wiring UI não é obrigatório se o padrão do motorista já cobre

## Fora de escopo

- Alterar quem pode designar (continua admin)
- Mudar o fluxo de atribuição por vão/etapa individual
- Bulk parcial (só etapas vazias) — descartado; sempre sobrescreve
- Unificar motorista+data+veículo num único formulário com botão Aplicar
