# Installs Beardd's Wayfarer: copies the three module folders in Mods\ into the game's Mods folder,
# %APPDATA%\Daggerfall JavaScript\Mods (or $env:DAGGER_USER_DATA\Mods when you set one). The game's own files are not touched.
#
#   .\install.ps1               install, or update over an older copy
#   .\install.ps1 -Uninstall    take the three module folders out again (your saves and settings stay)
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'

$from = Join-Path (Split-Path $PSScriptRoot -Parent) 'Mods'
$userData = if ($env:DAGGER_USER_DATA) { $env:DAGGER_USER_DATA } else { Join-Path $env:APPDATA 'Daggerfall JavaScript' }
$to = Join-Path $userData 'Mods'
$modules = 'waypoint', 'guide-trail', 'pins'

if ($Uninstall) {
    foreach ($m in $modules) {
        $dir = Join-Path $to $m
        if (Test-Path $dir) { Remove-Item -Recurse -Force $dir; Write-Host "Removed $m" }
    }
    Write-Host 'Beardd''s Wayfarer is uninstalled.'
    return
}

if (-not (Test-Path $userData)) { throw "No game data folder at $userData. Start DFO Online once, then run this again." }
New-Item -ItemType Directory -Force $to | Out-Null
foreach ($m in $modules) {
    $dir = Join-Path $to $m
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }   # a clean copy: no stale file from an older version
    Copy-Item -Recurse (Join-Path $from $m) $dir
    Write-Host "Installed $m -> $dir"
}
Write-Host ''
Write-Host 'Beardd''s Wayfarer is installed. In the game: Settings > Mods & files > Modules shows the three modules.'
Write-Host '(A game without the Mod API cannot run modules yet: see docs\players\install.md.)'
