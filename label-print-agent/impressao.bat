@echo off
chcp 65001 >nul
title Diogenes - Agente de impressao de etiquetas

cd /d "%~dp0"

set LABEL_PRINT_PORT=9101
set LABEL_PRINT_PRINTER=Thermal LABEL

echo.
echo ========================================
echo  Agente de impressao - Logistica Diogenes
echo  Porta: %LABEL_PRINT_PORT%
echo  Impressora: %LABEL_PRINT_PRINTER%
echo  Deixe esta janela ABERTA enquanto imprimir.
echo ========================================
echo.

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
