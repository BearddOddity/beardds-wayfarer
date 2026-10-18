# Beardd's Wayfarer

**An accessibility mod for DFO Online (Daggerfall Online) that helps you find your way.**

Daggerfall's world is huge, and its quest text often gives no directions. Beardd's Wayfarer shows you where to go. Since 1.5.0
it works as a spell: **Clairvoyance**, in your spellbook, from the **Beardd's Spells** pack. Cast it and the compass swings to a
mark on the **Town and City**, **Region** or **Dungeon** map, and the mod shows you the way:

- a **waypoint** diamond in the world over the place you are heading for, with the distance;
- a **guide trail** of glowing embers along the way there: round walls, up hills and stairs, and between a dungeon's floors;
- **pins and destinations** you set yourself: on the town map, on a dungeon map, or on the region map.

It runs only in your own game client. Nothing is sent to the server.

> **Status: in review with the DFO Online developers.** The mod is written for the game's **Mod API**, which is not in the
> released game yet. Until it is, the mod runs on the released game only through the [developer loader](dev-review/README.md).
> See [Installing](docs/players/install.md).

## Who is it for?

| Need / player type | How the mod helps | Status |
| :--- | :--- | :--- |
| **New players** | The waypoint and the trail stop you getting lost when quest text gives no directions. | Working. Tested live: dungeon floors (stairs, climbs), the exit, town destinations, region-map waypoints, quest buildings. |
| **Low vision** | High-visibility looks, a large waypoint, and ember pools that stay visible on pale and snowy floors. | About 95% |
| **Colour blindness** | Each kind of mark has its own Okabe-Ito colour, always with a word ("Pin", "Destination", "Exit", "Waypoint"). | About 85% |
| **Dyslexia and attention** | A plain distance ("420 m") replaces dense reading. | Done |
| **Limited reach / one hand** | Clairvoyance is cast from the hotbar or the spellbook, with no key to hold. (The module keys and the keys panel are off for now.) | Under review |
| **Screen-reader and keyboard users** | Results show as a line over the game, and the notice line is a labelled status. The keys panel (a labelled dialog) is off for now. | Partly |

## Quick start

1. Install: read [Installing and running](docs/players/install.md) for where to put the mod's folder (beside the game, or inside it), then double-click **`Install.cmd`** (once, and again after each update).
2. Play: double-click **`Play Wayfarer.cmd`**. It starts the game with the mod.
3. In the game's **Features** menu: use the **Enhanced** skin, turn on **Quest marks** and the **Quest tracker**, and set
   **Quest guidance** to **Exact**.
4. Play. Track a quest, or mark a map (below), then cast **Clairvoyance** from the hotbar or the spellbook.

The full guide is in [docs/players/using.md](docs/players/using.md). To remove the mod, double-click **`Uninstall.cmd`**.

## Casting Clairvoyance

Clairvoyance is in your spellbook from the first load, with its own icon. Cast it and the compass swings to a mark on one of
three maps. The message reads, for example, "Clairvoyance: Dungeon - Pin, 12 m". "No direct path found" means the map holds no
mark yet.

| Map | Marks it holds |
| --- | --- |
| **Town and City** | A destination you set on the town map, or a quest's location |
| **Region** | A waypoint you followed on the region map |
| **Dungeon** | The exit, and the pins and destinations you set on the dungeon map |

A plain cast uses **Automatic**: the map you are standing in. The Clairvoyance page in the spellbook holds the lore and the
settings: when the waypoint and the guide trail show (always, only while the spell lasts, or cast to turn on), which map a plain
cast follows, and the colours.

## Marking the maps

| Do | Result |
| --- | --- |
| Right-click the **town map** (M) | A destination there (on a quest ring: the quest's location). Right-click the flag to remove it. |
| Right-click the **dungeon map** (flat map) | A destination there. Right-click the exit mark for the way out. |
| Middle-click the **dungeon map** | The map's own pin: name it, and cast to it. Clear its name to remove it. |
| **Follow** on the **region map** (V) | The trail leads you to that waypoint outdoors. |

## Keys are off for now

The Shift+F1 keys panel and every module key are disabled (the waypoint, trail and notice keys, pin dropping, and the cycle
through places). The code stays, so they can come back. Cast Clairvoyance from the hotbar or spellbook.

## What is in this repository

| Folder | What it is | Who it is for |
| --- | --- | --- |
| [`Mods/`](Mods) | **The mod itself**: five module folders (Clairvoyance, quest waypoint, guide trail, pins, mod notice), ready to install | Players |
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
