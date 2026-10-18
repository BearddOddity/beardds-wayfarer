# Installing and running Beardd's Wayfarer

This page takes you from the download to playing with the mod. It answers where the mod's folder goes, what each file does,
and what to do after a game update.

## What you need

- The **DFO Online desktop app** (Windows). Modules do not run in a web browser.
- **DFO Online must have been started at least once.** That creates the folder the mod installs into.
- Nothing else. You do not need Node.js, a developer tool, or an account for the mod.

> **Current limit.** The Mod API, which lets a game run modules without any help, is not in the released game yet. The DFO
> Online developers are reviewing it ([details](../../game-integration/README.md)). Until it ships, the mod starts the game
> through its loader. The loader connects to the game's debug port on this computer (127.0.0.1) for about four seconds while
> the game starts, then closes it. Nothing is sent to any server. Once the Mod API ships, `Play Wayfarer.cmd` will only start
> the game and the loader will no longer be needed.

## Where to put the mod's folder

The mod's folder can go in **either** of two places. Both work. What matters is that the mod's folder and the game's folder
are next to each other, or the mod's folder is inside the game's folder.

**Option A: beside the game (the usual choice)**

```
Daggerfall\                       <- any folder you like
    Daggerfall Online\            <- the game: holds DFO Online.exe
    Beardd's Wayfarer\            <- the mod: holds Play Wayfarer.cmd and Install.cmd
```

**Option B: inside the game's folder**

```
Daggerfall\
    Daggerfall Online\            <- the game: holds DFO Online.exe
        Beardd's Wayfarer\        <- the mod: holds Play Wayfarer.cmd and Install.cmd
```

Both work with the same two files. `Play Wayfarer.cmd` looks in these places, in order, for the folder that holds
`DFO Online.exe`:

1. the folder named by the `DFO_GAME` environment variable, if you set one;
2. `Daggerfall Online` beside the mod's folder (option A);
3. the folder the mod's folder sits in (option B).

If you keep the game somewhere else, set `DFO_GAME` to the game's folder before you run `Play Wayfarer.cmd`.

Do not put the mod's folder inside its own `Mods` folder, and do not nest it deeper than the two layouts above.

## Install

1. **Get the mod.** Download `beardds-wayfarer-<version>.zip` from the mod's releases page.
2. **Extract it** to the place you chose (option A or B). Right-click the zip, choose **Extract All**, and point it at that
   folder. The result is a folder called `beardds-wayfarer-<version>`. Rename it to `Beardd's Wayfarer` if you like; the name
   does not matter to the mod.
3. **Start DFO Online once** from its own shortcut, then close it. This creates the folder the mod installs into.
4. **Double-click `Install.cmd`** in the mod's folder. It copies the five module folders into the game's data folder and says
   where they went. It does not change the game's own files.
5. **Double-click `Play Wayfarer.cmd`** to start the game with the mod. Press **PLAY** in the game's launcher as usual.

Where the modules end up:

```
%APPDATA%\Daggerfall JavaScript\Mods\
    guide-trail\     module.json, module.js
    pins\            module.json, module.js
    waypoint\        module.json, module.js
```

To open that folder, paste `%APPDATA%\Daggerfall JavaScript` into the File Explorer address bar. (If you set
`DAGGER_USER_DATA` for the game, that folder is used instead.)

## Turn on the game's quest help

The waypoint and the trail lead to whatever the game's compass marks, so the compass must mark something. In the game's
**Features** menu:

| Setting | Set it to | Why |
| --- | --- | --- |
| Skin | **Enhanced** | the compass the mod follows is the Enhanced skin's |
| Quest tracker | **On**, and track a quest from the journal | the compass marks the tracked quest |
| Quest marks | **On** | the compass shows quest marks at all |
| Quest guidance | **Exact** (or **Town**) | Exact marks people and things inside buildings and dungeons; Town marks the quest's building in town |

Your own pins, destinations and region-map waypoints work with any quest setting.

## Check that it runs

1. Open **Settings > Mods & files > Modules**. You should see five rows, each **running**:
   - Beardd's Wayfarer: Clairvoyance
   - Beardd's Wayfarer: guide trail
   - Beardd's Wayfarer: mod notice
   - Beardd's Wayfarer: pins
   - Beardd's Wayfarer: quest waypoint
2. In the game, open the spellbook. **Clairvoyance** should be there, from the **Beardd's Spells** pack. Cast it: the line over the game says which map registered (or "No direct path found" when you have not marked a place yet).

A row that says **refused** gives the reason. The usual ones are in [Troubleshooting](troubleshooting.md).

## Questions

**Should the mod go inside the game's folder or outside it?**
Either. Option A (beside the game) is the usual choice. Option B (inside) works too. Use whichever you like, as long as the
two rules above hold.

**I moved the mod's folder. Do I need to reinstall?**
Run `Install.cmd` once from its new place. Then `Play Wayfarer.cmd` finds the game again from the new folder.

**Do I have to run `Install.cmd` before every play?**
No. `Play Wayfarer.cmd` only starts the game. Run `Install.cmd` after you install a new version, and after a game update if
the modules show as refused.

**Does a DFO Online update remove the mod?**
No. The modules live in your data folder, not in the game's folder. If the game changes in a way the mod does not support, the
Modules rows say so and the troubleshooting page explains the fix.

**Does `Play Wayfarer.cmd` need Node.js or anything else?**
No. It runs the loader with the game's own built-in runtime.

**Where are my settings, looks and keys kept?**
In the game's own storage. Reinstalling the mod, or updating it, keeps them.

**Is the game's own folder changed?**
No. The mod only adds its folders to the data folder. `Uninstall.cmd` removes them again.

**Do I need to close the game before installing?**
Yes, to be safe. Install and update copy files the game may be using.

**Which file do I double-click?**
The usual order is `Install.cmd` once, then `Play Wayfarer.cmd` each time you play.

## Update

1. Download the new zip and extract it over the old folder, or to a new folder in the same place.
2. Double-click **`Install.cmd`**. It replaces the five module folders with clean copies.
3. Double-click **`Play Wayfarer.cmd`**.

## Uninstall

**The easy way:** double-click **`Uninstall.cmd`** in the mod's folder. It lists the folders it will remove and asks before
removing them. Restart the game afterwards if it was running.

| Removed | Never touched |
| --- | --- |
| the `waypoint`, `guide-trail` and `pins` folders in your data `Mods` folder - only when each really is this mod's (its `module.json` says "Beardd's Wayfarer") | any other module, even one in a folder with the same name |
| the `Mods` folder itself, only if nothing else is left in it | your saves, your character, the game's own files |

`Uninstall.cmd -Yes` skips the question (for scripts). Your looks and keys are kept in the game's own settings.

**Just switch it off:** Settings > Mods & files > Modules, and turn a module's switch off. A module that is off runs no code.

## Do not edit the installed files

Each installed `module.json` holds a fingerprint (`sha256`) of its `module.js`. If the file is changed, the game refuses to
run it, so a damaged or tampered file never runs. To change the mod, see [Maintaining](../developers/maintaining.md).

## For developers

Developers run the mod from source with the tools in [`dev-review`](../../dev-review/README.md): the loader, its self-check,
the loader log, and the update report.
