# App Android (impressão Bluetooth de etiquetas) — Método B

> **Preferência atual:** use o **Método A** (PC USB + agente na rede).  
> Guia: [`LABEL_PRINT_AGENT.md`](./LABEL_PRINT_AGENT.md).  
> Este documento descreve o fallback Bluetooth via Capacitor.

O Plano de corte gera etiquetas ZPL e, no **app Android**, envia via Bluetooth SPP para a POS-9220-L.

## Pré-requisitos

- Node.js + dependências do projeto (`npm install`)
- Android Studio (SDK + emulador ou celular USB)
- Impressora POS-9220-L pareada no Android (PIN `1234`)

## Configurar URL do app Next.js

O WebView carrega o site (não um export estático). Defina a URL antes do sync:

```powershell
$env:CAPACITOR_SERVER_URL = "https://www.diogenesvidros.com.br"
npm run cap:sync
```

Para desenvolvimento na rede local (celular e PC na mesma Wi‑Fi):

```powershell
# Confira o IPv4 com: ipconfig
# Se o IP mudar (ex.: .65 → .165), rode cap:sync de novo com o IP novo.
$env:CAPACITOR_SERVER_URL = "http://192.168.15.165:3000"
npm run cap:sync
npm run dev:mobile
```

No Chrome do celular, teste antes: `http://IP:3000` — se não abrir, o app nativo também não.

## Build / abrir no Android Studio

```powershell
npm run cap:sync
npm run cap:open
```

No Android Studio: Build → Run no dispositivo.

## Uso no Plano de corte

1. Marque **Embalagem** no vão.
2. Toque no ícone de etiqueta.
3. Na primeira vez, escolha a impressora na lista (dispositivos já pareados).
4. Imprimir.

## Conteúdo da etiqueta (100 × 150 mm)

- Cabeçalho: cliente, orçamento, telefone, endereço
- Corpo: Vão N, ambiente — envidraçamento, qty × L × A mm
- QR: `DIO:VAO:{itemId}` (leitura futura)

## Observação

No Chrome/Safari do celular a impressão Bluetooth **não** funciona — só no app nativo gerado aqui.

## Avisos comuns no Android Studio

- **Using flatDir should be avoided** — aviso do Gradle/Capacitor; neste projeto o `flatDir` foi removido porque não há libs locais. Se o `cap sync` recriar o aviso em `capacitor-cordova-android-plugins`, pode ignorar ou remover o bloco `flatDir` de novo.
- HTTP local (`http://IP:3000`) exige `android:usesCleartextTraffic="true"` no `AndroidManifest.xml` (já configurado).
- **Não aceite upgrade automático** do Android Gradle Plugin para a versão 9.x — o Capacitor 6 deste projeto usa **AGP 8.2.1** + **Gradle 8.2.1**. Se o Studio oferecer “Upgrade”, recuse.
