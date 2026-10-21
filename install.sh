#!/bin/sh
# Installs Beardd's Wayfarer on Linux and macOS (the same as Install.cmd): copies the module folders in Mods/ into the game's Mods
# folder (Linux: ~/.config/Daggerfall JavaScript/Mods; macOS: ~/Library/Application Support/Daggerfall JavaScript/Mods; or
# $DAGGER_USER_DATA/Mods when you set one). The game's own files are not touched. Run it again to update over an older copy.
here=$(cd "$(dirname "$0")" && pwd)
. "$here/tools/common.sh"

data=$(user_data)
to="$data/Mods"
if [ ! -d "$data" ]; then
  echo "No game data folder at $data. Start DFO Online once, then run this again." >&2
  exit 1
fi
mkdir -p "$to"
for m in waypoint guide-trail pins notice clairvoyance; do
  rm -rf "$to/$m"   # a clean copy: no stale file from an older version
  cp -R "$here/Mods/$m" "$to/$m" || exit 1
  echo "Installed $m -> $to/$m"
done
echo
echo "Beardd's Wayfarer is installed. Restart the game if it is running."
echo "(A game without the Mod API cannot run modules yet: start it with ./play-wayfarer.sh.)"
