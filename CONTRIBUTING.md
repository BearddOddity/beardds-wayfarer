# Contributing to Beardd's Wayfarer

Thank you for helping. Beardd's Wayfarer is an accessibility mod, made so that more people can find their way in DFO
Online. These rules keep it that way.

Beardd's Wayfarer was created by **Beardd (BearddOddity)**, who decides what goes in.

## Before you start

- **Small fix** (a typo, a clear bug): open a pull request.
- **Anything bigger** (a new feature, a change to how something works): open an issue first and describe it. Wait for a yes
  before you spend time on it.
- **Bugs**: open an issue with what you did, what you expected, what happened, and the game version. Add a screenshot if
  you can.
- **Security problems** (anything that could hurt a player's computer or account): do not open a public issue. Contact
  Beardd directly through GitHub.

## How to send a change

1. Fork the repository and make a branch from `main`, named for the change (`fix-pin-floor`, `add-sound-cue`).
2. Install once: `npm install` (Node.js 22 or newer).
3. Make the change in `source/` (never in `Mods/`, which is built).
4. Add or update a test in `test/wayfarer.test.js` for what you changed.
5. Run `npm test` and `npm run build`. Both must pass. Commit the rebuilt `Mods/` with your change.
6. Play-test it in the game: `Install.cmd`, then try what you changed.
7. Open a pull request. Say what changed, why, and how you tested it. Fill in the checklist.

Do not change `version` in `package.json` or add a CHANGELOG entry: Beardd does that when releasing.

## Rules for the mod's code

These are what make the mod safe, fair and accessible. A pull request that breaks one will not be merged.

**Safe and fair**
- **Client-side only.** The mod reads what the game already shows and draws on the player's own screen. Never send anything
  over the network, never read or write files, never change what other players see.
- **No cheating.** Nothing that shows what the game hides (enemies through walls, loot, unexplored maps) or plays for the
  player. The trail only uses the way the player's own map knows.
- **Never touch the game's install folder.** The mod lives in the player's `Mods` folder only.
- **No new runtime dependencies.** A module is one file the game loads; keep it that way.

**Accessible**
- **Colour is never the only sign.** Every coloured mark also has a word or a shape.
- **Nothing appears that the player did not ask for**, and the game's own quest rules stay (the player still finds a quest's
  town themselves).
- **Every word goes through `tx('module.<id>.<word>', 'English')`**, so it follows the game's language. Short, plain English:
  one idea per message.
- **Keys are only defaults.** Never on one of the game's gameplay keys; only active while the HUD is up; every action has a
  label for the keys panel.
- **Keep it calm on screen.** Small, out of the middle of the view, no flashing.

**Built to last**
- Use only the Mod API's interface 1 (`api: 1`): its events and handle members. If the mod needs something new from the game,
  open an issue - it is a change to the game, made with its developers.
- No module reads another. They meet only at the compass's mark.
- Match the code around you: its naming, comment style and size.

## Writing docs

- Short sentences, plain words, one idea each. Many readers have dyslexia or read in a second language.
- Lead with what to do. Use lists and small tables rather than long paragraphs.
- Keep `docs/` in step with any change a player or developer would notice.

## Being a good neighbour

Be kind and patient. Explain instead of judging. Disagree with ideas, never with people. Harassment or abuse of any kind
gets you removed from the project.

## Credit and licence

- Your contribution is licensed under the same terms as the rest of the repository (see [LICENSE](LICENSE)): free, shareable
  and changeable, never sold, crediting Beardd as the original creator.
- You must have the right to contribute it: your own work, not copied from somewhere that does not allow it.
- Every merged contributor is credited in [CONTRIBUTORS.md](CONTRIBUTORS.md). Add your name there in your pull request.
