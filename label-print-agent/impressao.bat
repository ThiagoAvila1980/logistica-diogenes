@echo off
chcp 65001 >nul
title Diogenes - Agente de impressao de etiquetas

cd /d "%~dp0"

set LABEL_PRINT_PORT=9101
set LABEL_PRINT_PRINTER=Thermal LABEL

REM URL do site em producao (sem barra no final)
set LABEL_PRINT_API_URL=https://www.diogenesvidros.com.br

REM DEVE ser o mesmo valor de LABEL_PRINT_AGENT_TOKEN no servidor (Coolify / .env)
set LABEL_PRINT_AGENT_TOKEN=x8yItnWNoVPwpYwdnTZaMVqyjApJmY0HvlNc9ksbYiU

echo.
echo ========================================
echo  Agente de impressao - Logistica Diogenes
echo  Porta local: %LABEL_PRINT_PORT%
echo  Impressora: %LABEL_PRINT_PRINTER%
echo  Fila API: %LABEL_PRINT_API_URL%
echo  Deixe esta janela ABERTA enquanto imprimir.
echo ========================================
echo.

if "%LABEL_PRINT_AGENT_TOKEN%"=="troque-pelo-mesmo-token-do-servidor" (
  echo [AVISO] Edite LABEL_PRINT_AGENT_TOKEN neste .bat para bater com o servidor.
  echo.
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node.js LTS e tente de novo.
  pause
  exit /b 1
)

node server.mjs
if errorlevel 1 (
  echo.
  echo [ERRO] O agente encerrou com falha.
  pause
)
