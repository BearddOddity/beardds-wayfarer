// MODULE: PINS - your own places to go, and the exit when you pin it.
//
// Right-click the local map (the street plan, or a dungeon's flat plan) to set a DESTINATION: any spot, or a quest's ringed building
// when the click is on its ring - a flag stands there, and a right click on the flag takes it away. F1 drops a pin where the
// crosshair meets the world, F3 cycles what the game's compass marks (the tracked quest, the exit once pinned, then each destination
// or pin, then the quest again), Shift+F2 removes the one followed. The compass, the quest waypoint and the guide trail all follow
// the compass's mark, so they follow the place with no more than this - the module asks the game to mark it (`dfo.retarget`) and
// talks to no other module. Reaching a place (3 m) removes it and goes on to the next, or back to the quest.
//
// THE EXIT (the player: "pin the exit and guide me out of dungeons" - off until the player pins it, so nothing appears unbidden):
// right-click the exit on the dungeon map. The map says when the click was on its exit mark (`mapPick`'s `exit`); where it does
// not, a click within EXIT_SNAP_M of where the player came into this place - a jump of 150 m lands at a dungeon's entrance or a
// building's door, and that spot is kept, silently - is the exit too, snapped to it. Then the compass, the waypoint and the trail
// lead out, and the exit stays in F3's cycle until the player leaves the place or removes it.
//
// THE REGION MAP'S WAYPOINTS (the player: "get it fully functional in ... world/region map"): the game's own waypoints - right-click
// the region map or the Overworld, Follow - are led to as well, outdoors. One the player follows anew takes the compass at once; the
// rest wait in F3's cycle. The game keeps them (systems/mapWaypoints.js); the world probe says where each lies (`world.waypoints()`),
// and the module asks afresh every frame, since the open world's frame moves as it streams. Reaching one gives the compass back to the
// quest; following it again on the map brings it back.
//
// A place belongs to the place it was set in: a jump of 150 m (a door, a dungeon, a travel, a load) clears them, since every place
// has its own frame. The open world's own step - the whole frame moved by a map tile, 819.2 m, as the player walks on - is no new
// place: the pins move with it. Hears `mapPick` (the map's right click), `questMark` (the HUD's heartbeat, where the player stands) and `drawFx`
// (the camera, the world to aim at and the region map's waypoints); reaches nothing else.
//
// WORDS: every line it says goes through the game's own text core (`dfo.t`): the player's language where the game's table has
// the row, else the English here. It ships no translations.
//
// Keys, only while the game's HUD is up (never in a menu, a dialog or a map, where F1 and F3 mean other things). The player may
// change them (Shift+F1, the game's keys panel); the lines below name the key the player has now.
const HUD_LIVE_MS = 400;
const MAX_PINS = 8;
const AHEAD_M = 25;       // the pin goes this far ahead when the crosshair meets nothing
const REACH_M = 3;
const NEW_PLACE_M = 150;
const EXIT_SNAP_M = 8;    // a map click this near where the player came in is the exit
const WAY_REACH_M = 10;   // a region-map waypoint is a spot on the land, not a doorstep
const TILE_M = 819.2;     // the open world's frame moves by whole map tiles of this (streamingWorld.js TERRAIN_SIZE)
const TILE_SLACK_M = 3;   // ...give or take what the player walked in the frame
const STEP_LAND_M = 6;    // a jump landing this near a teleporter's far end the map has just recorded is the teleporter: the same place
const LEVEL_M = 2.5;      // a place that knows its floor is reached only on it (a dungeon's floors stand 4 m or more apart)
const EYE_M = 1.6;        // the eye above the feet
const QUEST = -1, OUT = -2;   // what the compass follows besides a pin: the game's own quest, or the exit; a waypoint is its 'wp:' id

/** The English with each `{name}` filled: the words of a host with no text core (no `dfo.t`). Pure. */
const english = (_key, en, args = null) => en.replace(/\{(\w+)\}/g, (m, k) => (args && Object.hasOwn(args, k) ? String(args[k]) : m));

