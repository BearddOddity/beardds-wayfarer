# Uninstalls Beardd's Wayfarer: takes its three module folders out of the game's Mods folder,
# %APPDATA%\Daggerfall JavaScript\Mods (or $env:DAGGER_USER_DATA\Mods when you set one).
#
# Only folders that really are this mod's are removed: each must hold a module.json whose id is the folder's name and whose
# name starts "Beardd's Wayfarer". Any other module, your saves and the game's files are never touched. The Mods folder itself
# is removed only when nothing else is left in it.
#
#   .\uninstall.ps1         asks before removing anything
#   .\uninstall.ps1 -Yes    removes without asking
param([switch]$Yes)
$ErrorActionPreference = 'Stop'

$userData = if ($env:DAGGER_USER_DATA) { $env:DAGGER_USER_DATA } else { Join-Path $env:APPDATA 'Daggerfall JavaScript' }
$mods = Join-Path $userData 'Mods'
$modules = 'waypoint', 'guide-trail', 'pins', 'notice'

# what is installed, and whether it is ours
$ours = @()
foreach ($m in $modules) {
    $dir = Join-Path $mods $m
    if (-not (Test-Path $dir)) { continue }
    $manifest = $null
    try { $manifest = Get-Content -Raw (Join-Path $dir 'module.json') | ConvertFrom-Json } catch { }
    if ($manifest -and $manifest.id -eq $m -and "$($manifest.name)".StartsWith("Beardd's Wayfarer")) { $ours += $dir }
    else { Write-Host "Left alone: $dir (not a Beardd's Wayfarer module)" }
}

if (-not $ours.Count) { Write-Host "Beardd's Wayfarer is not installed in $mods - nothing to do."; return }

Write-Host 'These folders will be removed:'
$ours | ForEach-Object { Write-Host "  $_" }
if (-not $Yes) {
    $answer = Read-Host 'Remove them? (y/n)'
    if ($answer -notmatch '^(y|yes)$') { Write-Host 'Nothing was removed.'; return }
}

foreach ($dir in $ours) { Remove-Item -Recurse -Force $dir; Write-Host "Removed $dir" }
if (-not (Get-ChildItem -Force $mods | Select-Object -First 1)) { Remove-Item -Force $mods; Write-Host "Removed the empty $mods" }

Write-Host ''
Write-Host "Beardd's Wayfarer is uninstalled. Restart the game if it is running."
Write-Host 'Your saves are untouched. The looks and keys you chose stay in the game''s own settings and are used again if you reinstall.'
