#!/bin/sh
# Linux and macOS: the same as "Check hooks.cmd" - checks every hook against the installed game, using the game's own Electron as
# Node. Run it after each game update. DFO_GAME names the game if it is not found (its folder, DFO Online.app or the AppImage).
here=$(cd "$(dirname "$0")" && pwd)
. "$here/../tools/common.sh"

exe=$(find_game "$here/..") || { echo "DFO Online was not found. Set DFO_GAME to it, then run this again." >&2; exit 1; }
[ -x "$exe" ] || chmod +x "$exe" 2>/dev/null
ELECTRON_RUN_AS_NODE=1 DFO_GAME="$exe" "$exe" "$here/check.cjs" "$@"
