# Changelog

Each release of Beardd's Wayfarer. Install a new one by running `Install.cmd` again: your settings, looks and keys stay.

## 1.3.2 - 2026-10-17

- **The guide trail is smooth.** Three things made it stutter, and each is fixed: an ember's sideways wiggle swung half a metre when it crossed a bend in the path (the direction now turns smoothly along the path); the stream's anchor jumped along the path when you walked past a bend (it now moves by your own steps); and every new plan made all the embers jump (a new plan now takes over from the old one over a third of a second). The way is also planned less often while you stay on it, which removes a small hitch twice a second. In a simulated walk the largest one-frame ember jump fell from 0.7-1 m to under 15 cm.
- **Dungeon map pins stay on the dungeon.** A middle-click pin is moved to the nearest walked cell on the floor you clicked, so it never sits on empty paper off the dungeon.
- **Dungeons use only what you have explored and pinned.** Under Journal and Town the quest mark is hidden in a dungeon; under Exact the game's dungeon quest marks show, and the trail follows them over the cells you have walked. Inside a dungeon the trail follows a destination you pinned on the dungeon map (middle-click), and it runs only over the cells you have walked, so it leads to the nearest explored point. A pin you made on a dungeon map is found again when you return to that dungeon.
- The loader reads the dungeon mode from the game (the mode check was reading another object) and matches DFO Online 0.1.9409.
- **The trail goes round buildings smoothly.** The way now keeps 0.8 m off walls and no longer grazes a building's corner, and a new plan keeps to the last one (the same side of a building, the same bend) instead of shifting by up to a third of a metre each time it is made. Walking round a simulated building, the plan-to-plan shift fell from 0.3 m to 0.03 m and the nearest approach to the wall rose from 1 cm to 0.6 m.
- **Walking sideways is smooth.** The near end of the stream now leans toward you, fading back onto the planned way over ten metres, so a step to the side moves the stream with you and a new plan finds it already there; before, it stayed on the old way and snapped across at the next plan.
- **Corners turn gently.** The way's bends are smoothed as widely as the walls allow (checked against the walls, 0.3 m to spare), so a building's corner is a wide arc and not a quick turn. In a simulated building the sharpest turn per metre fell from 9 to 3 degrees.
- **The trail leads to region-map waypoints again.** The loader's hook for them did not match DFO Online 0.1.9404 (the minifier now writes let and `# Changelog
- **Right-click on the town map works again** on current game builds. The loader's hook for it matched but changed nothing; now a hook that changes nothing counts as failed, so the self-check cannot pass it.
- The loader matches DFO Online 0.1.9404: the compass hook reads the game's new function names.

## 1.3.1 - 2026-10-17

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
