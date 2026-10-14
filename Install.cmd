@echo off
rem Installs Beardd's Wayfarer into the game's Mods folder (see docs\players\install.md). "Install.cmd -Uninstall" takes it out again.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install.ps1" %*
pause
