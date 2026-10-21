# Changelog

Each release of Beardd's Wayfarer. Install a new one by running `Install.cmd` again: your settings, looks and keys stay.

## 1.5.1 - 2026-10-21: Hotfix for DFO Online 0.1.10435

A game update broke the mod in two places. This hotfix repairs both. Run `Install.cmd` again (or `./install.sh`) and restart the game with Play Wayfarer.

- **Fixed: the spellbook did not respond.** The game's own spellbook code now uses the same name for two things. The mod's spellbook hook read the wrong one and the spellbook failed every time it drew, for every spell. The hook now picks a name the game does not reuse, and skips itself if none is safe, so a future rename cannot freeze the spellbook again.
- **Fixed: pins did not work on the town map or the dungeon map.** The game added a find-me crosshair to its map windows, which moved the code the loader patches. Right-click destinations and the pin flag work again.
- **Fixed: a memory leak in the guide trail.** Its route memory only cleared on a teleport or a new scene, so a long walk in one place made it grow without limit. It now starts over past 100,000 remembered cells. The guide trail is now 1.3.1.
- **New: Linux and macOS.** `play-wayfarer.sh`, `install.sh`, `uninstall.sh` and `dev-review/check-hooks.sh` do what the `.cmd` files do. They find the game as a macOS app, a Linux AppImage or an unpacked folder. Tested on Windows only; the finder was run against fake Linux and macOS layouts, the scripts themselves have not run on those systems. See `docs/players/install.md`.
- Built for DFO Online 0.1.10435.
- Not yet: the quest-person marks (a person's building in the quest journal) still do not match this game build.

## 1.5.0 - 2026-10-18: Clairvoyance, the spell

Beardd's Wayfarer now works like a spell. **Clairvoyance** is a real spell in your spellbook, given once on first load, with its own icon. Cast it and the compass swings to the mark of the town and city, the region or the dungeon: by where you stand, or directly from the map you choose. Its page in the spellbook holds the lore and every setting: when the waypoint and trail show (always, only while the spell lasts, or cast to turn on), which map a plain cast follows, and the waypoint, trail and colours.

- Map marks are back: right-click destinations on the town map, name pins in a dungeon and cast to them, follow region-map waypoints, and see the quest's town on the region map.
- A dungeon's pins clear when you leave the dungeon, as before.
- **Keys are off for now.** The Shift+F1 keys panel and every module key are disabled (the code stays, so they can come back). Cast Clairvoyance from the hotbar or spellbook.
- Built for DFO Online 0.1.9625.
- Not yet: the quest-person marks (a person's building in the quest journal) do not match this game build.

## Unreleased

- A short "Beardd's Wayfarer active" line at the top of the view when a game starts. Its F6 key is off for now (see 1.5.0).
- The region map marks the quest's town again, and the map's tracked-quest marks, on DFO Online 0.1.9600 (the loader's `questMark:seek` and `questMark:seekMap` hooks match the game's `let` and backtick strings).
- **Play Wayfarer.cmd** finds the game whether the mod's folder is beside the game's folder or inside it.
- The installation guide is rewritten: where the folder goes, the steps, questions, updates, and what the loader does.

## 1.3.0 - 2026-10-17

- **Play Wayfarer.cmd** starts the game with the mod. It does not install anything: run Install.cmd first, and again after each update.
- The pin key is **F1** (it was F2). DFO Online 0.1.9381 gives F2 to the saddle panel. Shift+F1 still changes any key.
- The loader matches DFO Online 0.1.9381: the waypoint, the guide trail and the pins are all hooked again.
- Not restored on 0.1.9381: the outdoor trail to region-map waypoints, and the quest-guidance fixes. The modules run without them.
- The Mod API patch (game-integration) is rebased onto the game source's current main.

## 1.2.1 - 2026-10-14

- The waypoint shows the distance alone ("420 m", "1.9 km"). The walking time is gone.
- The keys panel (Shift+F1) opens small at the left edge of the screen, halfway down, so the middle stays clear.
- The mod has its own home: it is built and tested in this repository, and updated without a game release.

## 1.2.0 - 2026-10-14

- The keys panel says "Beardd's Wayfarer" once and groups the actions by module.
- Every word the mod shows goes through the game's own translations: it follows the language chosen for DFO wherever the
  game has the words, and English until then.

## 1.1.1 - 2026-10-14

- The compass's diamond takes the waypoint diamond's colour: the look you chose for the quest, or the place's own colour.

## 1.1.0 - 2026-10-14

- First release as Beardd's Wayfarer: the quest waypoint, the guide trail and pins.
- The trail leads between a dungeon's floors by the way your map knows, and outdoors to a region-map waypoint you follow.
- Pins keep their floor; the exit is pinned on the floor you came in on.
- Quest guidance follows the journal: the building where a person waits, nothing more once you have dealt with them, and the
  quest's town ringed on the region map.
- Every key can be changed (Shift+F1). `Install.cmd` and `Uninstall.cmd`.
