# The modules, inside

Five folders. Each lives with or without the others, and none reads another: they meet only at the compass's mark
(`questMark`), which pins can move with `dfo.retarget`. The one exception is Clairvoyance, which reads two small surfaces the other
modules offer (`globalThis.dfoWayfarer`, below).

| Module | Listens to | Keys (all off since 1.5.0) | Source |
| --- | --- | --- | --- |
| `clairvoyance` | `questMark`, `drawFx` | Shift+1, 2, 3 (direct casts) | `source/clairvoyance/module.js` (one file) |
| `waypoint` | `questMark`, `drawFx` | F7, Shift+F3 | `source/waypoint/module.js` (one file) |
| `guide-trail` | `questMark`, `drawFx` | F4, Shift+F4 | `source/guide-trail/src/` (bundled into `module.js`) |
| `pins` | `mapPick`, `questMark`, `drawFx` | F1, F3, Shift+F2 | `source/pins/module.js` (one file) |
| `notice` | `drawFx` | F6 | `source/notice/module.js` (one file) |

**Keys are off since 1.5.0.** One switch, `KEY_BINDS_ON` in `dev-review/core/core.js`, turns off both the keys panel (Shift+F1)
and every module key (`pressKey` answers nothing, `installModuleKeys` installs nothing). Modules still register their actions with
`dfo.onKey`; they never fire. Set the switch to `true` to bring the keys back. A cast of the spell, from the hotbar or the
spellbook, is how a player works the mod now.

Every key works only while the HUD drew in the last 400 ms (`HUD_LIVE_MS`): `questMark` is the HUD's heartbeat, and a menu,
a dialog, a map or a loading screen stops it.

## clairvoyance

A real spell of the game's own magic: an effect ("Clairvoyance", type 47, with a duration) that the loader adds to the game's
spell system through the `drawFx:spell*` hooks in `dev-review/core/hooks.cjs` (a row, text, list, self, kind, message, cost, town,
made, shop, icon box, icon frame, caster and panel hook; all optional). The module gives the player the spell once, on first load,
from the **Beardd's Spells** pack, and checks it every load (`globalThis.dfoWayfarerStatus`: `{ ready, waiting, reason }`).

- **The cast** swaps the compass to the mark of one of three maps (Town and City, Region, Dungeon): a plain cast follows the map
  the player stands in (`pins.here()`), or the map the spell's page names; the nearest mark is followed (`pins.follow(map)`). The
  line over the game says which registered, or "No direct path found" when the map holds no mark.
- **The gate:** `globalThis.dfoWayfarerGate()` is asked by the waypoint and the guide trail before they draw. With no castable
  spell it is always open; the spell's page can make it open only while the effect lasts, or after a cast.
- **The surfaces:** `globalThis.dfoWayfarer.pins` (`marks()`, `here()`, `follow(map)`), `.waypoint` and `.trail` (their looks and
  on/off), `.notice`. Nothing else reads them.

## waypoint

**What it draws:** a diamond in a fixed-position overlay (`#dfo-wp`), with a label under it.

- **Where:** each `drawFx`, it takes the mark's floor - `world.floor(x, y + 0.5, z)` at the mark's own height when the game
  gives one (`questXZ[2]`), else at the player's feet height - and stands the diamond 2.4 m above it (`ABOVE_FLOOR_M`). It
  projects that point with the renderer's own view and projection matrices (`project`).
- **Off screen:** it computes the mark's direction in view space (`dir`) and puts an arrow (▶ ◀ ▲ ▼) on the screen's edge
  along it, so the arrow moves smoothly round the edge as the player turns.
- **No camera** (an older host): the bearing from the game's own compass law (`bearing`, `screenX`) at a fixed height.
- **Behind a wall:** a `world.ray` from the eye to the spot; a hit more than 2 m short dims the diamond (`.behind`, 45%).
- **Label:** `distLabel(d)`: the distance alone, "420 m" or "1.9 km" (no time: the player found it irrelevant). "above -" / "below -" when the mark's floor is more than 2.5 m from the
  player's, only where the floor is known.
- **Colours:** the quest takes the player's look (`WAYPOINT_LOOKS`: gold, ivory, cyan, magenta, large). Any other kind takes
  its own Okabe-Ito colour and word (`MARK_KINDS`: pin, destination, exit, waypoint, place).
- **The compass's diamond:** on each `questMark` it asks `dfo.markColour(diamondColour(kind, look))`, only when the colour
  changes: the compass's own diamond and the waypoint's are one colour. Gold, nothing marked, or the waypoint off: `null`, the
  game's own gold.
- **Store:** `on`, `look`, and two fallbacks for a host with no camera: `fov` (65) and `height` (0.42 of the screen).

