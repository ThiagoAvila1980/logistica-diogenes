# Método A — Agente de impressão (Windows + USB)

Impressora térmica no **USB de um PC Windows** na mesma rede. Celulares/PWA
enviam a etiqueta (ZPL) para o agente; o agente imprime na USB.

Não depende de Bluetooth nem do app Capacitor.

## Visão geral

```text
Celular / PWA  →  Next.js (/api/labels)  →  agente no PC  →  POS-9220-L (USB)
```

## 1. No PC da impressora

1. Conecte a POS-9220-L por **USB** e instale o driver (deve aparecer em
   **Configurações → Impressoras**).
2. Anote o **nome exato** da impressora (ex.: `Thermal LABEL`).
3. Instale [Node.js](https://nodejs.org/) LTS (se ainda não tiver).
4. Suba o agente com o atalho:

```bat
label-print-agent\impressao.bat
```

(Edite `LABEL_PRINT_PRINTER` dentro do `.bat` se o nome no Windows for outro.)

Ou manualmente no PowerShell:

```powershell
cd C:\dev\logistica_diogenes\label-print-agent
$env:LABEL_PRINT_PRINTER = "Thermal LABEL"
$env:LABEL_PRINT_PORT = "9101"
npm start
```

### Firewall (porta 9101) — cmd ou PowerShell **como Administrador**

```bat
netsh advfirewall firewall add rule name="Diogenes Label Print Agent" dir=in action=allow protocol=TCP localport=9101
```

PowerShell (Admin):

```powershell
New-NetFirewallRule -DisplayName "Diogenes Label Print Agent" -Direction Inbound -LocalPort 9101 -Protocol TCP -Action Allow
```

5. Teste no próprio PC: abra `http://localhost:9101/health` — deve retornar
   `{ "ok": true, ... }`.
6. Descubra o IPv4 do PC (`ipconfig`, ex.: `192.168.15.165`).
7. **Firewall:** permita entrada TCP na porta `9101` (rede privada):

```powershell
New-NetFirewallRule -DisplayName "Diógenes Label Print Agent" -Direction Inbound -LocalPort 9101 -Protocol TCP -Action Allow
```

## 2. No celular / navegador (mesma Wi‑Fi)

1. Abra o Diógenes (PWA ou site).
2. Plano de corte → marque **Embalagem** → ícone da etiqueta.
3. Na primeira vez, configure:
   - **URL do agente:** `http://IP_DO_PC:9101` (ex.: `http://192.168.15.165:9101`)
   - **Nome da impressora:** o mesmo do Windows (se houver mais de uma)
4. **Testar agente** → depois **Imprimir agora**.

A URL fica salva neste aparelho (localStorage).

## 3. Variável opcional no Next.js

No `.env.local` do app web (pré-preenche a URL):

```env
NEXT_PUBLIC_LABEL_PRINT_AGENT_URL=http://192.168.15.165:9101
```

## 4. Manter o agente sempre ligado

- Deixe o PowerShell/`npm start` rodando, ou
- Crie um atalho na inicialização do Windows, ou
- Use [NSSM](https://nssm.cc/) / Task Scheduler para rodar `node server.mjs` como serviço.

## Rotas do agente

| Método | Rota        | Função                          |
|--------|-------------|---------------------------------|
| GET    | `/health`   | Status                          |
| GET    | `/printers` | Lista impressoras do Windows    |
| POST   | `/print`    | `{ "raw": "...", "printer"? }`  |

## Problemas comuns

| Sintoma | O que checar |
|---------|----------------|
| Agente inacessível no celular | Mesma Wi‑Fi, IP certo, firewall, `npm start` rodando |
| Impressora não encontrada | Nome exato em `Get-Printer` / painel do Windows |
| Job na fila e **não sai papel** | Ver seção abaixo (TSPL + impressão direta) |
| IP mudou | Atualize a URL no diálogo da etiqueta |

## Job na fila e não imprime

1. O app agora envia **TSPL** (linguagem nativa da POS-9220-L). Atualize o Next e tente de novo.
2. No Windows, na impressora **Thermal LABEL**:
   - Clique direito → **Preferências de impressão** / **Propriedades da impressora**
   - Aba **Avançado** → marque **Imprimir diretamente na impressora** (desativa spooler “inteligente”)
   - Se possível, use driver **Generic / Text Only** ou o driver “RAW” do fabricante
3. Limpe a fila: clique direito na impressora → **Cancelar todos os documentos**
4. Confira papel, tampa fechada e que a impressora não está em pausa/offline
5. Teste no PC: `http://localhost:9101/test` (etiqueta TSPL mínima)

## Etiqueta cortando / conteúdo cortado

1. **Meça o rótulo físico** (largura × altura em mm). O padrão no código é **100 × 150 mm**.
2. Ajuste em `src/lib/labels/label-profile.ts` (`widthMm`, `heightMm`, `gapMm`).
3. Se o corte vier no meio do texto, o `gapMm` pode estar errado (gap real entre etiquetas) — tente `2` ou `3`, ou `0` se for papel contínuo.
4. No utilitário/driver da impressora, calibre sensor de gap / tamanho do rótulo para o mesmo valor.

## Método B (Bluetooth)

Continua no código como fallback se **não** houver URL de agente configurada e o app nativo Capacitor estiver em uso. Para o dia a dia na fábrica, use o Método A.
