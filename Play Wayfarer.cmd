@echo off
rem Beardd's Wayfarer: starts DFO Online with the mod. Double-click this file, then press PLAY in the game's launcher.
rem It only starts the game. To install, use Install.cmd; to update, run Install.cmd again; to remove, use Uninstall.cmd.
rem Needs nothing else: the game's own runtime runs the loader, so no Node.js is needed.
rem DFO Online must be installed beside this folder ("Daggerfall Online"). If it is somewhere else, set DFO_GAME to its folder.
rem The loader's output goes to developer\loader.log, not to this window.
setlocal
cd /d "%~dp0"

if not defined DFO_GAME set "DFO_GAME=%~dp0..\Daggerfall Online"
if not exist "%DFO_GAME%\DFO Online.exe" (
  echo DFO Online was not found at "%DFO_GAME%".
  echo Put this folder beside the game's folder, or set DFO_GAME to the game's folder, then run this file again.
  pause
  exit /b 1
)

if not exist "%APPDATA%\Daggerfall JavaScript\Mods\pins\module.json" (
  echo Beardd's Wayfarer is not installed yet. Double-click Install.cmd first, then run this file again.
  pause
  exit /b 1
)

echo Starting DFO Online with the mod...
set ELECTRON_RUN_AS_NODE=1
"%DFO_GAME%\DFO Online.exe" "%~dp0developer\launch.mjs" > "%~dp0developer\loader.log" 2>&1
if errorlevel 1 (
  echo The game did not start with the mod. See developer\loader.log for details.
  pause
  exit /b 1
)
endlocal
