# Beardd's Wayfarer

An accessibility mod for **DFO Online**. It shows you where to go: **Clairvoyance** is a spell in your spellbook that draws a
thread of light to the place your quest or your map marks, with a compass waypoint, pins and a guide trail.

## Install (once)

1. Start **DFO Online** once, then close it. That creates the game's data folder.
2. Put this folder **beside** the game's folder (`Daggerfall Online`), or **inside** it.
3. Run the installer:
   - **Windows:** double-click `Install.cmd`.
   - **Linux and macOS:** open a terminal in this folder and run `"./Linux and macOS/install.sh"` (if it will not run,
     `chmod +x "Linux and macOS"/*.sh` once).

## Play

- **Windows:** double-click `Play Wayfarer.cmd`, then press PLAY in the game's launcher.
- **Linux and macOS:** run `"./Linux and macOS/play-wayfarer.sh"`.

Start the game this way each time you want the mod. Starting it from its own shortcut plays the game as shipped.

## Update

Download the new version, replace this folder, and run the installer again. Your settings stay.
After a **game update**, if the mod stops working, check [the releases page](https://github.com/BearddOddity/beardds-wayfarer/releases)
for a hotfix.

## Remove

`Uninstall.cmd` (Linux and macOS: `"Linux and macOS/uninstall.sh"`). Your saves are never touched.

## What is in this folder

| | |
| --- | --- |
| `Install.cmd`, `Play Wayfarer.cmd`, `Uninstall.cmd` | Windows: double-click |
| `Linux and macOS/` | The same three, as shell scripts |
| `Mods/` | The mod itself: five modules |
| `Loader/` | What the launchers run to start the game with the mod. Leave it alone |
| `docs/` | Install help, how to use it, troubleshooting, accessibility notes |
| `CHANGELOG.md`, `LICENSE` | What changed; the terms (free to share and change, never sold, credit Beardd) |

If something goes wrong, read `docs/troubleshooting.md`, then `Loader/loader.log`.

Made by Beardd (BearddOddity).
