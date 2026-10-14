# Runs the game from SOURCE - the daggerfall-js-source branch with the Mod API (game-integration/patches) - inside your
# installed DFO Online shell, so the modules run natively: no loader, no debug switch.
#
# It starts the source's own dev server and points the shell at it (the shell's DAGGER_DEV_URL door), so what you play is
# exactly the code the patches carry. It uses YOUR profile - your character, saves, settings and Mods folder (files under
# %APPDATA%\Daggerfall JavaScript) - and the shell's own updates stay on. -Isolated gives it a sandbox profile and no update check.
#
# NOT FOR ONLINE: a source build is main as of the last time you pulled it, and the relay only takes the client it is
# deployed with. Single player only.
#
#   .\test-build.ps1                 start the server, open the game, stop the server when the game closes
#   .\test-build.ps1 -NoLaunch       start the server only and report whether it serves the game and your Daggerfall files
param(
    [string]$Source = (Join-Path $PSScriptRoot '..\..\daggerfall-js-source'),   # default: beside this repo's folder
    [string]$Game = $(if ($env:DFO_GAME) { $env:DFO_GAME } else { Join-Path $PSScriptRoot '..\..\Daggerfall Online' }),
    [string]$Arena2 = (Join-Path $PSScriptRoot '..\..\arena2'),   # your Daggerfall data folder (ARENA2)
    [int]$Port = 5173,
    [switch]$NoLaunch,
    [switch]$Isolated
)
$ErrorActionPreference = 'Stop'
foreach ($p in @($Source, $Game, $Arena2)) { if (-not (Test-Path $p)) { throw "Not found: $p" } }
if (-not (Test-Path (Join-Path $Source 'node_modules'))) { throw "No node_modules in $Source - run 'npm ci' there once." }

$url = "http://localhost:$Port"
$env:ARENA2_PATH = $Arena2
$server = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npm run dev -- --port $Port --strictPort" -WorkingDirectory $Source -WindowStyle Minimized -PassThru
try {
    $up = $false
    for ($i = 0; $i -lt 90 -and -not $up; $i++) {
        Start-Sleep -Seconds 1
        try { $up = (Invoke-WebRequest "$url/play/" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { }
    }
    if (-not $up) { throw "The dev server did not come up on $url within 90 seconds." }
    Write-Host "Dev server up on $url"

    if ($NoLaunch) {
        $a2 = try { (Invoke-WebRequest "$url/play/arena2/ARENA2.TXT" -UseBasicParsing -Method Head -TimeoutSec 5).StatusCode } catch { $_.Exception.Message }
        $bsa = try { (Invoke-WebRequest "$url/play/arena2/BLOCKS.BSA" -UseBasicParsing -Method Head -TimeoutSec 5).StatusCode } catch { $_.Exception.Message }
        Write-Host "game page: 200; BLOCKS.BSA from your Daggerfall folder: $bsa"
        return
    }

    $env:DAGGER_DEV_URL = $url
    if ($Isolated) {   # a sandbox: its own saves and settings, no update check - nothing of your real profile is read or written
        $env:DAGGER_USER_DATA = Join-Path $env:APPDATA 'Daggerfall JavaScript (test build)'
        $env:DAGGER_NO_UPDATE_CHECK = '1'
    }
    Write-Host 'Starting the game from source. Close it to stop the dev server.'
    Start-Process -FilePath (Join-Path $Game 'DFO Online.exe') -Wait
}
finally {
    # the dev server is a cmd -> npm -> node tree: take all of it down
    if ($server -and -not $server.HasExited) { & taskkill /PID $server.Id /T /F | Out-Null }
}
