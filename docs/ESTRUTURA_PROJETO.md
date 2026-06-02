# Estrutura Next.js — Logística Diógenes

Organização por **módulo de negócio** + **camadas compartilhadas**, alinhada ao pipeline de OS.

```
fluxo_diogenes/
├── app/                              # App Router (rotas finas)
│   ├── (auth)/
│   │   ├── login/page.tsx              # Seleção de usuário (demo/DB)
│   │   └── layout.tsx
│   ├── (dashboard)/                  # Gestão interna (gerente/admin)
│   │   ├── layout.tsx                # sidebar + auth guard
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # kanban + KPIs resumidos
│   │   │   └── [osId]/page.tsx       # detalhe OS + StatusWizard
│   │   ├── admin/                    # usuários, veículos (sem cadastro de clientes)
│   │   └── field/                    # medições (cliente/telefone no registro da medição)
│   ├── field/[osId]/                 # Medição mobile-first (MVP)
│   │   └── page.tsx
│   ├── quote/[osId]/                 # Orçamento + link público
│   │   └── page.tsx
│   ├── production/[osId]/            # Plano de corte + checklist
│   │   └── page.tsx
│   ├── logistics/[osId]/             # Transporte
│   │   └── page.tsx
│   ├── installation/[osId]/          # Wizard instalação + biometria
│   │   └── page.tsx
│   ├── q/[token]/                    # Aprovação pública do orçamento
│   │   └── page.tsx
│   └── api/
│       ├── upload/route.ts           # Vercel Blob / Cloudinary
│       └── webhooks/
│           └── whatsapp/route.ts
│
├── src/
│   ├── actions/                      # Server Actions por domínio
│   │   ├── service-order.ts          # transição de status
│   │   ├── measurements.ts
│   │   ├── quotes.ts
│   │   ├── cutting.ts
│   │   ├── transport.ts
│   │   └── installation.ts
│   ├── components/
│   │   ├── ui/                       # shadcn
│   │   ├── workflow/
│   │   │   └── status-wizard.tsx
│   │   ├── field/                    # formulários de medição
│   │   ├── production/
│   │   └── installation/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── env.ts                  # DATABASE_URL + DIRECT_URL (Supabase)
│   │   └── index.ts
│   ├── lib/
│   │   ├── workflow/
│   │   │   ├── status-machine.ts     # grafo + guards (testável)
│   │   │   └── schemas.ts            # zod para jsonb
│   │   ├── auth/
│   │   └── offline/                  # idb + sync queue (Fase 3)
│   │       ├── db.ts
│   │       └── sync-manager.ts
│   └── hooks/
│       └── use-os-status.ts
│
├── drizzle/                          # migrations geradas
├── docs/
└── public/
```

## Convenções

| Camada | Onde | Regra |
|--------|------|--------|
| Validação de transição | `lib/workflow/status-machine.ts` | Pura, sem DB — fácil de testar |
| Persistência | `actions/*.ts` | Carrega contexto, chama guards, transação |
| UI de etapa | `app/{modulo}/[osId]` | Server Component busca OS; islands `use client` para forms |
| JSON do Postgres | `lib/workflow/schemas.ts` | Zod antes de insert/update |

## Rotas × Módulo × Status

| Rota | Módulo | Status típicos |
|------|--------|----------------|
| `/field/[osId]` | Medição | `medicao_inicial`, `medicao_final` |
| `/quote/[osId]` | Orçamento | `orcamento_enviado`, `aprovado_cliente` |
| `/production/[osId]` | Corte | `em_corte`, `corte_concluido` |
| `/logistics/[osId]` | Transporte | `em_transporte`, `transporte_entregue` |
| `/installation/[osId]` | Instalação | `instalacao_*`, `concluido` |

## Middleware sugerido (Fase 2)

```typescript
// middleware.ts — redireciona por role + protege rotas
// medidor → /field/*
// cortador → /production/*
```

## MVP vs Fases

- **MVP**: `(dashboard)`, `field`, `quote`, `actions/service-order`, `actions/measurements`, `actions/quotes`
- **Fase 2**: `production`, `logistics`, `installation` + guards completos
- **Fase 3**: `lib/offline`, `stage_sla_config`, relatórios em `(dashboard)/reports`
