# Clairvoyance: the Wayfarer as a spell (plan)

Branch: `feature/clairvoyance-spell`. Nothing here is built yet. This plan is for review.

## Goal

Beardd's Wayfarer's path, waypoint and trail can be **cast like a spell**, in the spirit of Skyrim's Clairvoyance: a
spell that draws the path to the nearest objective while it lasts. Three requirements from the player:

1. **Castable.** It is a spell in the game's own magic: it can be bought, made at the spellmaker, and cast.
2. **Auto-equipped.** On install and on first load, the spell is put in the player's spellbook and ready slot. No menu work.
3. **Verified each log-in.** Every load, the mod checks the spell is present and usable. The result shows on the screen, using the
   line we already have (the notice). "Beardd's Wayfarer active - Clairvoyance ready", or the reason it is not.

## Constraints

- **Dev-review loader only.** The released game has no Mod API yet. Spell hooks run through `dev-review/` and need the game's
  internals. Anything that touches the spell must be dropped cleanly if the game changes.
- **Save safety.** Adding a spell to a player's spellbook writes to their save. It must be idempotent (added once), reversible,
  and never remove or reorder what the player already has.
- **Game updates break hooks.** The game has changed three times in one day (0.1.9381, 0.1.9434, 0.1.9524, 0.1.9543). Every
  hook must be checked by `Check hooks.cmd` after an update, and a failed hook must leave the module working without the spell.
- **Repo.** Work only on this branch. Merge to `main` after the in-game test passes.

## What exists already (on this branch, uncommitted)

| Piece | State |
|---|---|
| `source/clairvoyance/` module: path kinds (region, town, dungeon, quest), F5 hold, Shift+1–4, F8 toggle, F9 style | written, self-check passes, not tested in game |
| `dev-review/core/hooks.cjs`: 12 `drawFx:spell*` hooks (effect type 47, its words, kind, cost, shop) | written, all match once on 0.1.9543 |
| `dev-review/check.cjs`: accepts the optional spell hooks in the check | edited |

Open issue: the path module works without the spell, but the spell hooks assume effect type 47 is safe. Not yet proven.

## Design

### 1. The spell

Two ways to build it. **Decide which** (see Decisions):

- **A. New effect (type 47).** What the hooks do now. Needs the game to accept a new effect type in its cast and effect
  code. Most work; most fragile.
- **B. Reuse a premade effect.** Make the Wayfarer's spell out of an existing effect the game already casts safely (for example a
  detect or light effect), and only add the spell's name and cost. Fewer hooks; the effect's behaviour is the game's own, so the
  mod draws the path from its `kind`/`name`.

Recommendation: **B** first. It proves the spell is castable with the fewest hooks. Move to A only if B cannot carry the name.

### 2. Auto-equip (install and first load)

- The mod keeps a flag in its own store (`equipped`). On first load it is false.
- On first load the mod adds the spell to the player's spellbook through the game's own spellbook call, then sets `equipped`.
  If the game has no such call, the mod does nothing and says so (the verify step reports it).
- Install (`Install.cmd`) does not touch a save. It only copies files. The first load does the equip.
- On later loads the flag is set, so nothing is added twice. The verify step still checks the spell is there.
- **Open:** does the game expose a spellbook-add call to a script? Needs reading the game's spellbook code.

### 3. Verify each log-in

- On the first HUD frame of each game start (the same moment the notice shows), the module checks:
  1. the spell is in the spellbook;
  2. the path kind resolves (the quest, the waypoint, the exit, a door exists);
  3. the spell's effect is registered (the hooks applied).
- The notice line reports the result:
  - **"Beardd's Wayfarer active - Clairvoyance ready"** when all three pass;
  - **"Beardd's Wayfarer active - Clairvoyance off: <reason>"** otherwise, with the first failing step named.
- The notice keeps its F6 toggle. Verify runs every load, not only the first.

## Steps

1. **Read-only feasibility** (no edits). Confirm in the game source for `0.1.9543`:
   - how a spell is cast and its effect applied (does a premade effect of type 46/47 run safely?);
   - whether a script can add a spell to a player's spellbook, and how the ready slot is set.
   Output: a short note with the code locations.
