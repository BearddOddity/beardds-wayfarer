# Beardd's Wayfarer

**An accessibility mod for DFO Online (Daggerfall Online) that helps you find your way.**

Daggerfall's world is huge, and its quest text often gives no directions. Beardd's Wayfarer shows you where to go:

- a **waypoint** diamond in the world over the place you are heading for, with the distance;
- a **guide trail** of glowing embers along the way there: round walls, up hills and stairs, and between a dungeon's floors;
- **pins and destinations** you set yourself: on the town map, on a dungeon map, on the region map, or where you look.

It runs only in your own game client. Nothing is sent to the server, and every key can be changed.

> **Status: in review with the DFO Online developers.** The mod is written for the game's **Mod API**, which is not in the
> released game yet. Until it is, the mod runs on the released game only through the [dev-review loader](dev-review/README.md).
> See [Installing](docs/players/install.md).

## Who is it for?

| Need / player type | How the mod helps | Status |
| :--- | :--- | :--- |
| **New players** | The waypoint and the trail stop you getting lost when quest text gives no directions. | Working. Tested live: dungeon floors (stairs, climbs), the exit, town destinations, region-map waypoints, quest buildings. |
| **Low vision** | High-visibility looks, a large waypoint, and ember pools that stay visible on pale and snowy floors. | About 95% |
| **Colour blindness** | Each kind of mark has its own Okabe-Ito colour, always with a word ("Pin", "Destination", "Exit", "Waypoint"). | About 85% |
| **Dyslexia and attention** | A plain distance ("420 m") replaces dense reading. | Done |
| **Limited reach / one hand** | Every key can be moved to any key you like (Shift+F1). | Under review |
| **Screen-reader and keyboard users** | The keys panel is a labelled dialog. Tab, Enter and Escape work, and each result is read out. | Done |

## Quick start

1. Install: double-click **`Install.cmd`**. It copies the three module folders into your game's `Mods` folder.
2. In the game's **Features** menu: use the **Enhanced** skin, turn on **Quest marks** and the **Quest tracker**, and set
   **Quest guidance** to **Exact**.
3. Play. Track a quest, or right-click a map to set a destination.

The full guide is in [docs/players/using.md](docs/players/using.md). To remove the mod, double-click **`Uninstall.cmd`**.

## Keys

Keys work only while you are playing (never in a menu, a dialog or a map). Press **Shift+F1** to change any of them.

| Key | Does |
| --- | --- |
| **F7** | Waypoint on / off |
| **Shift+F3** | Waypoint look: gold, ivory, cyan, magenta, large (the compass's diamond takes the same colour) |
| **F4** | Guide trail on / off |
| **Shift+F4** | Trail look: gold, ivory, cyan, magenta, large |
| **F2** | Drop a pin where you look (up to 8) |
| **F3** | Follow the next place: the quest, the exit, your pins and destinations, your region-map waypoints |
| **Shift+F2** | Remove the place you are following |
| **Shift+F1** | Change the keys |
| Right-click the **town** or **dungeon map** | Set a destination there (on a quest ring: the quest's location; on the dungeon's exit: the way out) |
| Middle-click the **dungeon map** | The map's own pin: name it, and it is followed on its own floor |
| **Follow** on the **region map** | The trail leads you to that waypoint outdoors |

## What is in this repository

| Folder | What it is | Who it is for |
| --- | --- | --- |
| [`Mods/`](Mods) | **The mod itself**: three module folders, ready to install | Players |
| `Install.cmd`, `Uninstall.cmd` | Install the mod (run again to update), and take it out cleanly ([`tools/`](tools)) | Players |
| [`docs/`](docs/index.md) | All the documentation. **Start at [docs/index.md](docs/index.md).** | Everyone |
| [`game-integration/`](game-integration/README.md) | The Mod API for the game, as one patch, with instructions for putting it into the game | Developers |
| [`dev-review/`](dev-review/README.md) | A loader that runs the mod on today's released game. It uses the game's debug switch, so it is kept apart from the mod | Developers, testers |
| [`source/`](source), [`test/`](test) | The mod's source and its tests (`npm test`, `npm run build`) | Developers |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed in each release | Everyone |
| [`tools/`](tools) | `install.ps1`, `uninstall.ps1`, `build.mjs` (source to `Mods/`), `sync.mjs` (the Mod API patch from the game source) | Maintainers |

## Updates

The mod lives here, not inside the game. The game offers a small, stable interface (the Mod API); the mod is written against
it, so **new versions of the mod need no game update and no new review**. Get a new release and run `Install.cmd` again: your
settings and keys stay. See [CHANGELOG.md](CHANGELOG.md).

## Safety

- **Client-side only.** The mod reads what your game already shows you and draws on your own screen. It sends nothing to
  anyone and changes nothing about online play for other players.
- **No game files are changed.** The mod lives in your own `Mods` folder.
- A module runs with the same reach as the game page. Install modules only from people you trust.

## Licence

Beardd's Wayfarer is **free**. You may use it, share it and change it - but never sell it, and every copy or changed version
must credit **Beardd (BearddOddity)** as the original creator. A changed version you share keeps these same terms. The legal
terms are Creative Commons BY-NC-SA 4.0 with a credit rule: see [LICENSE](LICENSE).

The Mod API patch for the game (`game-integration/`) is MIT, the game's own license, so the game can include it.

## Contributing

Bug reports, ideas and pull requests are welcome: read [CONTRIBUTING.md](CONTRIBUTING.md) first. Contributors are credited
in [CONTRIBUTORS.md](CONTRIBUTORS.md).

Created by **Beardd** ([BearddOddity](https://github.com/BearddOddity)).
