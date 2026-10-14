# Installing Beardd's Wayfarer

## What you need

- The **DFO Online desktop app** (Windows). Modules do not run in a web browser.
- A game version **with the Mod API**. To check: open **Settings > Mods & files**. If you see a **Modules** section, your game
  has it.

> **The Mod API is not in the released game yet.** The DFO Online developers are reviewing it
> ([game-integration](../../game-integration/README.md)). Until it ships, the mod runs on the released game only through the
> [dev-review loader](../../dev-review/README.md), which is meant for developers and testers.

## Install

**The easy way:** double-click **`Install.cmd`** in the mod's top folder. It copies the three module folders into your
game's `Mods` folder and says where. Start the game afterwards (or restart it if it was running).

**By hand:** copy the three folders inside `Mods\` into your game's `Mods` folder:

```
%APPDATA%\Daggerfall JavaScript\Mods\
    guide-trail\     module.json, module.js
    pins\            module.json, module.js
    waypoint\        module.json, module.js
```

Paste `%APPDATA%\Daggerfall JavaScript` into the File Explorer address bar to open the game's data folder. Make a folder
called `Mods` there if there is none. (If you set `DAGGER_USER_DATA` for the game, use that folder instead.)

## Turn on the game's own quest help

The waypoint and the trail lead to whatever the game's compass marks, so the compass must mark something. In the game's
**Features** menu:

| Setting | Set it to | Why |
| --- | --- | --- |
| Skin | **Enhanced** | the compass the mod follows is the Enhanced skin's |
| Quest tracker | **On**, and track a quest from the journal | the compass marks the tracked quest |
| Quest marks | **On** | the compass shows quest marks at all |
| Quest guidance | **Exact** (or **Town**) | Exact marks people and things inside buildings and dungeons; Town marks the quest's building in town |

You do not need any of this for your own pins, destinations and region-map waypoints: they work with any quest setting.

## Check that it runs

1. Open **Settings > Mods & files > Modules**. You should see three rows, each **running**:
   - Beardd's Wayfarer: guide trail
   - Beardd's Wayfarer: pins
   - Beardd's Wayfarer: quest waypoint
2. In the game, press **F7**. The game says "Quest waypoint off". Press it again to turn it back on.

A row that says **refused** gives the reason. The usual ones are in [Troubleshooting](troubleshooting.md).

## Update

Get the new version and run **`Install.cmd`** again. It replaces the three folders with clean copies. Your settings, looks
and keys are kept: the game stores them, not the module folders.

## Uninstall

- **Switch a module off:** Settings > Mods & files > Modules, and turn its switch off. A module that is off runs no code at all.
- **Remove the mod:** run `Install.cmd -Uninstall` from a command prompt, or delete the three folders from the `Mods` folder.
  Your saves are not touched.

## Do not edit the installed files

Each installed `module.json` holds a fingerprint (`sha256`) of its `module.js`. If the file is changed, the game refuses to
run it, so a damaged or tampered file never runs. To change the mod, see [Maintaining](../developers/maintaining.md).