2. **Choose A or B** from step 1.
3. **Spell hooks**, for the chosen design. Each one: matches once, optional, and the check reports it.
4. **Equip and verify** in the module: the first-load equip, the flag, and the log-in verify text on the notice.
5. **Self-check** (`Check hooks.cmd`) on 0.1.9543 with all hooks.
6. **In-game test** (user): see the checklist below.
7. **Commit in pieces** on this branch: path module; spell hooks; equip and verify; docs. Then merge to `main` once tested.

## In-game acceptance (the user checks)

- Install, then first load: the notice says "Clairvoyance ready".
- The spell is in the spellbook and the ready slot, with no menu work.
- Cast it: the path lights to the nearest place of the kind, and fades when the spell ends.
- Log out, log in: the spellbook is unchanged (no duplicate), and the notice says "ready" again.
- Remove the spell by hand, log in: the notice says why, and the rest of the mod still works.

## Risks

- **Save corruption.** Spellbook writes. Mitigation: idempotent add, flag check, no removals, test on a copy of the save first.
- **Game update.** Hooks stop matching. Mitigation: check each update; the notice reports "Clairvoyance off", the path module keeps working.
- **Key clashes** (F5, F8, F9, Shift+digits). Mitigation: rebind in Shift+F1; check the game's key list before release.
- **Quest, town, dungeon targets** are not verified. Mitigation: each kind says "No direct path seen" when it finds nothing.

## Rollback

Each piece is a commit on this branch. `main` does not change until the test passes. To drop the spell, revert the spell
commit and remove `Mods/clairvoyance`. The path module and the notice survive without the spell.

## Controls, two spells and settings (from the player)

**Choosing what the spell seeks.** Four kinds: **region**, **town and city**, **dungeon**, **quest**.
- **Hold** the Clairvoyance key and the four kinds **cycle**; let go to choose the one showing.
- Or **Shift + a number** picks a kind at once, from the **number pad or the top row**: Shift+1 region, Shift+2 town and
  city, Shift+3 dungeon, Shift+4 quest. Both rows work.
- Already in the module (`F5` hold, `Shift+Digit1..4`, `Shift+Numpad1..4`). Not yet tied to a cast.

**Two spells, one function.**
1. **Clairvoyance** (cast): cast it, and the path is drawn while the spell lasts. The lore way, for role-play.
2. **Clairvoyance, sustained** (toggle): the same path, but a toggle: on until switched off. "Customise" in the sense that
   the player picks how it behaves. It is a second premade spell the player can buy and equip beside the first.
- Everything else stays as is: the waypoint, guide trail and pins are untouched. The spells only point the compass.

