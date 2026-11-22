@echo off
rem Galilei: sobe o servidor local e abre a página no navegador.
cd /d "%~dp0"
start "" http://localhost:3737
node server\server.mjs
