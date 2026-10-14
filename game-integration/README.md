# Putting the Mod API into DFO Online

**For the DFO Online developers.** This folder holds everything needed to give the game a **Mod API**, so that Beardd's
Wayfarer - and any module others write - runs in the released game with **no loader and no debugger**.

## In short

- `patches/` is the work as a series of commits on `main` of
  [Lattymoy/daggerfall-js-source](https://github.com/Lattymoy/daggerfall-js-source), cut from **`bc80d4eee8`** (Merge pull
  request #888).
- It adds a small, append-only interface for client-side modules, the seams in the game that announce its events, a Modules
  card in Settings, a keys panel, and three modules (`modules/`).
- **Nothing changes on the server.** No wire, no relay message, no `RELAY_VERSION` change. "Server side" for this work means
  your release pipeline: merge it into the client source and ship the client as you always do.
- With no module installed, the game behaves as before; each seam costs one lookup per frame.

## 1. Apply the patches

```
git clone https://github.com/Lattymoy/daggerfall-js-source.git
cd daggerfall-js-source
git checkout -b mod-api bc80d4eee8
git am --3way "<path to this repo>/game-integration/patches/"*.patch
npm ci
```

On a newer `main`, rebase the branch afterwards (`git rebase main`). The patches touch these areas:

| Area | Files |
| --- | --- |
| **New: the Mod API** | `src/mods/modApi.js`, `modBus.js`, `moduleHost.js`, `keysPanel.js`; `src/ui/modulesCard.js`; `app/lib/moduleFiles.cjs`; `scripts/buildModules.mjs` |
| **New: the modules** | `modules/waypoint`, `modules/guide-trail`, `modules/pins`, `modules/README.md` |
| **Seams (one call each, no behaviour change)** | `src/ui/enhancedHud.js` (questMark, compass colour), `src/scenes/hostMagic.js` (drawFx + world probe), `src/scenes/world.js`, `exterior.js`, `dungeonContext.js` (probe extras), `src/scenes/questBridge.js` (quests), `src/ui/heldMap.js`, `townSheet.js`, `automapSheet.js` (mapPick), `app/preload.cjs`, `src/main.js` (start-up), `src/ui/enhancedMenu.js`, `settingsMap.js` (the Modules card) |
| **Quest guidance fixes (behaviour change, separable)** | `src/ui/questLens.js` (`personSiteOf`, `seek`), `src/systems/questGuidance.js` (`personDealtWith`), `src/ui/questMarks.js` |
| **Words** | `locales/*/Port_Strings.csv` (the Modules card and keys panel, in all 25 locales) |
| **Records** | `bible/06-Systems/Mod-API.md` (the specification), Port-Ledger row MODS1, `bible/09-Testing/Testing.md`, `tools/mutants/*` |
| **Tests** | `test/mods1_api.test.js` (new), quest guidance tests (`guide1`, `guide5`, `guide8`), pins moved in `waypoints.test.js` and others |

## 2. Test it

```
node --test test/mods1_api.test.js test/guide1_questLens.test.js test/guide5_marks.test.js test/guide8_questguidance.test.js test/waypoints.test.js test/manifest.test.js
node tools/mutate.mjs tools/mutants/guide1.json
node tools/mutate.mjs tools/mutants/guide8.json
npm test
```

All the targeted tests pass on Windows. (A clean Windows checkout has about 36 unrelated failures from path separators;
compare against `bc80d4eee8`.)

To play the source build with your installed shell (single player, your own profile): `test-build.ps1` (or
**`Play the source build.cmd`**). It starts the dev server and points the shell at it through `DAGGER_DEV_URL`.

To install the bundled modules into a profile:

```
node scripts/buildModules.mjs --install "%APPDATA%\Daggerfall JavaScript"
```

Then **Settings > Mods & files > Modules** lists them, each **running**.

## 3. What to review

The specification is `bible/06-Systems/Mod-API.md`. The points that matter most:

1. **Client-side only.** `modApi.js` imports nothing of `net/` (a test reads it). A module reads what the page shows and
   draws on the player's screen.
2. **Trust.** A module runs with the page's reach: the API fixes the *shape* of its contact with the game (declared events,
   a frozen handle, no network or disk door), not a sandbox. The host checks an entry's `sha256` when the manifest has one,
   and the shell reads only inside `<user data>/Mods`. Decide whether you want only signed or bundled modules (see 4).
3. **Stability.** The interface is append-only. Every event is pinned at its seam by `test/mods1_api.test.js`, so a refactor
   that drops one fails a test. Raise `MOD_API_VERSION` only when you add an event.
4. **Performance.** An event nobody listens to costs one `has()` lookup. The guide trail plans within 6 ms every 500 ms and
   draws through the renderer's existing particle path.
5. **The quest guidance fixes** change what Quest guidance marks, for every player. They can be taken without the API, or
   left out.

A point-by-point list is in [docs/developers/review-checklist.md](../docs/developers/review-checklist.md).

## 4. Ship it

1. Merge the branch (or the parts you want) into `main` and release the client as usual. Nothing is needed on the relay.
2. Players install modules into `%APPDATA%\Daggerfall JavaScript\Mods\` (the Wayfarer's `Install.cmd` does it).
3. Your choices:

| Choice | How |
| --- | --- |
| **Modules stay optional** (simplest) | Ship the API only. Players install Beardd's Wayfarer themselves. |
| **Ship Beardd's Wayfarer with the game** | Copy `modules/<id>/` (without `src/`) into the user's `Mods` folder on first run, or add a second read-only modules root in `app/lib/moduleFiles.cjs`. Not implemented yet. |
| **Only trusted modules** | Make the host require a `sha256` from a list you publish, or a signature. The hook is `src/mods/moduleHost.js` step 5. Not implemented yet. |
| **Web build** | Modules start only where the desktop shell offers a Mods folder (`daggerShell.modules`); a browser tab has none. |

4. After the API ships, players no longer need the [dev-review loader](../dev-review/README.md).

## 5. Keeping it alive

- A new event: add it to `MOD_EVENTS` with `since`, raise `MOD_API_VERSION`, announce it at its seam, pin it in the test.
- Never rename an event or reorder its arguments; add arguments at the end only.
- Module authors read `bible/06-Systems/Mod-API.md`; [docs/developers/mod-api.md](../docs/developers/mod-api.md) is its short
  form.

Questions: Beardd ([BearddOddity](https://github.com/BearddOddity)).
