# The Mod API (interface 1)

This is the short form for module authors. The full specification is `bible/06-Systems/Mod-API.md` in the game source
(it is in `game-integration/patches/`).

## A module is a folder

```
<user data>/Mods/my-module/
  module.json
  module.js
```

`module.json`:

```json
{
  "id": "my-module",
  "name": "My module",
  "version": "1.0.0",
  "api": 1,
  "author": "you",
  "description": "What it does, for the Modules card.",
  "events": ["questMark", "drawFx"]
}
```

| Field | Rule |
| --- | --- |
| `id` | lowercase `a-z 0-9 -`, up to 64 characters, and **the folder's name** |
| `name` | what the player reads |
| `version` | the module's own version (1 to 4 dotted numbers). Never the game's. |
| `api` | the interface it was written for: `1` |
| `events` | every event it listens to. It hears these and no others. |
| `entry` | optional: its `.js` file, default `module.js` |
| `author`, `description` | optional |
| `sha256` | optional: the entry's SHA-256, checked before it runs |

Unknown fields are **refused**, so a typo never becomes a silent default.

`module.js` is one ES module. It is imported from a blob, so it cannot `import` a sibling file; bundle a module written as
several files (as `guide-trail` is).

```js
export default function setup(dfo) {
  dfo.on('questMark', (questXZ, playerXZ, heading01, markKind) => { /* ... */ });
  dfo.onKey('F7', () => dfo.say('Hello'), 'Say hello');
}
```

## Unchained from the game's version

The interface is **append-only**. An event, once shipped, keeps its name and its argument list forever. A later interface
only adds events, and adds arguments at an event's end. So a module written for `api: 1` runs on every game with interface 1
or more. A module that needs a newer interface than the game has is refused with the reason, never run broken.

## Events

| Event | Arguments | When |
| --- | --- | --- |
| `questMark` | `questXZ`, `playerXZ`, `heading01`, `markKind` | every frame the HUD draws. `questXZ` is `[x, z]` (or `[x, z, y]` when the floor is known) where the compass marks, or `null`. `markKind` is `'quest'`, the kind a module named with `retarget` (`'pin'`, `'destination'`, `'exit'`, `'waypoint'`), or `null`. |
| `quests` | `views` | after each quest look: every active quest's `{ id, title, main, urgent, clockSeconds, words, latest, target }` |
| `mapPick` | `sheet`, `dxMetres`, `dzMetres`, `quest`, `exit`, `dyMetres` | a right click on the local map (or a named pin on a dungeon map): where, in metres east (`dx`) and north (`dz`) of the player. `quest`: on a quest's ring. `exit`: on the dungeon's exit. `dy`: height above the player's feet, where known. `dx` and `dz` both `null`: the flag was removed. |
| `drawFx` | `renderer`, `world` | every frame the world pass draws its effects, under the renderer's camera |

### The world probe (`drawFx`'s `world`)

A frozen, read-only look at the scene. Every member may be missing on an older host, so check before calling.

| Member | Answers |
| --- | --- |
| `floor(x, y, z)` | the floor height under `(x, z)` nearest below `y`, or `null` |
| `ray(origin, dir, max)` | the distance to the first wall along `dir`, or `null` when clear |
| `doors(x, z, range)` | the street's doors near `(x, z)` as `[x, y, z]` (where the host has a door list) |
| `known()` | what the player's map knows of this place: `{ walked: ["ix,y,iz", ...], steps: [[fx, fy, fz, tx, ty, tz], ...] }` (1 m cells walked; one-way teleporters and drops taken), or `null` |
| `waypoints()` | the region map's waypoints the player follows, `{ id, name, x, z }` in this frame, or `null` indoors. Ask every frame: the open world's frame moves as it streams. |

The renderer gives the camera (`renderer._camPos`, `_view`, `_proj`) and its particle door
(`createParticleEffect`, `updateParticleEffect`, `drawWorldParticleEffects`).

## The handle (`dfo`)

Frozen, and exactly these members. There is no door to the network, the disk or another module.

| Member | Does |
| --- | --- |
| `dfo.api`, `dfo.id` | the interface version, the module's id |
| `dfo.on(event, fn)` | listen. Answers a function that stops listening. An event the manifest does not list is refused with a warning. |
| `dfo.store.get(key, fallback)`, `dfo.store.set(key, value)` | the module's own settings, kept by the game |
| `dfo.say(text)` | a line over the game |
| `dfo.onKey(spec, fn, label)` | an action on a key (`'F7'`, `'Shift+F3'`). The player may move it. Answers a function that says the key it has now. |
| `dfo.retarget([x, z] or [x, z, y], kind)` | point the compass (and every `questMark` listener) at a place; `kind` is a lowercase word. `null` gives the compass back. The last ask by an enabled module wins. |
| `dfo.markColour('#rrggbb')` | colour the compass's own mark. `null` gives it the game's gold back. The last ask by an enabled module wins. |

## Rules the host keeps

- A listener that throws is isolated and named once; after **25** failures the module is switched off for the session.
- A module the player switched off is **never imported**.
- Keys never fire from a text field, with Ctrl, Alt or Meta held, or on key repeat.
- A module is the player's own code with the page's reach. The API promises the **shape** of a module's contact with the
  game, not a sandbox: install only what you trust.

## Building and installing (game source)

```
node scripts/buildModules.mjs                    build the bundled modules (a module with src/setup.js)
node scripts/buildModules.mjs --install <dir>    ...and copy them into <dir>/Mods, with each entry's sha256
```
