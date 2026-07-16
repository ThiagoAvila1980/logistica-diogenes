# Design: Trilha de auditoria operacional (`audit_events`)

**Data:** 2026-07-16  
**Status:** aprovado para implementação  
**Escopo desta entrega:** apenas gravação no banco (sem UI nova)

## Problema

Hoje as ticagens e mutações operacionais persistem sobretudo **estado atual** (booleanos em `measurements.items` JSONB e agregados em `transport_logs` / `installation_logs`). Não há trilha confiável de **quem** fez **o quê** e **quando**.

Artefatos existentes e seus limites:

| Artefato | Limite |
|---|---|
| `status_history` | Só transições de etapa; coluna `changed_by_id` existe mas nunca é preenchida |
| `work_events` | Pontuação parcial; ator frequentemente é o designado, não quem clicou; eventos são apagados no undo/revert |
| Progress JSONB | Só booleanos / designações; sem ator nem timestamp por step |

## Objetivo

Registrar, de forma **append-only e imutável**, as mutações de negócio relevantes, com:

- **WHO:** `actor_id` = usuário da sessão que executou a ação
- **WHAT:** `action` tipada + `payload` com detalhes
- **WHEN:** `created_at` com timezone
- **WHERE:** `measurement_id` / `item_id` quando aplicável; `entity_type` / `entity_id` para entidades admin

Sucesso desta entrega: após qualquer ticagem ou mutação coberta, existe uma linha em `audit_events` consultável via SQL, mesmo se a ação for desfeita depois.

## Fora de escopo (esta entrega)

- Tela de timeline / indicadores nas checklists
- Backfill de histórico anterior ao deploy
- Alterar o modelo de pontuação (`work_events` / `scoring_rules`) além de manter a separação
- Auditoria de ações de UI sem impacto de negócio (ex.: marcar notificação como lida)

## Decisões

1. **Tabela nova `audit_events`**, separada de `work_events` (scoring) e de `status_history` (máquina de estados da OS).
2. **Ator = sessão** (`session.userId`), nunca heurísticas como `findActiveCortador` ou só o designado.
3. **Undo/revert gera novo evento** (`*.step_unchecked`, `os.stage_reverted`, etc.); a app **não** faz UPDATE/DELETE em `audit_events`.
4. **Falha de audit falha a mutação** — insert na mesma transaction da action.
5. **Popular `status_history.changed_by_id`** em todos os inserts existentes, além do evento de audit correspondente.
6. **Cobertura:** operacionais + admin de negócio; sem ruído de notificações lidas.

## Alternativas consideradas

| Abordagem | Motivo de descartar / adotar |
|---|---|
| **1. `audit_events` append-only (adotada)** | Trilha completa, imutável, consultável; não mistura com scoring |
| 2. Enriquecer JSONB com `{done, by, at}` | Sobrescreve no undo; não é histórico |
| 3. Expandir `work_events` | Já é deletável e incompleto; misturaria pontuação com auditoria |

## Modelo de dados

```text
audit_events
  id              uuid PK default random
  actor_id        uuid NULL → users(id) ON DELETE SET NULL
  action          text NOT NULL
  measurement_id  uuid NULL → measurements(id) ON DELETE SET NULL
  item_id         text NULL          -- id do vão em measurements.items
  entity_type     text NULL          -- ex.: user | vehicle | lookup | scoring_rule | role_screen
  entity_id       text NULL
  payload         jsonb NOT NULL default '{}'
  created_at      timestamptz NOT NULL default now()
```

### Índices

- `idx_audit_events_measurement_created` em `(measurement_id, created_at)`
- `idx_audit_events_actor_created` em `(actor_id, created_at)`
- `idx_audit_events_action_created` em `(action, created_at)`
- `idx_audit_events_entity` em `(entity_type, entity_id)`

### Convenção de `action`

Namespace por domínio + verbo no passado / estado:

| Domínio | Exemplos |
|---|---|
| Cutting | `cutting.step_checked`, `cutting.step_unchecked`, `cutting.notes_updated`, `cutting.drawing_updated`, `cutting.items_sent` |
| Transport | `transport.step_checked`, `transport.step_unchecked`, `transport.driver_assigned`, `transport.driver_unassigned`, `transport.vehicle_assigned`, `transport.notes_updated` |
| Installation | `installation.step_checked`, `installation.step_unchecked`, `installation.vao_completed`, `installation.installer_assigned`, `installation.notes_updated`, `installation.photos_updated` |
| Field / OS | `field.measurement_saved`, `field.measurement_created`, `field.header_updated`, `field.measurement_deleted` |
| Stage / Kanban | `os.stage_changed`, `os.stage_reverted` |
| Admin | `admin.user_created`, `admin.user_updated`, `admin.user_deleted`, `admin.vehicle_*`, `admin.lookup_*`, `admin.role_access_updated`, `admin.scoring_rule_updated` |

### Payload (exemplos)

```json
// cutting.step_checked
{ "step": "corte", "done": true }

// transport.driver_assigned
{ "step": "vidros", "driverId": "...", "previousDriverId": "..." }

// os.stage_changed
{ "fromStatus": "cortes", "toStatus": "transporte_perfil", "source": "kanban_drag" }

// admin.user_updated
{ "fields": ["roles", "active"] }
```

