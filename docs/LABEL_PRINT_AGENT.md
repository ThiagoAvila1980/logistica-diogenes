# Método A — Fila no servidor + agente Windows (USB)

Impressora térmica no **USB de um PC Windows**. Celulares/tablets/PCs usam o
site em HTTPS normalmente; o agente no PC busca os jobs e imprime.

Não precisa de túnel, ngrok, IP local nem URL no celular.

## Visão geral

```text
Celular / tablet / PC  →  site HTTPS  →  fila no Postgres
                                              ↑
PC da impressora (impressao.bat) ─────────────┘  claim + USB
```

## 1. No servidor (produção)

1. Defina no Coolify / `.env`:

```env
LABEL_PRINT_AGENT_TOKEN=um-token-longo-e-secreto
```

2. Rode a migration (`db:migrate` / deploy) para criar a tabela `label_print_jobs`.

## 2. No PC da impressora

1. Conecte a POS-9220-L por USB e confira o nome em Impressoras (ex.: `Thermal LABEL`).
2. Instale Node.js LTS.
3. Edite `label-print-agent\impressao.bat`:
   - `LABEL_PRINT_PRINTER` = nome exato no Windows
   - `LABEL_PRINT_API_URL` = `https://www.diogenesvidros.com.br`
   - `LABEL_PRINT_AGENT_TOKEN` = **o mesmo** do servidor
4. Rode o atalho e **deixe a janela aberta** (ou coloque na inicialização do Windows).

Teste local: `http://localhost:9101/health` deve mostrar `"queueMode": true`.

## 3. No celular / tablet / PC (qualquer rede)

1. Abra o Diógenes em produção (HTTPS).
2. Plano de corte → **Embalagem** → ícone da etiqueta.
3. Confirme a prévia → **Imprimir agora**.

Pronto. Sem configurar IP.

## Rotas

### App (usuário logado)

| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/label-print-jobs` | Enfileira etiqueta |
| GET | `/api/label-print-jobs/[id]` | Status do job |

### Agente (token)

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/agent/label-print/claim` | Pega próximo job |
| POST | `/api/agent/label-print/[id]/result` | Marca done/failed |

### Agente local (diagnóstico)

| Método | Rota | Função |
|--------|------|--------|
| GET | `/health` | Status |
| GET | `/printers` | Lista impressoras Windows |
| POST | `/print` | Impressão direta (teste) |

## Problemas comuns

| Sintoma | O que checar |
|---------|----------------|
| “Nenhum PC da impressora respondeu” | `impressao.bat` aberto? Token igual ao servidor? Internet no PC? |
| Job fica em pending | Token errado ou `LABEL_PRINT_API_URL` errada no .bat |
| Job failed | Nome da impressora no Windows / driver RAW |
| Job na fila Windows sem papel | Preferências → Imprimir diretamente na impressora; driver TSPL |

## Job na fila e não imprime

1. O app envia **TSPL**. Atualize o Next e o agente.
2. Na impressora **Thermal LABEL**: Imprimir diretamente na impressora.
3. Limpe a fila no Windows.
4. Teste no PC: `http://localhost:9101/test`

## Etiqueta cortando

Ajuste em `src/lib/labels/label-profile.ts` (`widthMm`, `heightMm`, `gapMm`).
