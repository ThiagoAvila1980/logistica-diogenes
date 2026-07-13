# Modo Offline Completo — Auditoria e Plano de Arquitetura

> Documento de planejamento. Nenhuma implementação foi feita a partir dele ainda.
> Data da auditoria: 2026-07-03.

---

## 1. Sumário executivo

O projeto **já tem uma fundação offline real, mas restrita à tela de medição** (`/field`):
Service Worker via Serwist, banco local Dexie/IndexedDB, motor de sync com fila de
medições e fotos, monitor de conectividade e UI de status. Essa fundação, porém, está
**incompleta até para a medição** (o cache de leitura é escrito mas nunca lido; o
formulário não reidrata pendências locais) e **inexistente para os demais módulos**
(corte, transporte, instalação, kanban, concluídas, admin, relatórios).

O plano abaixo evolui o padrão existente para uma arquitetura **local-first** nos
módulos operacionais: cache de leitura normalizado no IndexedDB + **outbox único de
mutações** + protocolo de sync idempotente via rotas REST + resolução de conflito por
tipo de operação. Módulos administrativos e relatórios ficam online-only (decisão de
escopo justificada na §3).

---

## 2. Auditoria do estado atual

### 2.1 O que já existe (inventário)

| Peça | Arquivo | Estado |
| --- | --- | --- |
| Service Worker (Serwist) | `src/sw.ts` → `public/sw.js` via `@serwist/next` (`next.config.ts`) | Funcional. Precache do build + `defaultCache` (NetworkFirst para páginas/RSC e API GET; SWR/CacheFirst para estáticos). Desabilitado em dev. |
| Registro do SW | `src/components/offline/sw-register.tsx` (montado em `app/(dashboard)/layout.tsx`) | Só em produção. |
| Manifest PWA | `public/manifest.json` | **Quebrado**: referencia `icon-192.png`, `icon-512.png`, `favicon-*.png` que não existem em `public/`. |
| Banco local | `src/lib/offline/db.ts` — Dexie `FluxoDiogenesOffline` v1 | Stores: `pendingMeasurements`, `pendingUploads`, `cachedMeasurements`, `cachedLookups`, `syncLog`. |
| Motor de sync | `src/lib/offline/sync-engine.ts` | Save local (fotos comprimidas) + replay via server actions + auto-sync na reconexão. |
| Monitor de rede | `src/lib/offline/network-monitor.ts` + `/api/ping` | Ping HEAD a cada 30s; eventos online/offline confirmados com ping real. |
| Compressão de fotos | `src/lib/offline/photo-compress.ts` | 1920px máx, JPEG 0.85, via canvas. |
| Hooks | `use-network-status`, `use-sync-status`, `use-offline-measurement` | Usados no form de medição e na SyncStatusBar. |
| UI | `sync-status-bar` (em `/field`), `offline-indicator` (mobile-header), `pending-badge` (**nunca montado**), `pwa-install-prompt`, `field-cache-hydrator` (em `/field`) | Parcial. |
| Servidor | `measurements.clientUpdatedAt` / `measurements.deviceId` (colunas) | Gravadas em `saveFieldMeasurement`, **nunca comparadas**. |

### 2.2 O que funciona hoje (produção)

- App shell e estáticos precacheados; páginas já visitadas podem abrir offline
  (NetworkFirst com fallback ao cache de runtime — melhor esforço, não garantido).
- Na tela de medição (`/field/[osId]`) **já aberta**: salvar medição offline grava no
  IndexedDB (com fotos comprimidas) e sincroniza ao reconectar, com barra de status,
  contagem de pendências e botão "Enviar agora" na lista `/field`.

### 2.3 Lacunas e defeitos encontrados

**Defeitos (corrigíveis de imediato — Fase 0):**

1. **PWA não instalável**: ícones do manifest não existem (`public/` tem só logotipo,
   logo 01, manifest e sw.js). `beforeinstallprompt` nunca dispara; o
   `PwaInstallPrompt` cai sempre no guia manual.
2. **Cache de leitura órfão**: `FieldCacheHydrator` grava `cachedMeasurements`/
   `cachedLookups`, mas `getCachedMeasurements()`/`getCachedLookups()` não são
   chamados por nenhum componente. Offline "frio" (navegação nova), a lista `/field`
   não renderiza nada do cache.
3. **Formulário não reidrata pendências**: se o usuário salva offline, sai e volta em
   `/field/[osId]`, o form mostra o rascunho **antigo do servidor** — a edição local
   pendente fica invisível (parece que o dado sumiu). `getPendingMeasurements()`
   existe e não é usado; fotos pendentes (blobs no IDB) também não geram preview.
