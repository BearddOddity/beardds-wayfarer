#!/bin/sh
# Uninstalls Beardd's Wayfarer on Linux and macOS (the same as Uninstall.cmd): takes its module folders out of the game's Mods folder.
# Only folders that really are this mod's are removed: each must hold a module.json whose id is the folder's name and whose name
# starts "Beardd's Wayfarer". Any other module, your saves and the game's files are never touched.
#   ./uninstall.sh        asks before removing anything
#   ./uninstall.sh -y     removes without asking
here=$(cd "$(dirname "$0")" && pwd)
. "$here/tools/common.sh"

mods="$(user_data)/Mods"
ours=""
for m in waypoint guide-trail pins notice clairvoyance; do
  dir="$mods/$m"
  [ -d "$dir" ] || continue
  if [ -f "$dir/module.json" ] && grep -q "\"id\": *\"$m\"" "$dir/module.json" && grep -q "\"name\": *\"Beardd's Wayfarer" "$dir/module.json"; then
    ours="$ours $dir"
  else
    echo "Left alone: $dir (not a Beardd's Wayfarer module)"
  fi
done
if [ -z "$ours" ]; then echo "Beardd's Wayfarer is not installed in $mods - nothing to do."; exit 0; fi

echo "These folders will be removed:"
for d in $ours; do echo "  $d"; done
if [ "$1" != "-y" ]; then
  printf 'Remove them? (y/n) '
  read -r answer
  case "$answer" in y|Y|yes|YES) ;; *) echo "Nothing was removed."; exit 0 ;; esac
fi
for d in $ours; do rm -rf "$d"; echo "Removed $d"; done
rmdir "$mods" 2>/dev/null && echo "Removed the empty $mods"
echo
echo "Beardd's Wayfarer is uninstalled. Restart the game if it is running."
