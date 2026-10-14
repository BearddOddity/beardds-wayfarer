@echo off
rem Beardd's Wayfarer, DEV-REVIEW LOADER: checks every hook against the installed game, using the game's own Electron as Node.
rem Run it after each game update. The game folder: set DFO_GAME to it if it is not "Daggerfall Online" beside this repo's folder.
if not defined DFO_GAME set "DFO_GAME=%~dp0..\..\Daggerfall Online"
set ELECTRON_RUN_AS_NODE=1
"%DFO_GAME%\DFO Online.exe" "%~dp0check.cjs" %* | more
pause
