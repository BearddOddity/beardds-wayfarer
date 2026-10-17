# The developer loader

**For developers and testers.** This folder runs Beardd's Wayfarer on **today's released DFO Online client**, which does
not have the Mod API yet. It is kept apart from the mod itself because it reaches the game through Electron's **debug
switch**. Once the game ships the Mod API ([game-integration](../game-integration/README.md)), this folder is not needed.

## What it does

1. `launch.mjs` starts `DFO Online.exe --inspect-brk=9455`: the game waits, paused on its first line.
2. Through that debug port (bound to 127.0.0.1, this computer only), it requires `loader/main.cjs` into the game's main
   process, then resumes the game.
3. `loader/main.cjs` closes the debug port 4 seconds later, and wraps the game's own `dagger://` protocol:
   - the game page gets **one** extra `<script>`: `core/core.js`, the page host;
   - the module folders in the player's `Mods` folder are listed and served (by plain slug and file name only);
   - the game's JavaScript chunks are patched **in memory, as they are served**, by the hooks in `core/hooks.cjs` - and
     only the hooks for events an installed module listens to.
4. `core/core.js` is **built from the game source's own Mod API** (`build-core.mjs`): the same manifest rules, the same bus,
   the same module host, the same keys panel. So a module is judged here exactly as the game will judge it.

Nothing is installed in the game's folder, and the game's files are never changed. A game update cannot remove the loader,
and starting the game from its own shortcut runs it exactly as shipped.

## Risks a reviewer should weigh

| Risk | Detail |
| --- | --- |
| **Debug port** | The inspector is open for about 4 seconds at start, on 127.0.0.1 only. A local program could attach in that window. |
| **Patched code** | The released client runs code it did not ship with. The hooks only add calls and hand over values, except the quest-guidance hooks below. |
| **Quest-guidance hooks** | `questMark:person`, `:dealt`, `:dealtPeople`, `:seek`, `:seekMap` change what the game's Quest guidance marks. They bring the game source's own fixes (see [architecture](../docs/developers/architecture.md)). All optional. |
| **Breaks on updates** | Hooks match the minified code. A release can move one. `Check hooks (developers).cmd` names it; a required hook that moved switches off only the modules that need it, and says so on screen. |
| **Online** | Nothing is sent to the server and no wire changes. The server cannot tell; it is still a modified client, which is why this needs the developers' permission. |

## Using it

Requirements: **Node.js 22 or newer** (for `launch.mjs`), the installed game, and the mod installed (`Install.cmd` in the
top folder).

| Do | How |
| --- | --- |
| Play with the mod | Double-click **`Play with the loader (developers).cmd`**, then press PLAY in the game's launcher as usual |
| Check after a game update | Double-click **`Check hooks (developers).cmd`** |
| Point at another game folder | Set `DFO_GAME` to it (the default is `Daggerfall Online` beside this repository's folder), or pass `--game "<folder>"` |
| See what happened at start | `loader.log` (one line per start: did it load, did it wrap, which modules and hooks) |
| Inspect a run | `node launch.mjs -- --remote-debugging-port=9333`, then in the page: `await dfoMods.status()`, `dfoMods.report()` |
| Switch a module off | the in-game Modules card if the game has one; otherwise in the page: `dfoMods.disable('guide-trail')` |

## Files

| File | Is |
| --- | --- |
| `launch.mjs` | starts the game with the loader (the only part that uses the debug switch) |
| `loader/main.cjs` | the main-process loader: wraps `dagger://`, serves the core and modules, applies hooks, `loader.log` |
| `core/hooks.cjs` | the hook catalog: one text patch per event (or several parts tied by `event`), each commented with the game source it mirrors |
| `core/patch-core.cjs` | applies one patch to one chunk (shared by the loader and the check, so both judge a match alike) |
| `core/src/core-entry.mjs` | the page host's source: the bus, the world probe, the map destination methods, the quest helpers |
| `core/core.js`, `core/modapi.mjs` | **generated** by `build-core.mjs` from `core-entry.mjs` and the game source's Mod API |
| `build-core.mjs` | `node build-core.mjs [--source <daggerfall-js-source>]` |
| `check.cjs`, `Check hooks (developers).cmd` | the self-check (below) |
| `Play with the loader (developers).cmd` | runs `launch.mjs` |

## The self-check (`check.cjs`)

Run with the game's own Electron as Node (`Check hooks (developers).cmd` does this), so it reads inside `app.asar` without unpacking it:

1. **Hooks:** each matches exactly once in the installed game, and each patched chunk still parses.
2. **Modules:** each installed module is judged by the game's own Mod API; its events are checked against the hooks.
3. **Independence:** each module runs alone against the bus, then all together, and answers every event.
4. **The loader:** lists and serves modules, adds one script tag, applies only the hooks installed modules need, and reads
   nothing outside a module's folder.
5. **The waypoint's maths** agrees with the game's compass.
6. **The map flag and player keys**, with the real pins module on the real core.

Exit code 0 means every check passed.
