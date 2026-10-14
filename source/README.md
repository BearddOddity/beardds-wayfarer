# Modules

A module is a folder: its manifest names it, names the one small interface it was written for, and names every event it
listens to - the way a crate names its edition and its dependencies. The game offers that interface and keeps it, so a module
is **unchained from the game's version**: it never names a build, and one written for interface `N` runs on every game that
has `N` or more.

The whole specification is `bible/06-Systems/Mod-API.md`. The short form:

```
my-module/
  module.json     { "id": "my-module", "name": "My module", "version": "1.0.0", "api": 1, "events": ["questMark"] }
  module.js       export default function setup(dfo) { dfo.on('questMark', (questXZ, playerXZ, heading) => { ... }); }
```

- `id` is the folder's name (`a-z`, `0-9`, `-`). `version` is yours. `events` is everything the module hears.
- `dfo` is the module's own handle: `on`, `store`, `say`, `onKey`, `retarget`, `markColour`, `api`, `id` - and nothing else. No door to the net, the disk
  or another module.
- Events (interface 1): `questMark` (the compass's mark, every HUD frame), `quests` (the quest views, after each look),
  `mapPick` (a right click on the local map, as metres from the player), `drawFx` (the world pass, with the renderer for drawing
  in the 3D view and a read-only `world` probe: `floor(x, y, z)`, `ray(origin, dir, max)` and, where the host has them,
  `doors(x, z, range)` - which is how the guide trail goes round walls, lies on the floor and finds a way in).
- Modules are **client-side only**: they read what the game shows and draw on your own screen. Nothing is sent to anyone.
- A module is code you chose to install, run with the page's own reach: install only what you trust.

Install into the desktop app's Mods folder (`<user data>/Mods/<id>/`) and switch modules on and off under
**Settings > Mods & files > Modules**.

## The modules here

| folder | listens to | |
| --- | --- | --- |
| `waypoint/` | `questMark`, `drawFx` | a diamond over the compass mark's spot on the floor - gold for the quest, sky blue for a pin, purple for a destination, teal-green for the exit, each with its word - with distance and time at your pace, dim behind walls (F7; Shift+F3 changes its look) |
| `guide-trail/` | `questMark`, `drawFx` | embers along the way round walls, up hills and rubble, and between floors by the stairs and teleporters your map knows, to the compass mark - your destination or the tracked quest, by the nearest door when it is inside a building (F4 on/off; Shift+F4 changes the look, and the compass's mark takes its colour) |
| `pins/` | `mapPick`, `questMark`, `drawFx` | right-click the local map to set a destination or pick a quest location; F2 drops a pin where you look, F3 cycles quest / way out / places, Shift+F2 removes one, right-click a dungeon's exit on its map to be guided back out; a waypoint followed on the region map is led to outdoors: the compass, waypoint and trail follow it |

`guide-trail` is written as several files (`src/`) and bundled into its `module.js`; the others are one file each.

```
node scripts/buildModules.mjs                      build the bundled modules
node scripts/buildModules.mjs --install <dir>      ...and copy them into <dir>/Mods, with each entry's sha256
```

(`<dir>` is the desktop app's user data folder - the one holding its Saves.)
