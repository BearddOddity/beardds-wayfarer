# Changelog

Each release of Beardd's Wayfarer. Install a new one by running `Install.cmd` again: your settings, looks and keys stay.

## Unreleased

- **Play Wayfarer.cmd** finds the game whether the mod's folder is beside the game's folder or inside it.
- The installation guide is rewritten: where the folder goes, the steps, questions, updates, and what the loader does.
- The developer tools find the game in the same two places.

## 1.3.0 - 2026-10-17

- **Play Wayfarer.cmd** starts the game with the mod. It does not install anything: run Install.cmd first, and again after each update.
- The pin key is **F1** (it was F2). DFO Online 0.1.9381 gives F2 to the saddle panel. Shift+F1 still changes any key.
- The loader matches DFO Online 0.1.9381: the waypoint, the guide trail and the pins are all hooked again.
- Not restored on 0.1.9381: the outdoor trail to region-map waypoints, and the quest-guidance fixes. The modules run without them.
- Developers: the loader folder is now `developer/` (it was `dev-review/`). It holds the loader log, the self-check and the update report.
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
