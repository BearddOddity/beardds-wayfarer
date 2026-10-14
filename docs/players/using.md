# Using Beardd's Wayfarer

The mod has three parts, and they work together:

- the **waypoint**: a diamond in the world over the place you are heading for, with the distance;
- the **guide trail**: glowing embers along the way there;
- **pins**: places you choose yourself.

All three follow **the game's compass**. Whatever the compass marks - the tracked quest, or a place you chose - the waypoint
stands over it and the trail leads to it. There is only **one** trail at a time. **F3** changes which place it follows.

## The waypoint

- A diamond stands over the place, about a man's height above its floor. It shows the distance, and while you walk, the time
  at your own pace: **"420 m - 2 min"**.
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

**F7** turns the waypoint on or off. **Shift+F3** changes its look: gold, ivory, cyan, magenta, or large.

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

**F4** turns the trail on or off. **Shift+F4** changes its look: gold, ivory, cyan, magenta, or large.

## In a dungeon

- **Pin a spot on the dungeon map:** open the map and **middle-click** to place the map's own pin, then **give it a name**.
  The trail leads to it, on its own floor. Clear its name to remove it.
  This works best once you have explored a little: the trail can only use the way your map knows.
- **Pin the way out:** **right-click the exit mark** on the dungeon map (or middle-click a pin onto it). The compass, the
  waypoint and the trail lead you back out. Nothing about the exit shows until you ask for it.
- **Set a destination:** **right-click** anywhere on the dungeon's **flat** map. A flag marks it. Right-click the flag to
  remove it. (The 3D map uses the right button to turn the view, so destinations are set on the flat map.)

## In a town or city

- Open the local map (**M**) and **right-click** a spot. A flag stands there, and the game says "Destination set - 46 m".
  Close the map, and the waypoint and trail lead there.
- **Right-click a quest's ring** on the map to set that quest's location ("Quest location set").
- **Right-click the flag** to remove the destination.

## In the open world (the region map)

- Open the region map (**V**), **right-click** a place and choose **Follow**. This is the game's own waypoint marker.
- Outdoors, the mod leads you there: "Following Waypoint 1 - 1914 m". The waypoint you followed last takes the compass; the
  others wait in **F3**'s cycle.
- When you arrive (within about 10 m), the game says "Reached ..." and the compass goes back to the quest.
- **Shift+F2** puts a waypoint aside. Follow it again on the map to bring it back.
- When you go inside somewhere, the trail follows your quest there; when you come back out, it takes up your waypoint again.

## Pins where you look

- **F2** drops a pin where the crosshair meets the world (or 25 m ahead). You can have up to **8** pins.
- **F3** follows the next place in turn: **the quest, the exit, your pins and destinations, then your region-map waypoints**.
- **Shift+F2** removes the place you are following.
- Walk within 3 m of a pin or destination and it is **reached**: it is removed and the next one is followed.
- Pins and destinations belong to the place where you set them. Going through a door, into a dungeon, or travelling clears
  them. Teleporters inside a dungeon and walking across the open world do not.

## Quests

The mod helps you follow quests, but keeps the game's rule that **you ask around to find a town**:

- The compass leads only to **towns your map already knows**. When a quest names a town you have not found yet, the
  **region map highlights that town** with the quest's diamond. Find it, set a waypoint there (Follow), and walk.
- In the quest's town, the compass leads to the **building the journal names** - also when the journal names it through a
  person ("_the agent_ awaits me in _the building_ in _the town_").
- On **Exact** guidance, inside buildings and dungeons the compass marks the quest's people and things.
- **When you have dealt with a person** (every step that waited on talking to them is done), their mark and their place go
  away, so you are never sent back to someone the quest no longer needs.

## Changing keys

Press **Shift+F1** (or **Settings > Mods & files > Modules > Change module keys**). A small panel opens at the **left edge** of
the screen, so the middle stays clear if an enemy appears. Choose an action, then press its new key.

- **Escape** cancels. **Backspace** puts the action's first key back.
- A key another action already uses is refused, and the panel says which action has it.
- Letters, digits, arrows and Space are allowed, with a warning that the game may use them too.
- The panel works by keyboard alone, and each change is read out to screen readers.

## All keys

| Key | Does |
| --- | --- |
| F7 | Waypoint on / off |
| Shift+F3 | Waypoint look (and the compass diamond's colour) |
| F4 | Guide trail on / off |
| Shift+F4 | Trail look |
| F2 | Drop a pin where you look |
| F3 | Follow the next place |
| Shift+F2 | Remove the followed place (a region waypoint: put it aside) |
| Shift+F1 | Change the keys |

The keys work only while you are playing: never in a menu, a dialog or a map, where the game uses F-keys for other things.
None of them is one of the game's own gameplay keys.
