# Mod update report

Run 2026-10-17T10:50:58.600Z. Game folder `D:\My Games\GOG Games\Daggerfall\Daggerfall Online`. Game source `D:\My Games\GOG Games\Daggerfall\daggerfall-js-source`, base `origin/main`.

## Steps

| Step | Result | Detail |
| --- | --- | --- |
| rebase onto base | skipped | --skip-git |
| sync patches and core | ok |  |
| loader self-check | ok |  |
| npm test | ok |  |
| npm run build | ok |  |

## Loader self-check

### Loader report: DFO Online 0.1.9381

Checked 2026-10-17 against `D:\My Games\GOG Games\Daggerfall\Daggerfall Online`. All checks passed.

## Hooks that need a new pattern

None.

## Optional hooks not found (their extra is off, no module is turned off)

- `questMark:seek`
- `questMark:person`
- `questMark:dealtPeople`
- `questMark:seekMap`
- `drawFx:outdoors`

## Other problems

None.

## What to do next

Nothing: the mod matches the game. Commit it when you like, and run with --install to update the player copy.
