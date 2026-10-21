#!/bin/sh
# Beardd's Wayfarer on Linux and macOS: starts DFO Online with the mod (the same as "Play Wayfarer.cmd" on Windows).
# Run it from a terminal:  ./play-wayfarer.sh   then press PLAY in the game's launcher.
# It only starts the game. To install, use ./install.sh; to remove, ./uninstall.sh. Needs nothing else: the game's own runtime
# runs the loader, so no Node.js is needed.
#
# Finding the game: DFO_GAME if you set it (the game's folder, "DFO Online.app" or the AppImage), else beside this folder, around it,
# then the usual homes (macOS: /Applications; Linux: ~/Applications, ~/Games, ~/Downloads, ~).
# Extra switches for the game go after --, e.g. ./play-wayfarer.sh -- --no-sandbox  (some Linux systems need that for an AppImage).
# The loader's output goes to dev-review/loader.log, not to this window.
here=$(cd "$(dirname "$0")" && pwd)
. "$here/tools/common.sh"

exe=$(find_game "$here") || {
  echo "DFO Online was not found." >&2
  echo "Put this folder beside the game, or set DFO_GAME to it (its folder, DFO Online.app or the AppImage), then run this again." >&2
  exit 1
}
if [ ! -f "$(user_data)/Mods/pins/module.json" ]; then
  echo "Beardd's Wayfarer is not installed yet. Run ./install.sh first, then this again." >&2
  exit 1
fi
[ -x "$exe" ] || chmod +x "$exe" 2>/dev/null   # an AppImage downloaded from a browser is not executable

echo "Starting DFO Online with the mod from $exe ..."
ELECTRON_RUN_AS_NODE=1 "$exe" "$here/dev-review/launch.mjs" --game "$exe" "$@" > "$here/dev-review/loader.log" 2>&1 || {
  echo "The game did not start with the mod. See dev-review/loader.log for details." >&2
  exit 1
}
