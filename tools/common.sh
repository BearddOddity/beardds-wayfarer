# Shared by the Linux and macOS scripts (sourced, never run): where the game is, and where its user-data folder is.
# The same rules as dev-review/platform.cjs, which launch.mjs and check.cjs use. POSIX sh; works with macOS's bash 3.2.

# user_data: the game's own user-data folder (it sets it the same way); the Mods folder is inside it
user_data() {
  if [ -n "$DAGGER_USER_DATA" ]; then printf '%s\n' "$DAGGER_USER_DATA"; return; fi
  if [ "$(uname -s)" = Darwin ]; then printf '%s\n' "$HOME/Library/Application Support/Daggerfall JavaScript"
  else printf '%s\n' "${XDG_CONFIG_HOME:-$HOME/.config}/Daggerfall JavaScript"; fi
}

# exe_in <path>: prints the game's executable if <path> is, or holds, the game. A file is taken as the game (an AppImage or the
# binary); "DFO Online.app" is the macOS bundle; a folder may hold an unpacked game, a .app or an AppImage.
exe_in() {
  c=$1
  [ -n "$c" ] || return 1
  if [ -f "$c" ]; then printf '%s\n' "$c"; return 0; fi
  [ -d "$c" ] || return 1
  case "$c" in
    *.app) for b in "$c/Contents/MacOS/DFO Online" "$c"/Contents/MacOS/*; do [ -f "$b" ] && { printf '%s\n' "$b"; return 0; }; done; return 1 ;;
  esac
  for n in dfo-online "DFO Online" daggerfall-js-app; do
    [ -f "$c/$n" ] && [ -d "$c/resources" ] && { printf '%s\n' "$c/$n"; return 0; }
  done
  for a in "$c"/DFO*Online*.app "$c"/DFO*Online*.AppImage "$c"/DFO*Online*.appimage; do
    [ -e "$a" ] && exe_in "$a" && return 0
  done
  return 1
}

# find_game <mod folder>: prints the game's executable. DFO_GAME names it, and if it names nothing the answer is "not found" (never
# another game); else beside the mod's folder, around it, and the game's usual homes.
find_game() {
  if [ -n "$DFO_GAME" ]; then exe_in "$DFO_GAME"; return; fi
  mod=$1
  if [ "$(uname -s)" = Darwin ]; then homes="/Applications/DFO Online.app
$HOME/Applications/DFO Online.app"
  else homes="$HOME/Applications
$HOME/Games
$HOME/Downloads
$HOME
/opt/DFO Online
/opt/dfo-online"; fi
  oldifs=$IFS; IFS='
'
  for c in "$mod/../Daggerfall Online" "$mod/.." $homes; do
    IFS=$oldifs
    exe_in "$c" && return 0
    IFS='
'
  done
  IFS=$oldifs
  return 1
}
