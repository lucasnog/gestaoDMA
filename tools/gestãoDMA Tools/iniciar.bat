@echo off
title Gestao DMA Tools
cd /d "%~dp0"
echo Iniciando Gestao DMA Tools...
if not exist node_modules (
  echo Instalando dependencias (primeira execucao)...
  call npm install
)
call npm start
