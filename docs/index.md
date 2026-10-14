# Beardd's Wayfarer - documentation

Start here. Each page is short and stands on its own.

## For players

| Page | Read it to... |
| --- | --- |
| [Installing](players/install.md) | install, update or remove the mod, and check that it runs |
| [Using the mod](players/using.md) | find your way in dungeons, towns, the open world and on quests; every key and look |
| [Accessibility](players/accessibility.md) | see who the mod is for, what it does for each need, and what is still missing |
| [Troubleshooting](players/troubleshooting.md) | fix "I see no waypoint", "the trail is gone", "a key does nothing" |

## For developers

| Page | Read it to... |
| --- | --- |
| [Putting the Mod API into the game](../game-integration/README.md) | apply the patches, test them and ship them (the instructions for the DFO Online team) |
| [Architecture](developers/architecture.md) | see how the parts fit: the Mod API, the three modules, the dev-review loader |
| [The Mod API](developers/mod-api.md) | write a module: the manifest, the events, the handle, the world probe |
| [The modules](developers/modules.md) | understand how the waypoint, the guide trail and pins work inside |
| [The dev-review loader](../dev-review/README.md) | run the mod on today's released game, and understand its hooks and its risks |
| [Maintaining](developers/maintaining.md) | change a module, run the tests, sync this repository, check a game update |
| [Review checklist](developers/review-checklist.md) | review the work point by point, and see what is verified live and what is not |

## The repository at a glance

```
Beardd's Wayfarer/
  README.md               the front page
  Install.cmd             installs the mod (tools/install.ps1)
  Mods/                   THE MOD: waypoint/, guide-trail/, pins/ - copied into the game's Mods folder
  source/                 the modules' source (guide-trail is several files, bundled into its module.js)
  docs/                   this documentation
  game-integration/       the Mod API for the game: patches/ and how to apply and ship them
  dev-review/             the loader for today's released game (uses the game's debug switch; kept apart)
  tools/                  install.ps1, sync.mjs
```

## Words used in these pages

| Word | Means |
| --- | --- |
| **Module** | One folder in the game's `Mods` folder: a `module.json` (its name and what it listens to) and a `module.js` (its code). The mod is three modules. |
| **Mod API** | The small, stable interface the game offers modules: events (what the game tells a module) and a handle (what a module may ask). |
| **The compass's mark** | The diamond on the game's compass strip. The mod's waypoint and trail lead to whatever the compass marks. |
| **Place** | Something you follow instead of the quest: a pin, a destination, the exit, or a region-map waypoint. |
| **Hook** | In the dev-review loader only: a small change made in memory to the released game's code, so it can announce an event. |
