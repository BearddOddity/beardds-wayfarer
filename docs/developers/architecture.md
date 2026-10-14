# Architecture

Beardd's Wayfarer is three **modules** written against the game's **Mod API**. The Mod API is a small change to the game's
client (in [game-integration](../../game-integration/README.md)). Until the game ships it, a **dev-review loader** gives the
released client the same API from outside.

```
                     +---------------------------------------------+
                     |  DFO Online client (the page)               |
                     |                                             |
   the game's seams  |  enhancedHud ---- questMark ------+         |
   announce events   |  hostMagic ------ drawFx(world) --+         |
   on ONE bus        |  heldMap -------- mapPick --------+--> bus  |
                     |  questBridge ---- quests ---------+    |    |
                     |                                        |    |
                     |  the bus hands each module ONLY the    v    |
                     |  events its module.json lists:   +---------+|
                     |                                  |waypoint ||
                     |   modules ask back through their |guide-   ||
                     |   handle: retarget (point the    | trail   ||
                     |   compass), markColour, say,     |pins     ||
                     |   onKey, store                   +---------+|
                     +---------------------------------------------+
                        ^ module folders read from <user data>/Mods/<id>/
```

## The three parts

| Part | Where | What it is |
| --- | --- | --- |
| **The Mod API** | the game's source: `src/mods/` (patches in `game-integration/`) | the bus, the host that loads modules, the keys panel, the Modules card, and the event seams in the game's code |
| **The mod** | this repository: `source/` (source), `Mods/` (built), `test/` | three module folders: `waypoint`, `guide-trail`, `pins` - owned, tested and released here, never inside the game |
| **The dev-review loader** | `dev-review/` | runs the game's own Mod API on today's released client, by patching the served code in memory |

The modules are the same files in both cases. A module cannot tell whether the game or the loader hosts it.

## How a frame flows

1. **The HUD draws the compass** (`ui/enhancedHud.js` `drawQuestMark`). It asks the bus whether a module pointed the compass
   somewhere else (`modBus.retarget`) and what colour the mark should be (`modBus.markColour`). Then it announces
   `questMark(questXZ, playerXZ, heading01, markKind)`.
2. **Every module that listens to `questMark` hears the same place**: the quest's, or the place a module asked for. So the
   waypoint and the trail follow a pin with no code that knows about pins.
3. **The world pass draws its effects** (`scenes/hostMagic.js` `drawFx`) and announces `drawFx(renderer, world)`. `world` is
   a frozen, read-only probe of the scene: `floor`, `ray`, and where the host has them `doors`, `known`, `waypoints`.
4. The **guide trail** plans a way over the probe and draws embers through the renderer's existing particle path. The
   **waypoint** projects the place with the renderer's own camera and draws a diamond in the page's overlay. **Pins** reads
   the camera to drop pins where you look and to notice when you change place.
5. A **right click on the local map** (`ui/heldMap.js`) the map did not take itself becomes `mapPick(sheet, dx, dz, quest,
   exit, dy)`. Pins turns it into a place and asks the compass to mark it (`dfo.retarget`).

## Rules the design keeps

- **A module is a folder, unchained from the game's version.** It names the interface it was written for (`api`), never a
  game build. The interface is append-only: an event keeps its name and arguments forever.
- **A module hears only what it lists.** Its manifest's `events` are its whole contact with the game.
- **No module reads another.** They share only the compass's mark. Remove any one and the others run as before.
- **Client-side only.** The bus carries nothing to the server. No wire changes, no new network door.
- **Failures are contained.** A throwing listener is caught and named once; after 25 failures its module is switched off for
  the session. The frame and every other module go on.
- **Keys belong to the player.** A module names a default; the player can move it (Shift+F1). Keys only work while the HUD
  draws, so they never fire in a menu.

## Where the code lives

| Concern | File (game source) |
| --- | --- |
| Interface: events, manifest law, bus, handle | `src/mods/modApi.js` |
| The game's one bus, its storage and words | `src/mods/modBus.js` |
| Loading modules at boot | `src/mods/moduleHost.js` |
| The keys panel (Shift+F1) | `src/mods/keysPanel.js` |
| The Modules card (Settings > Mods & files) | `src/ui/modulesCard.js` |
| The shell's door to the Mods folder | `app/lib/moduleFiles.cjs`, `app/preload.cjs` |
| `questMark` seam, compass colour | `src/ui/enhancedHud.js` |
| `drawFx` seam and the world probe | `src/scenes/hostMagic.js`, `src/scenes/world.js`, `src/scenes/exterior.js`, `src/scenes/dungeonContext.js` |
| `mapPick` seam | `src/ui/heldMap.js`, `src/ui/townSheet.js`, `src/ui/automapSheet.js` |
| `quests` seam | `src/scenes/questBridge.js` |
| Quest guidance that follows the journal | `src/ui/questLens.js` (`personSiteOf`, `seek`), `src/systems/questGuidance.js` (`personDealtWith`), `src/ui/questMarks.js` |
| The specification | `bible/06-Systems/Mod-API.md` |
| Tests | `test/mods1_api.test.js` and the quest guidance tests `test/guide1_questLens.test.js`, `test/guide5_marks.test.js`, `test/guide8_questguidance.test.js` |

The mod's own code is not in the game: `source/` in this repository, built by `tools/build.mjs`, tested by `test/wayfarer.test.js`.

## Two kinds of change in the game patches

1. **The Mod API**: new files and one-line seams. It changes no game behaviour; with no module installed, the game runs as
   before (each seam costs one lookup).
2. **Quest guidance fixes**, found while testing the mod live. They change what the game's own Quest guidance marks:
   - a journal entry that says where a **person** waits ("awaits me in [building] in [town]") now points at that place;
   - a person the quest is **done with** (every step waiting on clicking them has fired) is no longer marked, and is no
     longer a place to go;
   - a town the entry names but the player's map does not hold is **highlighted on the region map** (`seek`). The compass
     still waits until the player finds it.

   These help every player, with or without the mod. The developers may take them or leave them separately from the API.
