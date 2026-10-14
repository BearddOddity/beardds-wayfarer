@echo off
rem Installs Beardd's Wayfarer into the game's Mods folder (see docs\players\install.md). Run it again to update.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install.ps1"
pause
