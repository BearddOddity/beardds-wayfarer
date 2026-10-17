@echo off
rem Beardd's Wayfarer: starts DFO Online with the mod. Double-click this file, then press PLAY in the game's launcher.
rem It only starts the game. To install, use Install.cmd; to update, run Install.cmd again; to remove, use Uninstall.cmd.
rem Needs nothing else: the game's own runtime runs the loader, so no Node.js is needed.
rem
rem Finding the game: this folder can sit BESIDE the game's folder ("Daggerfall Online") or INSIDE it. It looks in:
rem   1. the folder named by DFO_GAME, if you set it
rem   2. "Daggerfall Online" beside this folder
rem   3. the folder this folder sits in (this folder is inside the game)
rem The game's folder is the one that holds "DFO Online.exe".
rem The loader's output goes to dev-review\loader.log, not to this window.
setlocal
cd /d "%~dp0"

set "GAME="
if defined DFO_GAME if exist "%DFO_GAME%\DFO Online.exe" set "GAME=%DFO_GAME%"
if not defined GAME if exist "%~dp0..\Daggerfall Online\DFO Online.exe" set "GAME=%~dp0..\Daggerfall Online"
if not defined GAME if exist "%~dp0..\DFO Online.exe" set "GAME=%~dp0.."

if not defined GAME (
  echo DFO Online was not found.
  echo This folder must sit beside the game's folder ^(Daggerfall Online^), or inside it.
  echo Or set DFO_GAME to the game's folder, then run this file again.
  pause
  exit /b 1
)

if not exist "%APPDATA%\Daggerfall JavaScript\Mods\pins\module.json" (
  echo Beardd's Wayfarer is not installed yet. Double-click Install.cmd first, then run this file again.
  pause
  exit /b 1
)

echo Starting DFO Online with the mod from "%GAME%"...
set ELECTRON_RUN_AS_NODE=1
"%GAME%\DFO Online.exe" "%~dp0dev-review\launch.mjs" --game "%GAME%" > "%~dp0dev-review\loader.log" 2>&1
if errorlevel 1 (
  echo The game did not start with the mod. See dev-review\loader.log for details.
  pause
  exit /b 1
)
endlocal
