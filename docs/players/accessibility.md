# Accessibility

Beardd's Wayfarer is built for **new players** and for **players with access needs**. Daggerfall's world is large, and its
directions are hard to follow. A compass needle alone is not enough for many people.

## Who it helps, and how

| Player | What gets in their way | What the mod does | Status |
| --- | --- | --- | --- |
| **New player** | Quest text names a place, but not the way there | The waypoint shows the spot and the distance. The trail shows the route, across dungeon floors too. | Working, tested live |
| **Low vision** | The compass mark is small; gold is lost on snow and pale stone | Five looks for the waypoint and the trail, including a large one. Ember pools stay visible on bright floors. The compass mark can take the trail's bright colour. | About 95% |
| **Colour blindness** | Gold and orange are hard to tell from the ground; marks that differ only by colour | Each kind of place has an Okabe-Ito colour (a palette colour-blind players can tell apart) **and a word**: "Pin", "Destination", "Exit", "Waypoint". Cyan and magenta looks. | About 85% |
| **Dyslexia, memory or attention difficulties** | Long directions in quest text are hard to hold in mind | The trail and the distance replace reading. "420 m" says how far, and nothing more. Short, plain messages. | Done |
| **One hand, or limited reach** | F-keys may be out of reach, or clash with your own setup | Every action can be moved to any key (Shift+F1). | Under review |
| **Screen-reader or keyboard user** | Pop-up panels that need a mouse | The keys panel is a labelled dialog. Tab, Enter and Escape work, and each result is read out. | Done |
| **Anyone in a town or a dungeon** | "Go to the inn" with no way to mark it | Right-click the town map or the dungeon map to set a destination. | Done |

## Design rules the mod keeps

- **Colour is never the only sign.** Every coloured mark has a word.
- **Nothing appears that you did not ask for.** The exit shows only once you pin it; the trail uses only the way your own map
  knows, so it never spoils a dungeon.
- **The game's own quest rules stay.** The compass still waits until you have found a quest's town; the mod only highlights
  that town on the region map so you know where to look.
- **Keys are yours.** A module only suggests a key. You can change any of them, and a clash is refused by name.
- **Nothing fires in a menu.** Module keys work only while the game is being played, so they never clash with menus,
  dialogs or maps.

## Not done yet

- The mod's words follow **the language you chose for DFO**: they come from the game's own translations. Until the game's
  translations include the mod's words, they show in English. The mod ships no translation files of its own.
- Pins and destinations last only until you leave the place (a door, a dungeon, travel). They are not saved.
- There is no sound cue yet for arriving or for the direction of the place.
- A text-only mode (the distance and direction read out, with no diamond) would help screen-reader users in the world itself.

Ideas and reports are welcome: see [Troubleshooting](troubleshooting.md) for how to report a problem.
