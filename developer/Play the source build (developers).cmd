@echo off
rem Plays the game from SOURCE (the branch in daggerfall-js-source) in your installed shell. Single-player test only;
rem it keeps its own saves, so your real ones are untouched. See test-build.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-build.ps1"
if errorlevel 1 pause
