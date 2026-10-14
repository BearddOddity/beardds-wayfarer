## What changed, and why

<!-- A few plain sentences. Link the issue if there is one. -->

## How I tested it

<!-- What you did in the game, and what you saw. -->

## Checklist

- [ ] The change is in `source/` (not only in `Mods/`), and I ran `npm run build`.
- [ ] `npm test` passes, and a test covers what I changed.
- [ ] Client-side only: nothing sent over the network, no files read or written, nothing the game hides is shown.
- [ ] Every word the player sees goes through `tx('module.<id>.<word>', 'English')`.
- [ ] Colour is never the only sign; nothing appears that the player did not ask for.
- [ ] New keys are defaults only, not one of the game's gameplay keys, and work only while the HUD is up.
- [ ] Docs updated for anything a player or developer would notice.
- [ ] I added myself to `CONTRIBUTORS.md`, and my contribution is my own work, under the repository's [LICENSE](../LICENSE).
