# Review checklist

A point-by-point list for reviewing Beardd's Wayfarer and its Mod API. Tick each box as you check it.

## 1. The Mod API (game source)

- [ ] **Manifest:** `parseManifest` refuses unknown fields, a bad slug, a bad version, `api` below 1, no events, an unknown
      event, a listed-twice event, an entry outside the module's folder, a malformed `sha256`.
- [ ] **Interface, not build:** a module names `api`, never a game build. A module for a newer interface is refused with the
      reason; one cannot list an event that arrived after its own `api`.
- [ ] **Event table:** `MOD_EVENTS` is pinned name by name and argument by argument in `test/mods1_api.test.js`.
      `mapPick` gained `exit` and `dyMetres` at its end, under the append-only rule.
- [ ] **Handle:** exactly `api, id, markColour, on, onKey, retarget, say, store`, frozen. No network, disk or cross-module door.
- [ ] **retarget / markColour:** the last ask by an enabled module wins; a switched-off module asks no more; junk or `null`
      gives the game's own back.
- [ ] **Isolation:** a throwing listener is caught and named once; 25 failures switch its module off for the session.
- [ ] **Host:** a module switched off is never imported; the folder must equal the id; a second module with one id is
      refused; the `sha256` is checked; each failure is one report row and the others run.
- [ ] **Shell door** (`app/lib/moduleFiles.cjs`): reads only `<user data>/Mods/<slug>/<plain>.js` and `module.json`,
      size-capped; nothing past them.
- [ ] **Seams:** each event is announced at its seam, pinned by source in the tests: `enhancedHud` (questMark), `hostMagic`
      (drawFx), `questBridge` (quests), `heldMap` (mapPick). An event nobody listens to costs one `has()` lookup.
- [ ] **Words:** `dfo.t(key, en, args)` reads the game's `t`; English where there is no row, or no text core. Every word the three modules show goes through it (a test reads them).
- [ ] **Client-side only:** `modApi.js` imports nothing of `net/`; no wire or relay change.

## 2. Keys

- [ ] Module keys: F2, F3, F4, F7 and Shift with F2, F3, F4. None is a gameplay default (`src/systems/inputActions.js`);
      a test fails on a clash.
- [ ] Every module key does nothing unless the HUD drew in the last 400 ms (menus, dialogs, maps use F1-F8 themselves).
- [ ] Keys never fire from a text field, with Ctrl, Alt or Meta, or on repeat.
- [ ] Keys panel (Shift+F1, `src/mods/keysPanel.js`): a choice is kept (`dfjs-module-keys`) and works at once; a clash is
      refused by name; Shift+F1, Escape, Tab, Enter, Backspace are never given; the panel's words are in every locale.

## 3. The modules

- [ ] **waypoint:** projected with the renderer's own matrices, 2.4 m over the mark's floor; edge arrow along the view-space
      direction; dim behind a wall; the distance alone ("420 m"), no time; "above"/"below" only where the floor is known; kind colours
      with words; the compass's own diamond takes the same colour (gold and off: the game's own); hides when the HUD stops.
- [ ] **guide-trail:** leads only to the compass's mark. Router: 1 m grid, slope 1:1 with the middle checked, three waist rays,
      no corner cutting, 6 ms budget, door routing when the goal is shut in. Known way: walked cells and steps only, stacked
      climbs, nearest reachable cell when not joined. Pools stay visible on bright floors. It colours nothing on the compass.
- [ ] **pins:** 8 pins at most; F3 order quest, exit, pins, waypoints; reach 3 m (10 m for a waypoint) on the place's floor; a
      150 m jump clears places except the open world's tile step and a teleporter's landing; the exit only once the player
      pins it, on the floor they came in on; a dungeon map's pin keeps its own spot and floor.

## 4. Quest guidance changes (game behaviour, separable from the API)

- [ ] `questLens.js` `personSiteOf`: an entry that says a person's building (`__`) or town (`___`) points at where they stand;
      never the questor; never a person the quest is done with.
- [ ] `questGuidance.js` `personDealtWith`: a person all of whose click-waiting tasks have fired is not marked on Exact.
- [ ] `questLens.js` `seek` + `questMarks.js`: a town the entry names but the map lacks is ringed on the region map for the
      tracked quest only; the compass still waits.

## 5. The dev-review loader

- [ ] `launch.mjs` starts the game with `--inspect-brk` (127.0.0.1 only), requires `loader/main.cjs` into the main process,
      resumes, and the loader closes the inspector 4 s later.
- [ ] `loader/main.cjs` wraps `dagger://` only: one `<script>` for the core; module files only from the Mods folder by slug
      and plain name; hooks only for the events installed modules list.
- [ ] `core/hooks.cjs`: every hook anchored on property names; optional hooks never switch a module off; the quest-guidance
      hooks are marked as changing game behaviour.
- [ ] `Check hooks.cmd` passes against the current game, or names exactly what moved.

## 6. Verified live

| Date | Game | What |
| --- | --- | --- |
| 2026-10-13 | 0.1.8525 | Loader runs, every hook applied. Town map right-click: flag, "Destination set - 46 m", compass diamond, waypoint, embers along the road. |
| 2026-10-14 | 0.1.8525 | Test Room (Privateer's Hold): trail from floor 0 up a climb to a pinned exit, "Reached the exit". Dungeon map pins stay where placed, on their floor. The waypoint's edge arrow moves smoothly. |
| 2026-10-14 | 0.1.8525 | Outdoors: region-map waypoint "Following Waypoint 1 - 1914 m", kept across the open world's tile step, "Reached Starting city"; embers lie on a hillside. |
| 2026-10-14 | 0.1.8525 | Quest "The Ransom" in Eastwick: the compass marks "The Copperfield Residence" (the person's building); the agent's diamond goes after speaking with them. |

## 7. Not verified live yet

- [ ] After speaking with the agent, the **building's mark goes too** (fixed 2026-10-14, tests green).
- [ ] The **compass's diamond in the waypoint diamond's colour** (hotfix 1.1.1, 2026-10-14, tests green).
- [ ] The quest's town **highlighted on the region map** before the player has found it.
- [ ] The exit **through a teleporter**.
- [ ] The keys panel over the live game: the pointer is released, and Escape closes the panel without opening the game's menu.
- [ ] The trail's frame cost in a busy town.
- [ ] The waypoint's fallback position with a non-default Field of View (the `fov` store has no UI).

## 8. Known limits

- Places last for the scene (a door, a dungeon or travel clears them); they are not saved.
- On the released client through the loader there is no door list, so the trail stops at the nearest reachable cell when the
  goal is inside a building.
- Destinations are set on the dungeon's flat map only (the 3D map's right button turns the view). By choice.
- Module words go through the game's text core (`dfo.t`): English until the game's catalog takes in their keys (`l10nExtract` reads `src/` only today). On the dev-review loader they are always English (the released game's text core is out of reach).
- No module uses the `quests` event yet. It is part of interface 1 for future modules.
