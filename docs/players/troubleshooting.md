# Troubleshooting

## I see no waypoint and no trail

Check these in order:

1. **Is the mod running?** Settings > Mods & files > Modules: the three rows should say **running**.
2. **Are you playing, not in a menu?** The waypoint and trail hide in menus, dialogs, maps and loading screens.
3. **Does the compass mark anything?** Look at the compass strip at the top. No diamond there means the game marks nothing,
   so the mod has nothing to lead to. Track a quest (Quest tracker on, Quest marks on), or set your own place: right-click
   the map, or press **F1**.
4. **Is it switched off?** Press **F7** (waypoint) or **F4** (trail). The game says "on" or "off".
5. **Is the quest's town unknown to your map?** Then the compass waits by design. Open the region map: the quest's town is
   highlighted. Follow a waypoint there.

## The trail stops short, or leads to a wall

- In a dungeon, the trail can only use the way **your map knows**. Explore toward the place, then it finds the way.
- In a town, a quest inside a building: the trail leads to the nearest spot it can reach outside.
- The way is planned again every half second, so a moment after you move it catches up.

## The waypoint points at a place I already finished

The mod drops a quest person once every step that waited on talking to them is done. If a mark stays, the quest itself still
wants that person (for example, you must come back to them later). Check the journal.

## A key does nothing

- Keys work only while you are playing. Close the map or menu first.
- You may have changed it: press **Shift+F1** to see every action and its key.
- Ctrl, Alt and the Windows key are ignored with module keys, and a held-down key does not repeat.

## The Modules card says "refused"

| The card says | Fix |
| --- | --- |
| "module.js does not match the manifest's sha256" | A `module.js` was changed or damaged. Run `Install.cmd` again for clean copies. |
| "needs interface 2; this game has 1" | The module is newer than your game. Update the game. |
| "the folder is '...' but the manifest's id is '...'" | The folder name must match the module's id: `waypoint`, `guide-trail`, `pins`. |
| "module.json: not found" | The folder is missing its files. Run `Install.cmd` again. |
| A module from someone else has the same folder name | Only one module can use a folder name. `Uninstall.cmd` leaves another author's folder alone; move it aside by hand if you want the Wayfarer's. |
| "switched off" | You turned it off. Turn its switch on. |
| "failed 25 times" (in the game's console) | The module kept failing and switched itself off for this session. Restart the game; if it repeats, report it. |

## My looks or keys are back to the defaults

Looks and keys are kept in the game's own storage. Clearing the game's data resets them. Reinstalling the mod does not.

## Reporting a problem

Say what you did, what you expected, and what happened, and which game version (bottom of the launcher). A screenshot
helps. If you use the dev-review loader, send `dev-review\loader.log` too.