export default function setup(dfo) {
  /** Words in the player's language (the game's own table), else the English. */
  const tx = (key, en, args = null) => (typeof dfo.t === 'function' ? dfo.t(key, en, args) : english(key, en, args));
  // a place is [x, z], or [x, z, y] where its floor is known (the exit, a dungeon map's own pin): then the compass, the waypoint and
  // the trail are told its floor, and it is reached on that floor alone
  /** @type {{ xz: number[], map: boolean }[]} */ let pins = [];
  /** @type {number[]|null} */ let cameIn = null;   // where the player came into this place, and its floor (kept silently; never shown)
  /** @type {number[]|null} */ let exit = null;     // the exit the player pinned in this place, or null
  let flagIsExit = false;     // the map's flag stands on the exit, not a destination
  let active = QUEST;         // a pin's index, QUEST or OUT
  let hudSeen = -1e9, player = null;   // where the player stands, from the HUD's mark
  let eye = null, aim = null, world = null;
  /** @type {{ id: string, name: string, x: number, z: number }[]} */ let ways = [];   // the region map's followed waypoints, here
  /** @type {Set<string>|null} */ let followedSeen = null;   // the ids followed when last looked (null: not looked yet)
  const aside = new Set();     // waypoints put aside here (reached, or Shift+F2) - until the map follows them anew
  let resumeWay = null;        // the waypoint followed when the player went in somewhere: taken up again outside
  const playing = () => performance.now() - hudSeen < HUD_LIVE_MS;

  const isWay = (i) => typeof i === 'string';
  const wayOf = (i) => (isWay(i) ? ways.find((w) => `wp:${w.id}` === i) ?? null : null);
  const placeOf = (i) => { const w = wayOf(i); return w ? [w.x, w.z] : i === OUT ? exit : i >= 0 ? pins[i]?.xz ?? null : null; };
  const kindOf = (i) => (isWay(i) ? 'waypoint' : i === OUT ? 'exit' : pins[i]?.map ? 'destination' : 'pin');   // what the place is: the waypoint colours it by this
  const follow = (i) => { active = i; dfo.retarget(placeOf(i), kindOf(i)); };
  const label = (i) => (isWay(i) ? wayOf(i)?.name ?? tx('module.pins.what.waypoint', 'the waypoint')
    : i === QUEST ? tx('module.pins.what.quest', 'the quest')
      : i === OUT ? tx('module.pins.what.exit', 'the exit')
        : pins[i].map ? tx('module.pins.what.destination', 'your destination') : tx('module.pins.what.pin', 'pin {n}', { n: i + 1 }));
  const metres = (xz) => (player ? tx('module.pins.metres', '{n} m', { n: Math.round(Math.hypot(xz[0] - player[0], xz[1] - player[1])) }) : '');
  // the key the player has now for an action (a host older than the keys panel answers nothing: the module's own key)
  const keyFor = (get, own) => (typeof get === 'function' && get() ? get() : own).replace(/\b(Key|Digit)(?=\w$)/, '');
  let dropKey = null, removeKey = null;
  /** Take pin `i` away; the compass moves on only when it was the one followed. */
  const drop = (i) => {
    pins.splice(i, 1);
    if (active === i) follow(pins.length ? Math.min(i, pins.length - 1) : QUEST);
    else if (active > i) active--;
  };
  const forgetExit = () => { exit = null; if (active === OUT) follow(QUEST); };

  dfo.on('questMark', (_q, p) => {
    hudSeen = performance.now();
    player = p ? [p[0], p[1]] : null;
    const at = placeOf(active);
    const onItsFloor = !Number.isFinite(at?.[2]) || !eye || Math.abs(eye[1] - EYE_M - at[2]) < LEVEL_M;
    if (active !== QUEST && at && player && onItsFloor && Math.hypot(at[0] - player[0], at[1] - player[1]) < (isWay(active) ? WAY_REACH_M : REACH_M)) {
      dfo.say(tx('module.pins.reached', 'Reached {what}', { what: label(active) }));
      if (isWay(active)) { aside.add(active); follow(QUEST); } else if (active === OUT) follow(QUEST); else drop(active);
    }
  });

  /** Where the eye's feet stand, on the floor: [x, z, y]. */
  const feetAt = (e, probe) => { const f = probe?.floor?.(e[0], e[1], e[2]); return [e[0], e[2], Number.isFinite(f) ? f : e[1] - EYE_M]; };
  dfo.on('drawFx', (renderer, probe) => {
    const e = renderer?._camPos, v = renderer?._view;
    if (!e || !v) return;
    if (eye && Math.hypot(e[0] - eye[0], e[2] - eye[2]) > NEW_PLACE_M) {
      const sx = Math.round((e[0] - eye[0]) / TILE_M) * TILE_M, sz = Math.round((e[2] - eye[2]) / TILE_M) * TILE_M;
      if (Math.abs(e[0] - eye[0] - sx) < TILE_SLACK_M && Math.abs(e[2] - eye[2] - sz) < TILE_SLACK_M) {   // the open world stepped a tile: all moves with it
        const move = (xz) => (xz ? [xz[0] + sx, xz[1] + sz, ...xz.slice(2)] : xz);
        for (const p of pins) p.xz = move(p.xz);
        exit = move(exit); cameIn = move(cameIn); player = move(player);
        if (active !== QUEST && !isWay(active)) follow(active);
      } else if (!(probe && probe === world && probe.known?.()?.steps?.some((s) => Math.hypot(s[3] - e[0], s[5] - e[2]) < STEP_LAND_M))) {   // a teleporter keeps the place
        if (isWay(active)) resumeWay = active;   // a new place: its own frame, come into here
        pins = []; exit = null; cameIn = feetAt(e, probe); follow(QUEST);
      }
    } else if (!eye) cameIn = feetAt(e, probe);   // the first place the game shows: a dungeon's entrance for a new game or the Test Room
    eye = [e[0], e[1], e[2]];
    aim = [-v[2], -v[6], -v[10]];   // the camera's forward, from the view matrix's third column's rows
    world = probe ?? null;
    hearWaypoints(world?.waypoints?.() ?? null);
  });

  /** The region map's followed waypoints, where they lie now (null indoors): one newly followed is followed here at once, one
   *  unfollowed let go, and the one followed keeps the compass on its spot as the open world's frame moves. */
  function hearWaypoints(list) {
    if (!Array.isArray(list)) { ways = []; return; }
    ways = list;
    const ids = new Set(list.map((w) => `wp:${w.id}`));
    for (const id of aside) if (!ids.has(id)) aside.delete(id);   // unfollowed on the map: following it again is new
    let fresh = null;
    if (followedSeen) for (const id of ids) if (!followedSeen.has(id)) fresh = id;
    followedSeen = ids;
    if (fresh) { follow(fresh); dfo.say(tx('module.pins.followingAt', 'Following {what} - {dist}', { what: label(fresh), dist: metres(placeOf(fresh)) })); return; }
    if (resumeWay && active === QUEST && ids.has(resumeWay)) follow(resumeWay);
    resumeWay = null;
    if (isWay(active)) {
      if (ids.has(active)) dfo.retarget(placeOf(active), 'waypoint'); else follow(QUEST);   // its spot in this frame; or unfollowed on the map
    }
  }

  // the local map: where the right click landed, as metres east and north of the player - the exit when the map says so, or
  // when it is near where the player came in. A map's own pin (a note: it says its height, dy) is its exact spot and says itself
  // whether it is on the exit; it is never snapped (the player: "the pin never stays where i place it")
  dfo.on('mapPick', (_sheet, dx, dz, quest, onExit, dy) => {
    const at = pins.findIndex((p) => p.map);
    if (dx === null || dx === undefined) {   // the flag was taken away
      if (flagIsExit) { dfo.say(tx('module.pins.exitCleared', 'Exit cleared')); forgetExit(); }
      else if (at >= 0) { dfo.say(tx('module.pins.destinationCleared', 'Destination cleared')); drop(at); }
      return;
    }
    if (!player) { dfo.say(tx('module.pins.noDestination', 'No destination: stand in the world first')); return; }
    const xz = Number.isFinite(dy) && eye ? [player[0] + dx, player[1] + dz, eye[1] - EYE_M + dy] : [player[0] + dx, player[1] + dz];   // a pin on any floor
    if (xz.length === 3) {   // a map's pin rides a little over its surface: the floor under it is the place (the trail is reached on its floor)
      const f = world?.floor?.(xz[0], xz[2] + 0.5, xz[1]);
      if (Number.isFinite(f) && xz[2] - f < 1.5) xz[2] = f;
    }
    const nearCameIn = !!cameIn && Math.hypot(xz[0] - cameIn[0], xz[1] - cameIn[1]) <= EXIT_SNAP_M && (!Number.isFinite(dy) || onExit === true);
    if (onExit === true || (!quest && nearCameIn)) {
      exit = onExit !== true || nearCameIn ? cameIn : xz;   // the way out stands on the floor the player came in on
      flagIsExit = true;
      follow(OUT);
      dfo.say(tx('module.pins.exitPinned', 'Exit pinned - {dist}', { dist: metres(exit) }));
      return;
    }
    flagIsExit = false;
    if (at >= 0) drop(at);
    if (pins.length >= MAX_PINS) drop(0);
    pins.push({ xz, map: true });
    follow(pins.length - 1);
    dfo.say(quest ? tx('module.pins.questSet', 'Quest location set - {dist}', { dist: metres(xz) }) : tx('module.pins.destinationSet', 'Destination set - {dist}', { dist: metres(xz) }));
  });

  function dropPin() {
    if (!eye || !aim) { dfo.say(tx('module.pins.noView', 'No pin: the view is not up')); return; }
    if (pins.length >= MAX_PINS) { dfo.say(tx('module.pins.full', 'No pin: {max} already - remove one ({key})', { max: MAX_PINS, key: keyFor(removeKey, 'Shift+F2') })); return; }
    const flat = Math.hypot(aim[0], aim[2]) || 1;
    let d = AHEAD_M / flat;   // 25 m along the ground at any pitch
    const hit = world?.ray?.(eye, aim, 120);
    if (hit !== null && hit !== undefined) d = Math.max(0.5, hit - 0.3);
    pins.push({ xz: [eye[0] + aim[0] * d, eye[2] + aim[2] * d], map: false });
    follow(pins.length - 1);
    dfo.say(tx('module.pins.dropped', 'Pin {n} dropped - following it', { n: pins.length }));
  }

  dropKey = dfo.onKey('F1', () => { if (playing()) dropPin(); }, tx('module.pins.keyDrop', 'Drop a pin'));
  removeKey = dfo.onKey('Shift+F2', () => {
    if (!playing()) return;
    if (active === QUEST) { dfo.say(tx('module.pins.nothingFollowed', 'Nothing followed but the quest')); return; }
    if (isWay(active)) { dfo.say(tx('module.pins.putAside', '{what} put aside - follow it on the map again to bring it back', { what: label(active) })); aside.add(active); follow(QUEST); return; }
    dfo.say(tx('module.pins.removed', '{what} removed', { what: `${label(active)[0].toUpperCase()}${label(active).slice(1)}` }));
    if (active === OUT) forgetExit(); else drop(active);
  }, tx('module.pins.keyRemove', 'Remove the followed place'));
  dfo.onKey('F3', () => {
    if (!playing()) return;
    const order = [QUEST, ...(exit ? [OUT] : []), ...pins.keys(), ...ways.map((w) => `wp:${w.id}`).filter((id) => !aside.has(id))];
    if (order.length < 2) { dfo.say(tx('module.pins.noPlaces', 'No places set - right-click the map, or {key} drops a pin', { key: keyFor(dropKey, 'F1') })); return; }
    follow(order[(order.indexOf(active) + 1) % order.length]);
    dfo.say(tx('module.pins.following', 'Following {what}', { what: label(active) }));
  }, tx('module.pins.keyNext', 'Follow the next place'));
}
