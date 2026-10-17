# Maintaining

## Two owners, two homes

| Part | Owner | Home | Changed by |
| --- | --- | --- | --- |
| **The mod** (waypoint, guide trail, pins) | Beardd | **this repository**: `source/` | a commit here and a new release - **no game release, no game review** |
| **The Mod API** (the interface the mod is written against) | the DFO Online developers | the game's repository (`src/mods/`), offered to them as `game-integration/patches/` | a pull request to the game |

This split is what keeps the mod updatable after the review. The game ships the **interface**; the mod is a folder in the
player's `Mods` folder, written against interface `api: 1`. The interface is append-only, so every later game keeps running
it, and every new release of the mod runs on every game with the API. Nothing about the mod is inside the game.

## Changing the mod

You need **Node.js 22 or newer**. Once, in this folder:

```
npm install
```

Then, for each change:

1. Edit the module in `source/<id>/`: `source/waypoint/module.js`, `source/pins/module.js`, or `source/guide-trail/src/*.js`
   (the guide trail is several files, bundled into its `module.js` by the build).
2. Test it: `npm test` (`test/wayfarer.test.js`, every module driven through a fake handle and world probe).
3. Build it: `npm run build`. This writes `Mods/` (each entry's sha256 in its `module.json`), and bundles the guide trail.
4. Install it into your own game: `Install.cmd`. Play-test it (with the native game, or the [developer loader](../../developer/README.md)
   while the released game lacks the API).
5. Commit `source/`, `Mods/` and the test together.

Rules a module change keeps:

- **Words** go through `tx('module.<id>.<word>', 'English', args)` (the game's text core, `dfo.t`). A test refuses a bare
  string said to the player.
- **Keys** are only defaults, never a gameplay key of the game's, and work only while the HUD is up. A test checks both.
- **Events and handle members** are only those of interface 1. Using a newer one means raising `api` in `module.json`, and the
  mod then needs a game with that interface.

## Releasing a new version

1. `npm test` passes.
2. Raise `version` in `package.json` (`1.2.1` -> `1.2.2` for a fix, `1.3.0` for a new feature). `npm run build` writes it into
   every `module.json`, so the three modules always ship together.
3. Add the version's lines to `CHANGELOG.md`.
4. Commit, then tag and push:
   ```
   git tag v1.2.2
   git push --follow-tags
   ```
5. On GitHub, make a release from the tag (Releases > Draft a new release), and paste its CHANGELOG lines. Players download it
   and run `Install.cmd` again; their settings and keys stay.

## Changing the Mod API

Only when the mod needs something the game does not offer yet (a new event, a new handle member).

1. In the game source clone (`../daggerfall-js-source`, branch `mod-api`), add it the append-only way: a new event with its
   `since`, `MOD_API_VERSION` raised, the seam announcing it, a test pinning it, `bible/06-Systems/Mod-API.md` updated.
2. Commit there, then refresh this repository's copy of it: `node tools/sync.mjs` (the patch, and the developer loader's host).
3. **Before the merge:** the patch in `game-integration/` carries it. **After the merge:** open a pull request to the game with
   the new commit; the mod can use the new member only once a game release has it (`api: 2` in `module.json` keeps it off
   older games, with the reason shown).

## Tests of the API (game source)

```
node --test test/mods1_api.test.js test/guide1_questLens.test.js test/guide5_marks.test.js test/guide8_questguidance.test.js test/manifest.test.js
```

The game's own rules apply there: test counts in `bible/09-Testing/Testing.md`, the Port-Ledger row (MODS1), new player-facing
words through `t()` in every locale, mutant records (`node tools/mutate.mjs tools/mutants/guide8.json`). On a clean Windows
checkout about 36 tests fail for path reasons unrelated to this work: compare against the parent commit.

## After a game update (developer loader only)

Run **`developer\Check hooks (developers).cmd`**:

- `ok` - fine.
- `note ... (optional)` - an optional hook moved: its extra is lost (region waypoints, quest people), no module is switched off.
- `FAIL` - a required hook moved: the modules that listen to that event are switched off and named on screen.

To fix a moved hook, find the new shape of that code in the game's `resources\app.asar\dist\assets\*.js` and update its `find`
(and `needle`) in `developer/core/hooks.cjs`. Anchor on property names and strings, never minified variable names. Once the
game ships the Mod API, the loader and this check are no longer needed.

## Folders the tools expect

```
<folder>/
  daggerfall-js-source/      the game source (only for API changes and the developer loader's host)
  <this repository>/
  Daggerfall Online/         the installed game (for the developer loader and its check)
```

Each tool takes a flag for another place: `--source <folder>` (sync.mjs, build-core.mjs), `--game <folder>` or the `DFO_GAME`
environment variable (launch.mjs, check.cjs).
