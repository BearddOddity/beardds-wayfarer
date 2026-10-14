@echo off
rem Beardd's Wayfarer, DEV-REVIEW LOADER: starts DFO Online with the loader (launch.mjs, which needs Node.js 22 or newer).
rem Your own character, saves and settings; the game folder is not changed. Press PLAY in the game's launcher as usual.
rem The game folder: set DFO_GAME to it if it is not "Daggerfall Online" beside this repo's folder.
node "%~dp0launch.mjs" %*
if errorlevel 1 pause
