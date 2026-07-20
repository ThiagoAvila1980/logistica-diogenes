# Fila de impressão de etiquetas (servidor)

## Problema

Site em HTTPS não pode chamar o agente local em HTTP (conteúdo misto). Túnel (ngrok) a cada uso é inviável na fábrica.

## Solução

Fila no Postgres: o navegador cria um job via API same-origin; o agente no PC da impressora busca jobs (HTTPS outbound) e imprime na USB.

```text
Celular/PC/tablet → POST /api/label-print-jobs (HTTPS)
                         ↓
                    Postgres (pending)
                         ↓
Agente (impressao.bat) → claim → USB → marca done/failed
```

## UX

- Operador: abrir etiqueta → confirmar prévia → Imprimir. Sem URL/IP/túnel.
- PC da impressora: `impressao.bat` sempre ligado (com URL da API + token).

## Dados

Tabela `label_print_jobs`: id, measurement_id, item_id, raw (TSPL), status (pending|printing|done|failed), error, created_by, claimed_at, completed_at, created_at.

## API

| Rota | Auth | Função |
|------|------|--------|
| POST `/api/label-print-jobs` | sessão | gera TSPL e enfileira |
| GET `/api/label-print-jobs/[id]` | sessão | status para o UI |
| GET `/api/agent/label-print/claim` | token agente | pega 1 pending → printing |
| POST `/api/agent/label-print/[id]/result` | token agente | done/failed |

## Agente

Com `LABEL_PRINT_API_URL` + `LABEL_PRINT_AGENT_TOKEN`, faz poll a cada ~2s. Mantém `/health` e `/print` locais para diagnóstico.

## Fora de escopo

- Múltiplas impressoras / filas por setor
- Túnel permanente
- Remover Método B Bluetooth (fica inerte se não usado)
