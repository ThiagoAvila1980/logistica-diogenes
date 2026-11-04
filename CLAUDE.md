## Codebase Overview

Sistema de logística de uma vidraçaria (Fluxo Diógenes). Cada OS (`measurements`) percorre medição, corte, transporte e instalação, e o progresso de cada vão fica no jsonb `items`. Cada etapa é operada por um papel diferente (admin, gerente, medidor, cortador, motorista, instalador).

**Stack**: Next.js 15 (App Router), React 19, Tailwind 4, Drizzle + Postgres (Supabase), Zod, PWA (Serwist) com offline via Dexie, Capacitor (Android), `pdf-lib`.
**Structure**: `app/` (rotas e API), `src/actions/` (Server Actions), `src/lib/` (regras de domínio), `src/components/`, `src/db/` (schema e migrations), `site/` (landing separada), `label-print-agent/` (impressão de etiquetas), `scripts/` (banco e build).

Para a arquitetura detalhada, veja [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
