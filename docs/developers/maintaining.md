# Maintaining

## Where the mod is written

The modules are written and tested in the **game source**, on the branch `mod-modules` of a clone of
[daggerfall-js-source](https://github.com/Lattymoy/daggerfall-js-source) (folder `modules/`). This repository is the
release: `Mods/`, `source/` and `game-integration/patches/` are **generated** from that branch by `tools/sync.mjs`. Do not
edit them here.

The expected layout on disk:

```
<folder>/
  daggerfall-js-source/      the game source, on mod-modules (npm ci done once)
  Beardd's Wayfarer/         this repository
  Daggerfall Online/         the installed game (for the dev-review loader and its check)
```

Each tool takes a flag for a different place: `--source <folder>` (sync.mjs, build-core.mjs), `--game <folder>` or the
`DFO_GAME` environment variable (launch.mjs, check.cjs).

## Changing a module

1. Edit it in the game source: `modules/<id>/module.js` (or `modules/guide-trail/src/*.js`).
2. Build and install it into your own game:
   ```
   node scripts/buildModules.mjs --install "%APPDATA%\Daggerfall JavaScript"
   ```
3. Run its tests (below). Play-test it (with the source build or the dev-review loader).
4. Raise its `version` in `module.json` when you release it.
5. Commit on `mod-modules`, then sync this repository (below).

## Tests (game source)

```
node --test test/mods1_api.test.js test/guide1_questLens.test.js test/guide5_marks.test.js test/guide8_questguidance.test.js test/waypoints.test.js test/manifest.test.js
```

- `test/mods1_api.test.js` covers the Mod API (manifest, version law, event table, bus, handle, host, keys, seams) and the
  three modules (pins, the router, the known way, the looks, the region waypoints, the compass colour).
- The game's own rules apply to every change: the test counts in `bible/09-Testing/Testing.md` (`test/manifest.test.js`
  checks them), the Port-Ledger row (MODS1), new player-facing words through `t()` in every locale (the l10n ratchet).
- **Mutants:** `node tools/mutate.mjs tools/mutants/<file>.json` breaks each recorded line and expects a test to fail. Run it
  for the quest guidance records (`guide1.json`, `guide8.json`, `sd20g.json`). (`--jobs` does not work on Windows.)
- On a clean Windows checkout about 36 tests fail for path reasons unrelated to the mod (for example `hudclass_sheets`).
  Compare against the parent commit before you blame a change.

## Syncing this repository

After committing on `mod-modules`:

```
node tools/sync.mjs
```

It refuses to run on uncommitted source. It rebuilds `Mods/` (with each entry's sha256), copies `source/`, writes
`game-integration/patches/` (the branch as patches on `origin/main`; `--base <ref>` for another base) and rebuilds the
dev-review loader's host (`dev-review/core/core.js`, `modapi.mjs`). Then review the diff and commit here.

## After a game update (dev-review loader)

Run **`dev-review\Check hooks.cmd`**. Each hook must match exactly once:

- `ok` - fine.
- `note ... (optional)` - an optional hook moved: its extra is lost (for example, region waypoints or quest people), and no
  module is switched off.
- `FAIL` - a required hook moved: the modules that listen to that event are switched off and named on screen.

To fix a moved hook, find the new shape of that code in the game's `resources\app.asar\dist\assets\*.js` and update its
`find` (and `needle`) in `dev-review/core/hooks.cjs`. Anchor on property names and strings, never on minified variable
names. Run the check again. Nothing else needs rebuilding.

## Releasing

1. Tests and mutants green in the game source; the dev-review check green against the current game.
2. Bump the module versions; commit on `mod-modules`; `node tools/sync.mjs`.
3. Update the status table in `README.md` and `docs/developers/review-checklist.md` with what was verified live.
4. Commit here and push.
