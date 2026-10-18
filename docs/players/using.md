# Using Beardd's Wayfarer

Since 1.5.0 the mod works as a spell. **Clairvoyance** is in your spellbook, from the **Beardd's Spells** pack, given once on
first load, with its own icon. It brings five modules together:

- **Beardd's Wayfarer: Clairvoyance**: the spell and its settings;
- **Beardd's Wayfarer: quest waypoint**: a diamond in the world over the place you are heading for, with the distance;
- **Beardd's Wayfarer: guide trail**: glowing embers along the way there;
- **Beardd's Wayfarer: pins**: places you choose yourself, on the maps;
- **Beardd's Wayfarer: mod notice**: a short line when a game starts.

All of them follow **the game's compass**. Whatever the compass marks - the tracked quest, or a place you chose - the waypoint
stands over it and the trail leads to it. There is only **one** trail at a time.

## Clairvoyance, the spell

Cast it from the hotbar or the spellbook. A cast swaps the compass to the mark of one of three maps, and a line over the game
says which registered, for example **"Clairvoyance: Dungeon - Pin, 12 m"**.

| Map | Marks it holds |
| --- | --- |
| **Town and City** | a destination you set on the town map, or a quest's location |
| **Region** | the waypoints you followed on the region map |
| **Dungeon** | the exit, and the pins and destinations you set on the dungeon map |

A plain cast uses **Automatic**: the map you are standing in. A cast leads to the **nearest** mark of that map. When the map
holds no mark, the line reads **"No direct path found"**: mark a place on the map first (below).

### The spell's page (settings)

Open the spellbook and read the Clairvoyance page. It holds the lore and every setting:

- **When the waypoint and the guide trail show:** **Always** (the default: everything as it was), **Only while it lasts** (the
  path shows while the Clairvoyance effect lasts), or **Cast to turn on** (a cast turns the path on, and a second cast turns it
  off).
- **Which map a plain cast follows:** **Automatic** (the default), **Town and City**, **Region** or **Dungeon**.
- **The waypoint, the guide trail, the compass's diamond and the login reminder:** each on or off.
- **The colours:** the waypoint's look (gold, ivory, cyan, magenta, or large) and the trail's.

If the spell cannot be cast (the game build lacks it, or it is not in the spellbook), the path is never hidden: a lost spell
never costs you the path.

## Marking the maps

### In a town or city

- Open the local map (**M**) and **right-click** a spot. A flag stands there, and the game says "Destination set - 46 m".
  Close the map, and the waypoint and trail lead there.
- **Right-click a quest's ring** on the map to set that quest's location ("Quest location set").
- **Right-click the flag** to remove the destination.

### In a dungeon

- **Pin a spot on the dungeon map:** open the map and **middle-click** to place the map's own pin, then **give it a name**.
  The trail leads to it, on its own floor. Clear its name to remove it. The game keeps these pins, so they are found again on a
  visit.
- **Pin the way out:** **right-click the exit mark** on the dungeon map (or middle-click a pin onto it). The compass, the
  waypoint and the trail lead you back out. Nothing about the exit shows until you ask for it.
- **Set a destination:** **right-click** anywhere on the dungeon's **flat** map. A flag marks it. Right-click the flag to
  remove it. (The 3D map uses the right button to turn the view, so destinations are set on the flat map.)
- A dungeon's pins clear when you leave the dungeon.

### In the open world (the region map)

- Open the region map (**V**), **right-click** a place and choose **Follow**. This is the game's own waypoint marker.
- Outdoors, the mod leads you there: "Following Waypoint 1 - 1914 m". The waypoint you followed last takes the compass.
- When you arrive (within about 10 m), the game says "Reached ..." and the compass goes back to the quest.
- When you go inside somewhere, the trail follows your quest there; when you come back out, it takes up your waypoint again.

Pins and destinations belong to the place where you set them. Going through a door, into a dungeon, or travelling clears them.
Teleporters inside a dungeon and walking across the open world do not. Walk within 3 m of a pin or destination and it is
**reached**: it is removed.

## The waypoint

- A diamond stands over the place, about a man's height above its floor. It shows the distance: **"420 m"**, or **"1.9 km"**
  far away.
- When the place is off to a side or behind you, an **arrow** waits at the edge of the screen and points the way to turn.
- When a wall stands between you and the place, the diamond is **dim**.
- When the place is on another floor of a dungeon, the label says **"above"** or **"below"**.
- Each kind of place has its **own colour and its own word**, so colour is never the only sign:

| Place | Colour | Label |
| --- | --- | --- |
| The tracked quest | your chosen look (gold by default) | "420 m" |
| A pin | sky blue | "Pin - 12 m" |
| A destination | purple | "Destination - 46 m" |
| The exit | teal-green | "Exit - 40 m" |
| A region-map waypoint | vermilion (orange-red) | "Waypoint - 1.9 km" |

**The diamond on the compass strip takes the waypoint diamond's colour**, so the two read as one: the look you chose for the
quest, or the place's own colour (a pin's sky blue, the exit's teal-green...). Gold keeps the game's own gold, and with the
waypoint off the compass is the game's own again.

## The guide trail

- Embers drift along the way to the place. The way goes **round walls and buildings**, **up hills, rubble and stairs**, and
  never through a wall.
- **Between a dungeon's floors**, the trail uses what **your own map knows**: the places you have walked, the stairs you have
  climbed and the teleporters you have taken. It never shows a way you have not found, so exploring still matters.
- When it cannot reach the place yet, it leads as close as it can.
- Ember pools on the floor stay visible on snow and pale stone.

## Quests

The mod helps you follow quests, but keeps the game's rule that **you ask around to find a town**:

- The compass leads only to **towns your map already knows**. When a quest names a town you have not found yet, the
  **region map highlights that town** with the quest's diamond. Find it, set a waypoint there (Follow), and walk.
- In the quest's town, the compass leads to the **building the journal names**.
- On **Exact** guidance, inside buildings and dungeons the compass marks the quest's people and things.

Not matched on the current game build: the building a person in the quest journal waits in, and clearing a person's mark once
you have dealt with them. The rest works without them.

## Keys are off for now

The **keys panel** (Shift+F1) and every module key are disabled. That means no key for the waypoint or trail on and off, their
looks, dropping a pin where you look (F1), following the next place (F3), removing the followed place (Shift+F2), or the notice
(F6). The code stays, so they can come back. Cast Clairvoyance from the hotbar or spellbook, and mark places on the maps with
the clicks above.
