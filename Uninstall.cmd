@echo off
rem Uninstalls Beardd's Wayfarer: removes its three module folders from the game's Mods folder, after asking.
rem Other modules, your saves and the game's files are never touched. "Uninstall.cmd -Yes" skips the question.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\uninstall.ps1" %*
pause