Payload deve ser pequeno e estável; não duplicar o estado inteiro da OS.

## API interna

```ts
// src/lib/audit/record-audit-event.ts
recordAuditEvent(db, {
  actorId: string | null;
  action: string;
  measurementId?: string | null;
  itemId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void>
```

- Aceita `db` ou transaction (`AnyDb` já usado em scoring).
- Sempre chamado **dentro** da transaction da mutação.
- Não faz commit próprio.

Também: constante/mapa tipado de actions (union TypeScript ou const object) para evitar typos.

## Instrumentação (server actions)

### Operacionais (obrigatório)

| Action / fluxo | Evento(s) |
|---|---|
| `updateItemCuttingStepAction` | `cutting.step_checked` / `cutting.step_unchecked` |
| `updateCuttingNotesAction` | `cutting.notes_updated` |
| `updateItemDrawingAction` | `cutting.drawing_updated` |
| `sendItemsToCuttingAction` | `cutting.items_sent` + `status_history` com `changedById` |
| `advanceCuttingToTransportAction` / unlock automático | `os.stage_changed` + `changedById` |
| `updateItemTransportStepAction` | `transport.step_checked` / `transport.step_unchecked` |
| Atribuições motorista/veículo (vão ou bulk) | `transport.driver_*` / `transport.vehicle_*` |
| `updateItemTransportNotesAction` | `transport.notes_updated` |
| `updateItemInstallationStepAction` | `installation.step_checked` / `installation.step_unchecked` |
| `completeInstallationVaoAction` | `installation.vao_completed` |
| Atribuição instalador | `installation.installer_assigned` / `unassigned` |
| Notas/fotos instalação | `installation.notes_updated` / `installation.photos_updated` |
| `saveFieldMeasurement` / create / header / delete | `field.*` |
| `moveOSCard` | `os.stage_changed` + `changedById` |
| `revertOSPhaseForVaosAction` | `os.stage_reverted` + `changedById` |

### Admin (obrigatório nesta entrega)

| Módulo | Eventos |
|---|---|
| `user-admin-actions` | `admin.user_created` / `updated` / `deleted` |
| `vehicle-actions` | `admin.vehicle_*` |
| `lookup-admin-actions` | `admin.lookup_*` (tipo + id no entity) |
| `role-access-actions` | `admin.role_access_updated` |
| `scoring-actions` | `admin.scoring_rule_updated` |

### Relação com `status_history`

- Continua existindo para relatórios de jornada/KPI.
- Todo `insert(statusHistory)` passa a incluir `changedById: session.userId`.
- Em paralelo, grava `os.stage_changed` ou `os.stage_reverted` em `audit_events` (fonte canônica de WHO para auditoria).

### Relação com `work_events`

- Inalterado em responsabilidade (pontuação).
- Pode continuar sendo removido no undo.
- Não deve ser usado como prova de auditoria.

## Erros e consistência

1. Insert de audit e mutação na **mesma transaction**.
2. Se audit falhar → rollback da mutação.
3. Mutações operacionais exigem sessão autenticada (padrão atual `requireSession` / `requireRole`).
4. Sem backfill: linhas antigas ficam sem eventos; documentação deixa isso explícito.

## Consulta (sem UI)

Exemplos esperados pós-deploy:

```sql
-- Timeline de uma OS
SELECT created_at, actor_id, action, item_id, payload
FROM audit_events
WHERE measurement_id = $osId
ORDER BY created_at;

-- Ações de um usuário no dia
SELECT *
FROM audit_events
WHERE actor_id = $userId
  AND created_at >= $dayStart
ORDER BY created_at;
```

UI de timeline fica para entrega futura consumindo esta tabela.

## Testes

1. **Unit** `recordAuditEvent`: persiste campos; default de payload `{}`.
2. **Unit/integration** nas actions de ticagem (corte, transporte, instalação):
   - marcar step → evento `*_checked` com `actor_id` da sessão e `item_id`
   - desmarcar → novo evento `*_unchecked` (linha anterior permanece)
3. **Kanban/revert:** `status_history.changed_by_id` preenchido + evento `os.stage_*`.
4. Sem testes de UI.

## Migração

- Adicionar tabela via Drizzle schema + `db:generate` / migration SQL no fluxo existente (`src/db/migrations`).
- Deploy: rodar migrate em ambientes que usam `db:migrate` / `db:migrate:prod`.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Esquecer de instrumentar uma action | Checklist da tabela de instrumentação no plano; testes nas paths críticas |
| Volume de linhas | Só mutações de negócio; índices por OS/ator; sem log de “read” |
| Offline sync | Eventos gravados no momento do sync server-side com o usuário autenticado da sessão de sync (mesmo ator da action) |

## Entregáveis

1. Schema + migration `audit_events`
2. Helper `recordAuditEvent` + tipos de action
3. Instrumentação das actions listadas
4. Preenchimento de `status_history.changed_by_id`
5. Testes unitários/integração leves
6. Sem mudanças de UI

## Entrega futura (não implementar agora)

- Tela timeline por OS (gerente/admin)
- Badges “feito por X em …” nas checklists
- Possível export CSV do audit log