4. **Backoff nunca usado**: `BACKOFF_DELAYS_MS`/`getBackoffDelay` estão definidos mas
   nenhum retry agendado existe — retry só acontece em evento de reconexão ou clique
   manual.
5. **`registerAutoSync()` só roda se o form de medição for montado**
   (`field-measurement-form.tsx:197`) — pendências não sincronizam sozinhas se o
   usuário reabrir o app direto no dashboard.
6. **`PendingBadge` morto**: componente pronto, nunca montado (o card da OS não
   indica "esta OS tem edição local pendente").
7. **Sem checagem de conflito no servidor**: `saveFieldMeasurement` faz UPDATE cego.
   Dois aparelhos editando a mesma OS offline → o último sync sobrescreve o outro em
   silêncio.
8. Código morto no sync-engine (agrupamento `byItem` não usado, `void ids`); falha de
   uma foto derruba o sync da medição inteira (sem retry granular por foto).
9. `public/sw.js` é artefato de build versionado no git (ruído em todo build).

**Lacunas estruturais (exigem arquitetura — Fases 1+):**

10. **Nenhum outro módulo tem offline**: corte (checkboxes por item), transporte
    (steps por vão, notas, atribuições), instalação (steps, fotos, diário), kanban
    (mover cards), concluídas, notificações — leitura 100% RSC, escrita 100% server
    action sem fila.
11. **Sem página de fallback offline** (`fallbacks` do Serwist não configurado):
    navegação fria offline para rota não cacheada → erro do navegador.
12. **Mídia**: fotos exibidas via signed URLs do Supabase (expiram → a chave de cache
    do SW muda a cada assinatura; cache de runtime de imagem é inútil a médio prazo).
    Sem prefetch das fotos das OS atribuídas.
13. **Auth/multiusuário**: IndexedDB é por origem, não por usuário — troca de login no
    mesmo aparelho vê/enfileira dados do usuário anterior. Sync não trata 401
    (sessão expirada com pendências na fila).
14. **PDF**: geração 100% servidor (`pdf-lib` + `sharp`) — indisponível offline.
15. **Sem tela de diagnóstico**: fila, erros, uso de storage e dead-letter invisíveis
    para o usuário e para suporte.
16. **Storage**: sem `navigator.storage.persist()`, sem monitor de quota; blobs de
    fotos pendentes crescem sem limite.

---

## 3. O que "completo" significa na prática (escopo proposto)

Offline **total** (incluindo admin, relatórios agregados e geração de PDF) tem custo
alto e valor baixo — essas telas são usadas no escritório, com rede. A proposta de
escopo, alinhada ao uso em campo:

| Capacidade | Offline? |
| --- | --- |
| Medição (ler, criar itens, editar, fotos, desenhos, salvar) | ✅ completo |
| Corte (ler, marcar etapas, notas, enviar p/ transporte) | ✅ completo |
| Transporte (ler vãos do motorista, marcar steps, notas) | ✅ completo |
| Transporte — atribuições admin (veículo/motorista/instalador/data) | ✅ em fila |
| Instalação (ler, steps, fotos de serviço, diário) | ✅ completo |
| Kanban/dashboard | ✅ leitura + mover card em fila |
| Concluídas | ✅ leitura |
| Notificações | ✅ leitura do cache; marcar lida em fila |
| Visualizar fotos já sincronizadas | ✅ via cache/prefetch (melhor esforço) |
| PDF (completo/por vão) | ⚠️ online-only na v1; client-side é fase opcional |
| Login/logout, admin (usuários, veículos, lookups, permissões), relatórios | ❌ online-only |

Limites físicos que o plano respeita:

- **iOS/Safari**: sem Background Sync API; storage pode ser descartado após ~7 dias
  sem uso do Safari (PWA instalado é protegido — instalar vira requisito de campo).
- **Deploy × app shell cacheado**: IDs de server actions rotacionam a cada build.
  Um app shell antigo (cacheado pelo SW) que tente fazer replay via server action
  pós-deploy quebra. Por isso o **push de sync deve ser rota REST** com contrato
  estável (zod), não server action.
- **Sessão expirada offline** (TTL 7 dias): a fila deve sobreviver e aguardar novo
  login, nunca descartar.

---

## 4. Arquitetura alvo

