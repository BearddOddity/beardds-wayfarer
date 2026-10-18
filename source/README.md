# The mod's source

Edit the mod here. `npm run build` turns this folder into `../Mods/`, the folders players install.

| Folder | Module | Listens to | Entry |
| --- | --- | --- | --- |
| `waypoint/` | the quest waypoint | `questMark`, `drawFx` | `module.js` (one file) |
| `guide-trail/` | the guide trail | `questMark`, `drawFx` | `src/setup.js`, bundled with `src/route.js`, `src/embers.js`, `src/fx.js` into `module.js` |
| `pins/` | pins and destinations | `mapPick`, `questMark`, `drawFx` | `module.js` (one file) |
| `notice/` | the mod notice (a line at start) | `drawFx` | `module.js` (one file) |
| `clairvoyance/` | the Clairvoyance spell and its setting | `questMark`, `drawFx` | `module.js` (one file) |

Each folder is one module: a `module.json` (its id, name, version, the interface `api` it was written for, and the events it
listens to) and a `module.js` whose default export is `setup(dfo)`. They are written against the game's **Mod API**,
interface 1 - see [docs/developers/mod-api.md](../docs/developers/mod-api.md) - and none reads another: they meet only at the
game's compass mark.

- `guide-trail/module.js` is **generated** from `guide-trail/src/` by the build. Edit the files in `src/`.
- Every module's `version` is set from `package.json` by the build: all of them always ship together.
- How each works inside: [docs/developers/modules.md](../docs/developers/modules.md).

```
npm test          the modules' tests (test/wayfarer.test.js)
npm run build     source/ -> Mods/, with each entry's sha256
```