## guide-trail

Four files in `src/`, bundled by `scripts/buildModules.mjs`:

| File | Does |
| --- | --- |
| `setup.js` | the module: hears the mark and the frame, plans, draws, keys |
| `route.js` | the router (pure of the game: tests hand it a probe) |
| `embers.js` | the ember field: a pure function of a path and the clock; the looks (`GUIDE_STYLES`) |
| `fx.js` | draws the embers through the renderer's particle path (no shader or buffer of its own) |

### Planning the way (`route.js`)

1. **On the floor in sight** (`createRouter` + `planToMark`): a weighted A* on a 1 m grid, toward a goal up to 45 m away
   (`WINDOW_M`; a farther goal is approached in steps). A step is open when:
   - the floor is there and rises or falls no more than 1 m per metre (`SLOPE`), checked at the step's middle too, so a ramp
     passes and a ledge does not;
   - three waist-high rays (centre, and 0.35 m either side) pass through;
   - a diagonal step has both its sides open (no cutting corners).

   It runs for at most 6 ms a plan (`BUDGET_MS`) and keeps its answers, so the next plan costs next to nothing. When the goal
   is shut inside a building (the plan ends 4 m or more short) and the host gives `doors`, it plans to the nearest door that
   it can reach.
2. **Over the way the map knows** (`planKnown`), when the floor search does not reach the mark (another floor): a graph of the
   cells the player has walked (`world.known().walked`, "ix,y,iz" at half-metre heights) joined to neighbours up to 1.1 m
   higher or lower, including cells stacked in one column (a climb), plus the one-way steps taken (teleporters, drops) at a
   cost of 2 m each. A field is built once from the goal outward (rebuilt at most every 3 s while the map grows), so each plan
   is a walk down the field. Where the player's cell is not joined to the goal at all, `nearestReachable` leads to the
   reachable cell nearest the goal, stopping at the first step. It never shows a cell the player has not walked.
3. `setup.js` takes the known way when the floor search did not reach, and the known way reaches, or takes a step, or ends
   nearer the mark. Replans every 500 ms, or when the mark moves 3 m. A camera jump over 25 m drops what the router learned.

### Drawing (`embers.js`, `fx.js`)

- `trimAhead` cuts the next 30 m of the path ahead of the feet; embers sit every 0.6 m, flow at 1.4 m/s and fade near the goal.
- Each slot is a **pool** on the floor (normal blending, so it stays visible on snow) and a **spark** above it (additive glow).
- One particle effect for each, created on first use, written into one preallocated buffer; `dispose` frees both and the
  glow texture.


## pins

**State:** up to 8 places (`pins`, each `{ xz, map }`: a dropped pin or a map destination), the exit (`exit`), where the
player came into this place (`cameIn`, kept silently), the region map's followed waypoints (`ways`), and what the compass
follows (`active`: a pin's index, `QUEST`, `OUT` for the exit, or `'wp:<id>'`).

- **Following:** `follow(i)` calls `dfo.retarget(place, kind)`. A place is `[x, z]`, or `[x, z, y]` when its floor is known
  (the exit, a dungeon map's pin), and then it is reached only on that floor (within 2.5 m of height).
- **Reaching:** within 3 m (10 m for a region waypoint): "Reached ...", the place is removed (a waypoint is put aside) and the
  next is followed.
- **A new place:** a camera jump over 150 m clears pins and the exit (each scene has its own frame), except:
  - the open world's **tile step** (the whole frame moves by a multiple of 819.2 m, give or take 3 m): everything moves with it;
  - a **teleporter**: the jump lands within 6 m of a step's far end the map has just recorded.
- **The map** (`mapPick`): a click on the exit mark (`exit`), or near where the player came in (8 m), pins the exit - on the
  floor the player came in on. A map pin with a height (`dy`) keeps its own spot and floor; it is snapped to the floor under
  it, never to the exit. Anything else is the one map destination (a new click replaces it).
- **Region-map waypoints:** `world.waypoints()` every frame. A newly followed id is followed at once ("Following ... - X m");
  one unfollowed on the map is let go. A waypoint followed when the player goes inside is taken up again outside.
- **F1** (off) casts `world.ray` along the camera's forward (up to 120 m); a hit puts the pin 0.3 m short of it, a miss 25 m ahead
  along the ground.
- **F3** (off) cycles `[quest, exit?, ...pins, ...waypoints not put aside]`.
- **Dungeon pins:** `world.notes()` (the game's own pins on the dungeon map, read from the automap record) are synced into the
  pins each frame while `world.inDungeon()`; a pin the game no longer keeps is dropped. `world.questHidden()` hides the quest
  from the cycle in a dungeon below Exact guidance.