```
┌──────────────────────────── Navegador (PWA instalado) ────────────────────────────┐
│                                                                                    │
│  UI (client components locais-first nos módulos operacionais)                     │
│    │ lê sempre                                  │ escreve sempre                  │
│    ▼                                            ▼                                 │
│  Dexie v2 (por usuário: FluxoDiogenesOffline_{userId})                            │
│    • orders (normalizado, escopo do usuário)    • outbox (fila única de mutações) │
│    • drafts de medição / estado corte-transporte-instalação                       │
│    • lookups, users/vehicles leves, notifications, session snapshot               │
│    • mediaBlobs (fotos pendentes) + syncLog + deadLetter                          │
│    ▲                                            │                                 │
│    │ pull delta                                 │ push idempotente (FIFO por OS)  │
│  Sync Engine v2 (reconexão, intervalo, manual, visibilitychange; backoff real)    │
│    │                                            │                                 │
├────┼────────────────────────────────────────────┼─────────────────────────────────┤
│    ▼                                            ▼            Servidor (Next)      │
│  GET /api/sync/pull?since=cursor            POST /api/sync/push                   │
│    → mudanças por updatedAt/version           → zod + mutationId (idempotência)   │
│                                               → política de conflito por tipo     │
│                                               → tabela sync_mutations (dedupe)    │
│                                                                                    │
│  Serwist SW: precache do shell + fallback offline + cache de mídia via            │
│  /api/media/* (chave estável, sem query de assinatura)                            │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Decisões-chave (e porquês)

1. **Outbox único** (substitui `pendingMeasurements`/`pendingUploads` por uma fila
   genérica): `{ mutationId (uuid), kind, osId, payload, baseVersion,
   clientUpdatedAt, deviceId, status, retryCount, lastError, nextRetryAt }`.
   - Replay **FIFO por osId** (preserva causalidade: salvar medição antes de enviar
     p/ corte), paralelo entre OSs diferentes.
   - Fotos referenciam blobs em `mediaBlobs` e sincronizam **individualmente**
     (falha de 1 foto não derruba a mutação; marca por foto).
2. **Push via REST, não server action** — imune à rotação de IDs de action entre
   deploys; contrato zod versionado (`schemaVersion` no payload); mesma autenticação
   por cookie de sessão já usada nas rotas `/api/measurements/*`.
3. **Idempotência**: `mutationId` UUID gerado no cliente; servidor guarda em
   `sync_mutations (mutation_id pk, os_id, kind, applied_at, result)` e responde o
   resultado gravado se receber replay duplicado.
4. **Versionamento e conflito**: coluna `version int` em `measurements`
   (incrementada em toda escrita). Cliente envia `baseVersion` lido no último pull.
   Política por tipo de mutação:

   | Kind | Política |
   | --- | --- |
   | `measurement.save` | Merge **por item** (id/vaoNumber): itens novos entram; item editado nos dois lados → LWW por `clientUpdatedAt` + registro em `conflict_log` + notificação ao gerente. Notas: LWW. |
   | `cutting.step` / `transport.step` / `installation.step` | Operação por item+etapa com timestamp — naturalmente mesclável (aplica o estado mais recente daquela etapa; não sobrescreve as demais). |
   | `*.notes` | LWW por campo com aviso quando `baseVersion` divergir. |
   | `status.advance` (kanban, enviar p/ corte/transporte/instalação) | Validado pela `status-machine` no servidor; transição impossível → **dead-letter** com mensagem clara (nunca aplica errado). |
   | `assign.*` (veículo/motorista/instalador/data — admin) | LWW; validação de papel no servidor (já existe). |

5. **Pull delta**: `GET /api/sync/pull?since=<cursor>` retorna OSs alteradas no
   escopo do usuário (mesmos filtros por papel já usados nas telas — ex.: motorista
   só vê vãos onde é `driverId`), lookups (com hash/etag) e o cursor novo.
   Primeira carga = pull completo. O pull roda no login, na reconexão, em
   `visibilitychange` e a cada N minutos com o app aberto.
6. **Leitura local-first nas telas operacionais**: os pages RSC viram "shell +
   seed" — passam o snapshot inicial ao client component, que grava no Dexie e a
   partir daí **renderiza sempre do Dexie** (via `useLiveQuery` do
   `dexie-react-hooks`). Offline frio funciona porque o shell está precacheado e o
   dado vem do IDB, não do RSC. Isso elimina a classe de bug nº 2/3 (dois caminhos
   de render divergentes).
7. **Mídia**: rota `GET /api/media/[...key]` (mesma origem, sessão obrigatória) que
   resolve a chave no storage e faz stream — o SW cacheia com **CacheFirst +
   expiração** e chave estável (sem token de assinatura). Prefetch best-effort das
   fotos das OSs do usuário quando online. Fotos pendentes renderizam de
   `URL.createObjectURL(blob)` do IDB.
8. **Multiusuário**: nome do banco Dexie inclui `userId`; no login com usuário
   diferente, o banco do anterior é mantido (pendências não se perdem) mas
   inacessível na UI; logout com outbox não vazio exige confirmação explícita
   ("Você tem N alterações não enviadas — sincronize antes de sair").
   Snapshot da sessão (userId, name, roles, exp) vai para o IDB no login para gate
   de UI offline.
9. **Sessão expirada durante sync**: resposta 401 pausa a fila (estado
   `aguardando-login`), banner global; a fila retoma após novo login do **mesmo**
   usuário.

---

## 5. Modelo de dados local (Dexie v2)

```ts
// FluxoDiogenesOffline_{userId} — v2
orders:        "id, status, updatedAt, syncedAt"        // OrderListItem + detalhe enxuto
drafts:        "[osId+type], updatedAt"                 // FieldMeasurementDraft por tipo
stageState:    "[osId+module], updatedAt"               // corte/transporte/instalação por vão
lookups:       "key"                                    // ambientes, cores, vidros, envidraçamentos, veículos, instaladores
outbox:        "mutationId, [osId+seq], kind, status, nextRetryAt"
mediaBlobs:    "id, mutationId, osId, itemId, status"   // blobs de fotos/desenhos pendentes
mediaIndex:    "url, osId, cachedAt"                    // controle do prefetch de mídia
notifications: "id, readAt"
meta:          "key"                                    // cursor do pull, sessão, schemaVersion, quota
syncLog:       "++id, osId, result, syncedAt"
deadLetter:    "mutationId, osId, failedAt"
```

Migração: v1→v2 converte `pendingMeasurements`/`pendingUploads` existentes em
entradas de `outbox`/`mediaBlobs` (não descartar pendências de usuários em campo).

---

## 6. Matriz módulo × fase

| Módulo | Leitura offline | Escrita offline | Fase |
| --- | --- | --- | --- |
| `/field` lista + detalhe | Dexie (local-first) | outbox (já existe, endurecer) | 1–2 |
| `/production` (corte) | Dexie | steps, notas, enviar p/ transporte | 3 |
| `/logistics` (transporte) | Dexie (escopo motorista) | steps, notas, atribuições | 3 |
| `/installation` | Dexie | steps, fotos, diário | 4 |
| `/dashboard` (kanban) | Dexie | mover card (fila) | 5 |
| `/concluded` | Dexie | — | 5 |
| Notificações | Dexie | marcar lida (fila) | 5 |
| PDF | — (online) | — | 6 (opcional) |
| `/admin`, `/reports`, login | — (online-only, tela "disponível apenas online") | — | — |

---

## 7. Plano de fases

### Fase 0 — Fundação e correções (tamanho S/M, sem migração de arquitetura)
Entregáveis:
- Gerar ícones PWA reais (192/512 maskable + favicons) e corrigir `manifest.json`;
  validar instalabilidade (Lighthouse ≥ instalável).
- Página de fallback offline precacheada (`fallbacks` do Serwist) com branding e
  botão "tentar novamente".
- `navigator.storage.persist()` no primeiro save offline + leitura de
  `storage.estimate()` exposta em tela de diagnóstico simples.
- Mover `registerAutoSync()` para o layout do dashboard (roda sempre) e ligar o
  backoff real (`nextRetryAt` + timer) que já está tabelado.
- Montar `PendingBadge` nos cards de `/field`; retry granular por foto no sync.
- Adicionar `public/sw.js` ao `.gitignore` (artefato de build).
- Documentar como testar offline localmente (`npm run build && npm start` — SW é
  desabilitado em dev).

Critério de aceite: instalar o PWA no Android/iOS; derrubar a rede; abrir o app
instalado e ver a página de fallback (não o dinossauro do Chrome); medição pendente
sincroniza sozinha ao reconectar mesmo sem abrir o form.

### Fase 1 — Medição verdadeiramente offline (M)
- Lista `/field` renderiza do Dexie quando offline (consumir o cache que o hydrator
  já grava) e o detalhe `/field/[osId]` também (cachear os drafts no hydrator).
- Form reidrata pendência local (se `outbox` tem `measurement.save` da OS, ela vence
  o draft do servidor na inicialização, com aviso "edição local não enviada").
- Preview de fotos pendentes a partir dos blobs do IDB.
- Conflito mínimo no servidor: comparar `clientUpdatedAt` com `updatedAt` atual em
  `saveFieldMeasurement`; se o servidor for mais novo, aplicar merge por item e
  registrar em log (preparação para a política completa da Fase 2).

Critério de aceite: modo avião → abrir app instalado frio → listar OSs → abrir OS →
editar → salvar → fechar app → reabrir → edição visível → reconectar → sync
automático sem perda, com fotos.

### Fase 2 — Infra de sync genérica (L — é o coração do projeto)
- Dexie v2 (schema da §5) com migração v1→v2 e namespacing por usuário.
- `GET /api/sync/pull` (delta por cursor, escopo por papel) e
  `POST /api/sync/push` (zod, `mutationId`, `baseVersion`, políticas §4.1-4).
- Tabelas server: `sync_mutations`, `conflict_log`; coluna `version` em
  `measurements` (migration SQL direto no banco, conforme prática do projeto).
- Sync Engine v2: FIFO por OS, backoff, dead-letter, pausa em 401.
- **Central de Sincronização** (tela): pendências por OS, erros com ação
  (reenviar/descartar), uso de storage, último pull, log.
- Indicador offline/pendências global no layout (hoje só em `/field`/mobile-header).

### Fase 3 — Corte e Transporte offline (M/L cada)
- Converter `cutting-detail-view` e tela de transporte para leitura Dexie +
  mutações `cutting.step|notes|advance`, `transport.step|notes`, `assign.*`.
- Respeitar escopos existentes (motorista só vê seus vãos — padrão já estabelecido).

### Fase 4 — Instalação + mídia (L)
- Steps de instalação, fotos de serviço e diário via outbox (reusar pipeline de
  compressão + `mediaBlobs`).
- Rota `/api/media/*` + cache CacheFirst no SW + prefetch das OSs do usuário.

### Fase 5 — Kanban, concluídas, notificações (M)
- Kanban lê do Dexie; `moveOSCard` vira mutação em fila validada no replay.
- `/concluded` leitura offline; notificações com cache + fila de "marcar lida".

### Fase 6 — Opcionais
- PDF client-side com `pdf-lib` no browser (sem `sharp`; redimensionar via canvas,
  reutilizando o layout de `measurement-pdf.ts` tornado isomórfico).
- Background Sync API (Chrome/Android) para sync com app fechado.
- Relatórios read-only do último snapshot.

---

## 8. Plano de testes

- **Unidade (vitest + fake-indexeddb)**: políticas de merge por kind; ordem FIFO por
  OS; idempotência (replay do mesmo `mutationId`); migração Dexie v1→v2; backoff.
- **Integração**: `/api/sync/push` com `baseVersion` divergente (cada política);
  401 no meio da fila; payload de build antigo (`schemaVersion` anterior).
- **E2E manual roteirizado** (build de produção local): matriz de cenários —
  offline frio/quente × módulo × reconexão no meio do envio × troca de usuário ×
  dois dispositivos editando a mesma OS.
- **Dispositivos-alvo**: Android Chrome (motoristas/instaladores) e iOS Safari
  instalado (limitações §3).

---

## 9. Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Eviction de storage no iOS | Exigir instalação do PWA no onboarding de campo; `storage.persist()`; pendências enviadas o quanto antes (auto-sync agressivo). |
| Deploy invalida shell cacheado durante replay | Push via REST estável + `schemaVersion`; pull retorna versão mínima de app → banner "atualize o app" com reload. |
| Conflito silencioso entre dois aparelhos | `version`/`baseVersion` + merge por item + `conflict_log` + notificação ao gerente. |
| Fila envenenada (mutação que sempre falha) | Dead-letter após N tentativas com UI de descarte/reenvio; nunca bloqueia o resto da fila de outras OSs. |
| Quota estourada (fotos) | Compressão já existente + limite de fotos pendentes com aviso + monitor de quota na Central de Sync. |
| Vazamento entre usuários no mesmo aparelho | Banco por userId + bloqueio de logout com pendências. |
| Signed URLs expiradas no cache | Rota `/api/media/*` com chave estável (sem assinatura na URL cacheada). |

---

## 10. Decisões em aberto (para confirmar antes da Fase 2)

1. Escopo online-only de admin/relatórios está aprovado?
2. PDF offline é requisito real de campo ou aceitável online-only?
3. Retenção do cache local: quantos dias de OSs concluídas manter no aparelho?
4. Dois papéis no mesmo aparelho (ex.: instalador que também mede) — frequente?
   (Impacta prioridade do namespacing por usuário.)