**Settings in the menu we made.** The keys panel (Shift+F1) already lists the mod's actions. The spell settings go there:
- the kind keys (hold-to-cycle, Shift+number);
- which style is live (cast, toggle, or both), kept between sessions;
- the verify message on or off (shares the notice's F6 toggle).
- The player can rebind any of them in the panel, as with every other key of the mod.

## Decisions (made by the player)

1. **Spell design: A, with a fallback.** Try A, the new effect (type 47). If it ultimately fails, fall back to what is already
   built: the key-driven path module (F5 hold, Shift+number, F8 toggle, F9 style). That fallback needs no spell hooks.
2. **Second spell: yes, a second spell, and both are free.** The toggle is its own premade spell. Both are given to the
   player, not bought: no gold price in the shop. (Magicka cost is the game's own unless the player says otherwise.)
3. **Equip: both spells.** Added to the spellbook once on first load, flagged, never removed.
4. **Verify text: the existing notice line.** "Beardd's Wayfarer active - Clairvoyance ready", or the reason it is off.

## Step 1 result: feasibility (read on game 0.1.9543, no edits)

**A is feasible.** What the game's code shows:

- **An effect with a kind is applied generically.** In `mysticism` the cast loop looks up `kind = effectKinds[type,sub]`; when it
  finds one, it pushes an active effect `{ kind, roundsRemaining }` on the target and says the kind's message. Only when there
  is no kind does the effect count as `skipped` and do nothing. So adding `"47,255" -> clairvoyance` makes Clairvoyance a
  lasting effect with no new casting code. (Hooks `spellKind`, `spellMessage`, `spellBegin`, already written.)
- **The game already grants spells to the player by script.** Vampirism and lycanthropy do:
  `entity.spells.push({ ...spell, name, tag, custom: true, minimumCastingCost: true })`, guarded by
  `entity.spells.some(s => s.tag === TAG && s.name === name)`. A custom spell is saved with the character (the save clones a
  `custom` spell whole). That is the model for **auto-equip**: the same call, tag `wayfarer`, run once, idempotent.
  `minimumCastingCost: true` is the game's own way to make a granted spell cheap to cast: this is the "free" the player asked for.
- **The player entity is reachable.** The spell controller (`readySpell`, `recastSpell`, `applySpellToPlayer`) closes over the
  player entity. One hook can hang that controller on `globalThis.dfoCaster` with a `playerEntity()` accessor.
- **The premade spell factory exists.** The Mages Guild list builds Shared Cartography with `makeSpell({ slots, rangeType,
  element, name, icon, index })`. The hook `spellMade` already exposes the same builder as `globalThis.dfoClairvoyance`.

**Still unknown (only the game can tell):**
- the cost the game shows for a type-47 spell (the cost-table hook is written; the shown number is unchecked);
- whether the quest `target` carries `[x, z]`, the door list shape, and the dungeon exit: needs a log line in game;
- key clashes for F5, F8, F9 and Shift+number.

## Build list (after the go-ahead)

1. **Caster hook** (new): hang the spell controller on `globalThis.dfoCaster` with `playerEntity()`.
2. **Two premade spells**: `Clairvoyance` (cast) and `Clairvoyance, Sustained` (toggle), both from the spell factory, both
   `custom: true`, `minimumCastingCost: true`, no shop price. Both use the **one** Clairvoyance effect. The toggle spell
   carries a long duration, and the module treats it as "stay on until cast again" (a second cast ends it).
3. **Equip and verify in the module**: on the first HUD frame of each load, give both spells once (tag `wayfarer`), then check
   they are in the spellbook and the effect hooks applied.
4. **Notice line**: "Beardd's Wayfarer active - Clairvoyance ready", or "- Clairvoyance off: <reason>".
5. **Settings in the keys panel (Shift+F1)**: the kind keys, the style, the notice toggle.
6. **Self-check** extended: every new hook matches once; the module starts with and without the caster.
7. **In-game test** by the player (checklist above), on a copy of a save first.
8. **Fallback**, if A fails in game: drop the `drawFx:spell*` hooks (one revert). The key-driven path module still works.

## Revision after the player's answers (built)

- **One spell, with a customizer.** The enhanced spellbook builds its detail view from the page's own DOM, so the spell's
  description holds the setting (hook `spellPanel`). No second spell. The player chose "one spell with a customizer if it can".
- **The map marking is unchanged.** The player: "the map marking for all 3 maps can stay the same, we just need the spell
  effect". The nearest-place search and the kind keys (F5 hold, Shift+number) were dropped with their guessed data sources.
- **What the spell does.** It changes WHEN the Wayfarer's path shows, not where it leads: *Always* (default, as before), *Only
  while it lasts* (role-play), *Cast to turn on* (F8 ends it). The waypoint and guide trail ask `globalThis.dfoWayfarerGate`.
- **Fail-safe.** With no castable spell (a game build without the effect, or the spell removed) the gate never hides the path.
- **Give once, verify every load.** The module pushes the spell onto the player (tag `wayfarer`, `custom`,
  `minimumCastingCost`, as the game's vampirism does), flags it in its store, and checks it at each load. The notice line says
  "Clairvoyance ready" or "Clairvoyance off: <reason>".
- **Fallback.** Remove the `drawFx:spell*` hooks and the module's spell parts: the path module and notice work unchanged.

## Tested on the live game (0.1.9558, through a debug port)

| Check | Result |
|---|---|
| Spell given on first load, once; no duplicate on a restart | pass |
| Notice line: "Beardd's Wayfarer active - Clairvoyance ready" | pass |
| Cast through the game's own spell controller: the player gets a lasting `clairvoyance` effect (23 rounds, about 118 s) | pass |
| Setting "Only while it lasts": path hidden before the cast, shown during, hidden when the effect ends by itself | pass |
| Setting "Cast to turn on": the effect is kept lasting; F8 ends it and takes it off the player; a recast works | pass |
| Setting "Always": the path shows, with or without the spell | pass |
| Settings panel builds in the spell description (three buttons and a note) | pass (built by a direct call) |
| The spellbook hook puts the panel call after the effects and before the action buttons | pass (patched text read) |
| Spellbook window shown on screen | **not seen**: the game ignores keys sent by the test, so the book was not opened |
| Bugs found and fixed on the way | the first check ran before the game loaded and never retried; a refreshed or restored effect missed the "begin" hook, so the module now reads the player's active effects; F8 left a dead effect behind |

## Added after the first tests: icon, lore, colours, switches

- **Icon.** The player's reference art, as a 16 x 16 pixel sprite (the size of the game's own spell icons), drawn by
  `tools/make-clairvoyance-icon.mjs` (art in `source/clairvoyance/art/`, the bytes in the module). Two loader hooks
  (`spellIconBox`, `spellIconFrame`) hand it to the game for icon number 200; the module sets that number on the spell only when
  both hooks are in, and goes back to the game's own icon 21 when they are not.
- **The spell's page** (the module's panel in the spellbook) shows: the sprite and what the spell does; its lore (written for
  this mod, not copied from the wiki) and its credit, "Clairvoyance, created by Beardd's, from the mod Beardd's Wayfarer. A spell
  of Beardd's Spells."; the setting for when the path shows; Waypoint, Guide trail and Compass diamond each on or off; the
  waypoint's colour and the trail's colour. The spellmaker's description of the effect names the pack too.
- **The compass diamond** is the game's own quest mark on the compass (`.hud-quest`). It is hidden by one style rule, on its own,
  whatever the waypoint does.
- **Pack.** The spell carries `pack: "Beardd's Spells"` and `creator: "Beardd's"`, so later spells can join it.
- **Surface.** `waypoint` and `guide-trail` offer `globalThis.dfoWayfarer.{waypoint,trail}` (looks, on, word): the panel's only
  reach into them. Where a module is not installed its rows are not drawn.

## Keys and casts (after the player's answers)

- **The settings have no keys** while the spell is ready: the spell's page holds them (when the path shows; which map a plain cast
  follows; waypoint, trail, compass diamond and login reminder on or off; the colours). `waypoint`, `guide-trail` and `notice` register
  F7, Shift+F3, F4, Shift+F4 and F6 only when the Clairvoyance check has settled and the spell is **not** ready, so a game without the spell
  keeps its controls. The keys panel (Shift+F1) is the host's: it shows whatever is registered and does not open when nothing is.
- **Three maps, two ways to cast.** A plain cast (hotbar, spellbook) follows the map the player stands in: a dungeon's mark first (it never
  clashes with the town's), then the town and city's, then the region's; the page can fix the map instead. **Shift+1** casts the town and
  city's map, **Shift+2** the region's, **Shift+3** the dungeon's (top row or number pad): a real cast through the game, so it costs magicka.
- **The marks are the pins module's**, set as always (right-click the town or dungeon map, the region map's Follow, F1). `pins` offers
  `globalThis.dfoWayfarer.pins` (`marks`, `here`, `follow(map)`); `test/pins-surface.test.mjs` checks it against a stand-in host.
- **Overlays.** The line over the compass says which map registered ("Clairvoyance: Town and City - your destination, 120 m", or "No
  direct path seen"); the notice line reminds you the spell is installed. The other messages of these modules are gone while the spell is
  ready. The pins module's own lines stay until pins become a spell.
- **Not done yet:** the direct casts were not seen working on the live game with real marks (the spellbook was open while the test ran).
