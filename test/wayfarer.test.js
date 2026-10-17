// BEARDD'S WAYFARER - the modules' own tests: the waypoint, the guide trail and pins, each driven through a fake handle (the
// Mod API's `dfo`) and a fake world probe, so they run here with nothing of the game. The Mod API itself (the bus, the host, the
// seams in the game) is tested in the game's own repository (test/mods1_api.test.js).
//
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** THE GAME'S OWN GAMEPLAY KEYS (its src/systems/inputActions.js defaults), which no module key may be on its own. Read from the game
 *  source when it stands beside this repository (../daggerfall-js-source), else the list as it stood when the mod was written. */
function gameKeys() {
  const file = join(ROOT, '..', 'daggerfall-js-source', 'src', 'systems', 'inputActions.js');
  if (existsSync(file)) return new Set([...readFileSync(file, 'utf8').matchAll(/\['([A-Za-z0-9]+)', '[A-Za-z0-9]+'\]/g)].map((m) => m[1]));
  return new Set(['F5', 'F6', 'F8', 'F9', 'F10', 'F11', 'Home', 'Insert', 'Delete', 'Space', 'Tab', 'Escape', 'Enter',
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => `Key${c}`), ...'0123456789'.split('').map((d) => `Digit${d}`)]);
}

test('PINS - THE EXIT: off until the player pins it on the map (the exit mark, or near where they came in); then followed, cycled by F3, cleared on its flag, forgotten in a new place', async () => {
  const { default: setupPins } = await import('../source/pins/module.js');
  const h = fakeHandle(); setupPins(h.dfo);
  const view = new Float32Array(16); view[10] = 1;
  const world = { ray: () => null, floor: () => 0 };
  h.on.drawFx({ _camPos: [10, 2, 10], _view: view }, world);
  h.on.drawFx({ _camPos: [500, 2, 600], _view: view }, world);   // a dungeon's entrance: a new place, come into here
  h.on.questMark(null, [520, 640], 0);
  h.keys.F3();
  assert.match(h.said.at(-1), /^No places set/, 'nothing kept is shown: coming in pins no exit');
  assert.equal(h.keys['Shift+F7'], undefined, 'no key of its own');
  h.on.mapPick('automap', -17, -37, false, false);   // a click 3.6 m from where the player came in
  assert.deepEqual(h.targets.at(-1), [500, 600, 0], 'a click near where the player came in is the exit, snapped to it - and on the floor they came in on');
  assert.equal(h.said.at(-1), 'Exit pinned - 45 m');
  h.on.mapPick('automap', null, null, false);
  assert.equal(h.said.at(-1), 'Exit cleared', 'its flag taken away clears the exit');
  assert.equal(h.targets.at(-1), null);
  h.on.mapPick('automap', 10, 10, false, true);   // the map says the click was on its exit mark
  assert.deepEqual(h.targets.at(-1), [530, 650], 'the map\'s exit mark is the exit, wherever it is');
  assert.equal(h.kinds.at(-1), 'exit', 'and the game is told it is the exit (the waypoint colours it)');
  h.on.drawFx({ _camPos: [520, 2, 640], _view: view }, world);
  h.keys.F1();   // a pin is followed now
  h.keys.F3();
  assert.equal(h.targets.at(-1), null, 'F3 from the last pin: the quest');
  h.keys.F3();
  assert.deepEqual(h.targets.at(-1), [530, 650], 'then the exit');
  h.keys.F3();
  assert.equal(h.said.at(-1), 'Following pin 1', 'then the pins');
  assert.equal(h.kinds.at(-1), 'pin');
  h.on.mapPick('automap', -60, 0, false, false);
  assert.equal(h.kinds.at(-1), 'destination');   // far from where the player came in: a plain destination
  assert.equal(h.said.at(-1), 'Destination set - 60 m');
  h.keys.F3(); h.keys.F3();   // from the destination: the quest, then the exit
  assert.equal(h.said.at(-1), 'Following the exit', 'a destination set later leaves the exit pinned');
  h.on.questMark(null, [531, 651], 0);   // walked out
  assert.ok(h.said.includes('Reached the exit'));
  assert.equal(h.targets.at(-1), null, 'reaching it gives the compass back to the quest');
  h.on.drawFx({ _camPos: [1500, 2, 600], _view: view }, world);   // out: a new place
  h.on.questMark(null, [1500, 600], 0);
  h.keys.F3();
  assert.match(h.said.at(-1), /^No places set/, 'a new place forgets the exit');
});

test('PINS - taking away a place that is not followed leaves the compass where it is', async () => {
  const { default: setupPins } = await import('../source/pins/module.js');
  const h = fakeHandle(); setupPins(h.dfo);
  const view = new Float32Array(16); view[10] = 1;
  h.on.drawFx({ _camPos: [0, 2, 0], _view: view }, { ray: () => 5, floor: () => 0 });
  h.on.questMark(null, [0, 0], 0);
  h.on.mapPick('town', 30, 0, false);   // the destination, followed
  h.keys.F1();                          // a pin, followed now
  const pin = h.targets.at(-1);
  h.on.mapPick('town', null, null, false);   // the flag taken away while the pin is followed
  assert.deepEqual(h.targets.at(-1), pin, 'the pin is still followed');
});

test('THE WAYPOINT\'S KINDS - a pin, a destination and an exit each have their own colour, apart from the quest\'s gold and from each other, and a word', async () => {
  const { MARK_KINDS, WAYPOINT_LOOKS, diamondColour } = await import('../source/waypoint/module.js');
  const colours = Object.values(MARK_KINDS).map((k) => k.css.toLowerCase());
  assert.equal(new Set(colours).size, colours.length, 'every kind its own colour');
  assert.ok(!colours.includes(WAYPOINT_LOOKS.gold.css.toLowerCase()), 'none is the quest\'s gold');
  assert.deepEqual(['pin', 'destination', 'exit'].map((k) => MARK_KINDS[k].word), ['Pin', 'Destination', 'Exit'], 'and a word, so colour is never the only sign');
  assert.equal(diamondColour(MARK_KINDS.pin, 'cyan'), MARK_KINDS.pin.css, 'the diamond takes its kind\'s colour');
  assert.equal(diamondColour(null, 'cyan'), WAYPOINT_LOOKS.cyan.css, 'the quest its look');
  assert.ok(read('source/waypoint/module.js').includes("wp.style.setProperty('--c', diamondColour(mark.kind, look));"), 'and the diamond is drawn in it');
});

test('THE TRAIL CLIMBS - up a hill or a dungeon\'s hump (0.82 m a metre, as measured in the game), never up a ledge or a wall; and it starts from a cell the player can step out of', async () => {
  const { createRouter } = await import('../source/guide-trail/src/route.js');
  // a corridor along x between walls at z 0 and z 3
  const ray = (o, d, m) => { const z = o[2] + d[2] * m; return z < 0 || z > 3 ? Math.max(0, (d[2] > 0 ? 3 - o[2] : o[2]) / Math.abs(d[2] || 1e-9)) : null; };
  const inside = (z) => z >= 0 && z <= 3;
  const hump = (x) => (x < 20 ? 0 : x < 22.5 ? (x - 20) * 0.82 : x < 25 ? (25 - x) * 0.82 : 0);
  assert.equal(createRouter({ floor: (x, y, z) => (inside(z) ? hump(x) : null), ray }, STILL).plan([17, 1.6, 1.5], [30, 1.5]).reached, true, 'over the hump the player walks');
  const ledge = { floor: (x, y, z) => (!inside(z) ? null : x >= 22 && x < 26 && y >= 0.7 ? 0.8 : 0), ray };
  assert.equal(createRouter(ledge, STILL).plan([17, 1.6, 1.5], [24, 1.5, 0.8]).reached, false, 'not up onto a ledge - its middle is a jump, not a slope');
  const wall = { floor: (x, y, z) => (!inside(z) ? null : x < 20 ? 0 : (x - 20) * 2), ray };
  assert.equal(createRouter(wall, STILL).plan([17, 1.6, 1.5], [24, 1.5]).reached, false, 'not up a slope of two metres a metre');
  // a pillar round the centre of the cell the player stands in: every step out of that centre is shut
  const pillar = { floor: () => 0, ray: (o) => (o[0] > 5.2 && o[0] < 5.8 && o[2] > 5.2 && o[2] < 5.8 ? 0 : null) };
  const got = createRouter(pillar, STILL).plan([5.05, 1.6, 5.05], [12, 12]);
  assert.ok(got.pts.length > 2 && got.reached, 'the plan starts from the next cell the player can see and step out of, and the trail stays');
  // a heap of rubble 1.4 m high round the centre of the player's cell, the player on the floor beside it (as measured in the game)
  const heap = (x, z) => Math.hypot(x - 5.5, z - 5.5) < 0.45;
  // as the game's probe: a ray down from 1.2 m over y, started inside the heap, meets it at once
  const rubble = {
    floor: (x, y, z) => (!heap(x, z) ? 0 : y + 1.2 >= 1.4 ? 1.4 : y + 1.2),
    ray: (o, d, m) => { for (let t = 0; t <= m; t += 0.05) if (heap(o[0] + d[0] * t, o[2] + d[2] * t) && o[1] < 1.4) return t; return null; },
  };
  const out = createRouter(rubble, STILL).plan([5.05, 0.1, 5.05], [12, 12]);   // the feet a little over the floor, as the eye reckons them
  assert.ok(out.reached && out.pts[0][1] === 0, 'the level is the floor under the player\'s feet, not the top of the rubble at the cell\'s centre');
});

test('THE KNOWN WAY - between floors over the cells the player walked (stairs, hills, rubble) and through the teleporters and drops taken; only what the map knows', async () => {
  const { planKnown } = await import('../source/guide-trail/src/route.js');
  const clock = { now: () => 0 };
  // two floors 4 m apart joined by a stair: floor 0 along z 0 (x 0..10), a stair up half a metre a cell (x 11..18), floor 4 back along z 1
  const walked = [];
  for (let x = 0; x <= 10; x++) walked.push(`${x},0,0`);
  for (let i = 1; i <= 8; i++) walked.push(`${10 + i},${i * 0.5},0`);
  for (let x = 18; x >= 0; x--) walked.push(`${x},4,1`);
  const up = planKnown({ walked, steps: [] }, [1.5, 0, 0.5], [1.5, 1.5, 4], null, clock);
  assert.ok(up.reached && !up.step, 'up the stairs to the mark on the floor above');
  assert.equal(Math.max(...up.pts.map((p) => p[1])), 4, 'the way climbs to its floor');
  assert.ok(up.pts.some((p) => p[0] > 16), 'and goes round by the stair, not straight up through the ceiling');
  // a teleporter from x 5 on floor 0 to x 39 on a floor 10 m up; the mark by its far end
  const w2 = [];
  for (let x = 0; x <= 6; x++) w2.push(`${x},0,0`);
  for (let x = 38; x <= 45; x++) w2.push(`${x},10,0`);
  const tp = planKnown({ walked: w2, steps: [[5.5, 0, 0.5, 39.5, 10, 0.5]] }, [0.5, 0, 0.5], [44.5, 0.5, 10], null, clock);
  assert.ok(tp.step && !tp.reached, 'the way leads to the teleporter first');
  assert.deepEqual(tp.pts.at(-1), [5.5, 0, 0.5], 'and ends at its near end, to be planned again from its far one');
  const back = planKnown({ walked: w2, steps: [[5.5, 0, 0.5, 39.5, 10, 0.5]] }, [44.5, 10, 0.5], [0.5, 0.5, 0], null, clock);
  assert.ok(!back.reached && !back.step, 'a teleporter is one way: no known way back through it');
  assert.deepEqual(back.pts.at(-1), [38.5, 10, 0.5], 'only as far as the map knows toward the goal: the near end of this floor');
  assert.equal(planKnown({ walked, steps: [] }, [50, 0, 50], [1, 1], null, clock), null, 'off the walked cells: nothing, and the floor\'s own search leads');
  assert.equal(planKnown(null, [0, 0, 0], [1, 1]), null);
  // a climb straight up inside one cell leaves its heights stacked in that column (as walked live in Privateer's Hold: x 42, z 26,
  // from 26.5 to 32 by half metres) - the way runs up the column, or the floor above was cut off
  const stack = [];
  for (let x = 37; x <= 41; x++) stack.push(`${x},26,26`);
  for (let y = 26.5; y <= 32; y += 0.5) stack.push(`42,${y},26`);
  for (let x = 43; x <= 45; x++) stack.push(`${x},32,26`);
  const climb = planKnown({ walked: stack, steps: [] }, [37.5, 26, 26.5], [45.5, 26.5, 32], null, { now: () => 1 });
  assert.ok(climb?.reached, 'up a climb whose heights stand in one cell');
  const setup = read('source/guide-trail/src/setup.js');
  assert.ok(setup.includes("if (!got?.reached && typeof world.known === 'function')"), 'the trail turns to the known way only where the floor\'s own search does not reach');
});

test('THE REGION MAP\'S WAYPOINTS - one followed anew on the map is led to at once, kept on its spot as the open world streams, given back on arrival or unfollowing, taken up again outside; a tile step keeps the pins', async () => {
  const { default: setupPins } = await import('../source/pins/module.js');
  const h = fakeHandle(); setupPins(h.dfo);
  const view = new Float32Array(16); view[10] = 1;
  let ways = [{ id: 'a', name: 'Old camp', x: 900, z: 0 }];   // followed before: waits in the cycle
  const world = { ray: () => null, floor: () => 0, waypoints: () => ways };
  const frame = (x, z) => { h.on.drawFx({ _camPos: [x, 2, z], _view: view }, world); h.on.questMark(null, [x, z], 0); };
  frame(0, 0);
  assert.equal(h.targets.length, 0, 'a waypoint followed before the module looked takes nothing');
  ways = [...ways, { id: 'b', name: 'Waypoint 2', x: 0, z: -3000 }];
  frame(0, 0);
  assert.deepEqual(h.targets.at(-1), [0, -3000], 'one followed anew on the map: the compass, waypoint and trail lead to it');
  assert.equal(h.kinds.at(-1), 'waypoint');
  assert.equal(h.said.at(-1), 'Following Waypoint 2 - 3000 m');
  h.on.mapPick('town', 20, 0, false);   // a destination too, in this frame
  h.keys.F3();
  assert.equal(h.said.at(-1), 'Following Old camp', 'F3: the quest, the destination, then each waypoint');
  h.keys.F3();
  assert.equal(h.said.at(-1), 'Following Waypoint 2');
  ways = ways.map((w) => ({ ...w, x: w.x - 819.2 }));   // the open world steps a tile west: every scene point moves
  h.on.drawFx({ _camPos: [-818.2, 2, 0], _view: view }, world);
  assert.deepEqual(h.targets.at(-1), [-819.2, -3000], 'the waypoint kept on its spot in the new frame');
  h.keys.F3(); h.keys.F3();
  assert.deepEqual(h.targets.at(-1), [20 - 819.2, 0], 'a tile step is no new place: the destination moved with the world');
  h.keys.F3(); h.keys.F3();   // on to Waypoint 2
  h.on.questMark(null, [-815, -2994], 0);
  assert.equal(h.said.at(-1), 'Reached Waypoint 2', 'arriving within a few metres');
  assert.equal(h.targets.at(-1), null, 'gives the compass back to the quest');
  ways = [ways[0]]; frame(-818.2, 0);   // unfollowed on the map, then followed again: new again
  ways = [...ways, { id: 'b', name: 'Waypoint 2', x: -819.2, z: -3000 }]; frame(-818.2, 0);
  assert.equal(h.said.at(-1), 'Following Waypoint 2 - 3000 m');
  ways = [ways[0]]; frame(-818.2, 0);
  assert.equal(h.targets.at(-1), null, 'unfollowed on the map: let go');
  ways = [...ways, { id: 'c', name: 'Shrine', x: 50, z: 50 }]; frame(0, 0);
  const inside = ways; ways = null;
  h.on.drawFx({ _camPos: [5000, 2, 5000], _view: view }, world);   // through a door: a new place, no waypoints in its frame
  assert.equal(h.targets.at(-1), null, 'indoors the quest is followed');
  ways = inside; frame(0, 0);   // out again
  assert.deepEqual(h.targets.at(-1), [50, 50], 'and outside the waypoint is taken up again');
});

test('A PLACE ON ITS OWN FLOOR - the exit and a dungeon map\'s pin keep their floor, tell the compass, and are reached on it alone; a teleporter\'s jump keeps the place', async () => {
  const { default: setupPins } = await import('../source/pins/module.js');
  const h = fakeHandle(); setupPins(h.dfo);
  const view = new Float32Array(16); view[10] = 1;
  let steps = [];
  const world = { ray: () => null, floor: (x, y) => [0, -12].find((f) => f <= y) ?? null, known: () => ({ walked: ['0,0,0'], steps }) };
  h.on.drawFx({ _camPos: [0, 1.6, 0], _view: view }, world);
  h.on.drawFx({ _camPos: [400, 1.6, 0], _view: view }, world);   // into the dungeon at floor 0
  h.on.drawFx({ _camPos: [400, -10.4, 30], _view: view }, world);   // down a stair to a floor 12 m below
  h.on.questMark(null, [400, 30], 0);
  h.on.mapPick('automap', 0, -30, false, true);   // the exit mark: over the player's head, three floors up
  assert.deepEqual(h.targets.at(-1), [400, 0, 0], 'the exit keeps the floor the player came in on, and the compass is told it');
  h.on.questMark(null, [400, 0.5], 0);   // under it, on the floor below
  assert.ok(!h.said.includes('Reached the exit'), 'standing under it on another floor is not reaching it');
  h.on.mapPick('automap', 20, 0, false, false, 8);   // the dungeon map's own pin on the floor above
  assert.deepEqual(h.targets.at(-1), [420, 0.5, -4], 'a map pin keeps the floor the map says');
  steps = [[410, -12, 0, 900, -12, 900]];   // a teleporter taken: the map records it, then the jump lands at its far end
  h.on.drawFx({ _camPos: [902, -10.4, 899], _view: view }, world);
  h.keys.F3(); h.keys.F3();
  assert.equal(h.said.at(-1), 'Following the exit', 'a teleporter\'s jump is no new place: the exit is still pinned');
  h.on.drawFx({ _camPos: [3000, 1.6, 3000], _view: view }, world);   // out of the dungeon: a jump to nowhere the map knows
  h.on.questMark(null, [3000, 3000], 0);
  h.keys.F3();
  assert.match(h.said.at(-1), /^No places set/, 'leaving forgets it');
  const g = fakeHandle(); setupPins(g.dfo);   // loaded straight into a dungeon: no jump, and the first place shown is where the player came in
  g.on.drawFx({ _camPos: [5, 1.6, 5], _view: view }, world);
  g.on.drawFx({ _camPos: [5, 1.6, 40], _view: view }, world);
  g.on.questMark(null, [5, 40], 0);
  g.on.mapPick('automap', 2, -33, false, false);
  assert.deepEqual(g.targets.at(-1), [5, 5, 0], 'a click near the first place shown is the exit, on its floor');
  g.on.mapPick('automap', 3, -32, false, false, 0.5);   // the map's own pin, 5 m from it: its exact spot, which says it is no exit
  assert.deepEqual(g.targets.at(-1), [8, 8, 0], 'a map pin near the way in stays where the player placed it - on the floor under it, where the trail reaches it');
  assert.equal(g.kinds.at(-1), 'destination');
});

test("THE GUIDE TRAIL ROUTER - round a wall, on a slope, never under the floor; the diamond stands over the floor of the spot", async () => {
  const { createRouter } = await import('../source/guide-trail/src/route.js');
  const { project } = await import('../source/waypoint/module.js');
  const wall = { x0: 10, x1: 11, z0: -30, z1: 8 };
  const slope = 0.2;
  const world = {
    floor: (x, y, z) => (z < -60 || z > 60 ? null : x * slope),
    ray(o, d, max) {   // a horizontal ray against the wall's box (slab test in x, z)
      let t0 = 0, t1 = max;
      for (const [p, v, lo, hi] of [[o[0], d[0], wall.x0, wall.x1], [o[2], d[2], wall.z0, wall.z1]]) {
        if (Math.abs(v) < 1e-9) { if (p < lo || p > hi) return null; continue; }
        const a = (lo - p) / v, b = (hi - p) / v;
        t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
      }
      return t0 <= t1 ? t0 : null;
    },
  };
  const router = createRouter(world, STILL);
  const got = router.plan([0, 0, 0], [24, 0]);
  assert.ok(got && got.pts.length > 10, 'a way is planned');
  assert.equal(got.reached, true, 'it reaches the goal');
  assert.ok(got.pts.some((p) => p[2] > wall.z1), 'it goes round the end of the wall');
  assert.ok(got.pts.every((p) => !(p[0] > wall.x0 && p[0] < wall.x1 && p[2] > wall.z0 && p[2] < wall.z1)), 'no point is in the wall');
  assert.ok(got.pts.every((p) => Math.abs(p[1] - p[0] * slope) < 1e-6), 'every point lies on the floor, up the slope');
  const last = got.pts[got.pts.length - 1];
  assert.ok(Math.hypot(last[0] - 24, last[2]) < 1.6, 'and ends at the goal');
  let sharpest = 0;   // the turns are curves: a corner past a wall is eased as far as the wall's clearance allows: no step turns more than 80 degrees
  for (let i = 2; i < got.pts.length; i++) {
    const u = [got.pts[i - 1][0] - got.pts[i - 2][0], got.pts[i - 1][2] - got.pts[i - 2][2]], v = [got.pts[i][0] - got.pts[i - 1][0], got.pts[i][2] - got.pts[i - 1][2]];
    sharpest = Math.max(sharpest, Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI);
  }
  assert.ok(sharpest < 80, 'the sharpest turn was ' + sharpest.toFixed(0) + ' degrees');
  assert.equal(router.sees([0, 0, 0], [20, 4, 0]), false, 'the wall is not seen through');
  assert.equal(createRouter({ ...world, floor: () => null }, STILL).plan([0, 0, 0], [5, 0]), null, 'no floor under the player: no way');
  // the diamond: a point over the view's centre lands mid-screen; one behind the camera is nowhere
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const P = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0]);
  const mid = project(I, P, 0, 0, -5, 800, 600);
  assert.ok(mid && Math.abs(mid.x - 400) < 1e-6 && Math.abs(mid.y - 300) < 1e-6);
  assert.equal(project(I, P, 0, 0, 5, 800, 600), null);
});

test('PINS - F1 drops a pin where the crosshair meets the world, F3 cycles the compass quest -> pins -> quest, Shift+F2 removes, arrival goes on, a new place clears; keys only while the HUD is up', async () => {
  const { default: setupPins } = await import('../source/pins/module.js');
  const h = fakeHandle(); setupPins(h.dfo);
  const view = new Float32Array(16); view[2] = 0; view[6] = 0; view[10] = 1;   // forward = -(col3 rows) = (0, 0, -1): facing -z
  const renderer = { _camPos: [100, 2, 100], _view: view };
  const world = { ray: () => 10, floor: () => 0 };
  h.on.drawFx(renderer, world);
  h.keys.F1();
  assert.equal(h.targets.length, 0, 'the HUD is not up: no key does anything');
  h.on.questMark(null, [100, 100], 0);
  h.keys.F1();
  assert.deepEqual(h.targets.at(-1).map((n) => Math.round(n)), [100, 90], 'a pin where the ray met a wall (10 m, 0.3 short), and the compass follows it');
  h.keys.F1();
  assert.equal(h.said.at(-1).startsWith('Pin 2'), true);
  h.keys.F3();
  assert.equal(h.targets.at(-1), null, 'F3 past the last pin: the game\'s quest');
  h.keys.F3();
  assert.ok(Array.isArray(h.targets.at(-1)), 'and round to the first pin');
  h.keys['Shift+F2']();
  assert.equal(h.said.at(-1), 'Pin 1 removed');
  h.on.questMark(null, [100, 90.5], 0);   // standing at the pin's spot: arrived
  assert.ok(h.said.some((s) => s.startsWith('Reached')), 'reaching a pin says so');
  h.keys.F1(); h.keys.F1();
  h.on.drawFx({ _camPos: [900, 2, 900], _view: view }, world);   // a jump: a new place
  assert.equal(h.targets.at(-1), null, 'a new place clears the pins and gives the compass back');
  h.on.questMark(null, [900, 900], 0);
  h.keys.F3();
  assert.match(h.said.at(-1), /^No places set/, 'a jump keeps nothing: no exit unless the player pins one');
  for (let i = 0; i < 10; i++) h.keys.F1();
  assert.match(h.said.at(-1), /8 already/, 'eight at most');
});

test('THE LOOKS AND THE LABEL - every look fills the ember field in its own colour and size; the waypoint says the distance alone, never a time (the player: "irrelevant")', async () => {
  const { createEmberField, GUIDE_STYLES, GUIDE_STYLE_ORDER } = await import('../source/guide-trail/src/embers.js');
  const { distLabel, WAYPOINT_LOOKS } = await import('../source/waypoint/module.js');
  const path = [[0, 0, 0], [0, 0, 20]];
  const sizes = {};
  for (const name of GUIDE_STYLE_ORDER) {
    const f = createEmberField(); const n = f.fill(path, 3, { style: GUIDE_STYLES[name] });
    assert.ok(n > 10, `${name} draws`);
    sizes[name] = Math.max(...f.embers.slice(0, n).map((e) => e.size));
    assert.ok(f.embers.slice(0, n).every((e) => e.color.every((c) => c >= 0 && c <= 1) && e.alpha <= 1), `${name} stays a colour`);
  }
  assert.ok(sizes.large > sizes.gold * 1.5, 'the large look is large');
  assert.notDeepEqual(GUIDE_STYLES.cyan.ember, GUIDE_STYLES.gold.ember);
  assert.deepEqual([420, 40, 5, 1500].map((d) => distLabel(d)), ['420 m', '40 m', '5 m', '1.5 km'], 'the distance alone');
  assert.doesNotMatch(read('source/waypoint/module.js'), /module\.waypoint\.(seconds|minutes)|\bpace\b/, 'no time, no pace kept for it');
  assert.ok(Object.keys(WAYPOINT_LOOKS).includes('large') && WAYPOINT_LOOKS.large.big);
});

test('NO CLASH WITH THE GAME - no module key is a default gameplay binding, no two modules share a key, every key handler is gated on the HUD being up', () => {
  const taken = gameKeys();
  assert.ok(taken.has('F5') && taken.has('KeyM'), 'the game\'s default bindings are known');
  const seen = new Map();
  for (const id of ['waypoint', 'guide-trail', 'pins']) {
    const src = id === 'guide-trail' ? read('source/guide-trail/src/setup.js') : read(`source/${id}/module.js`);
    const lines = src.split('\n').filter((l) => /dfo\.onKey\(/.test(l));
    assert.ok(lines.length >= 1, `${id} has a key`);
    for (const m of src.matchAll(/dfo\.onKey\('((?:Shift\+)?)([A-Za-z0-9]+)'/g)) {
      assert.ok(!(m[1] === '' && taken.has(m[2])), `${id}: ${m[2]} is a gameplay binding of the game`);
      const spec = m[1] + m[2];
      assert.ok(!seen.has(spec), `${id} and ${seen.get(spec)} both bind ${spec}`);
      seen.set(spec, id);
    }
    const handlers = src.split(/dfo\.onKey\(/).slice(1).map((s) => s.slice(0, 220));
    assert.ok(handlers.every((s) => /playing\(\)|hudSeen/.test(s)), `${id}: a key works in a menu`);
  }
  assert.ok(seen.size >= 7, 'every module key is accounted for');
});

test('A MARK SHUT IN A BUILDING - the trail leads to the nearest reachable door the street hands over, and to the nearest cell where it hands none', async () => {
  const { createRouter, planToMark } = await import('../source/guide-trail/src/route.js');
  const box = { x0: 20, x1: 30, z0: -5, z1: 5 };
  const world = {
    floor: () => 0,
    ray(o, d, max) {   // the building is a solid box: a ray that meets it is stopped
      let t0 = 0, t1 = max;
      for (const [p, v, lo, hi] of [[o[0], d[0], box.x0, box.x1], [o[2], d[2], box.z0, box.z1]]) {
        if (Math.abs(v) < 1e-9) { if (p < lo || p > hi) return null; continue; }
        const a = (lo - p) / v, b = (hi - p) / v;
        t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
      }
      return t0 <= t1 ? t0 : null;
    },
    doors: () => [[19.6, 0, -3], [19.6, 0, 3]],
  };
  const near = (p, q, r) => Math.hypot(p[0] - q[0], p[2] - q[1]) < r;
  const withDoor = planToMark(createRouter(world, STILL), world, [0, 0, 0], [25, 0]);
  assert.ok(withDoor.door && withDoor.reached, 'a door was chosen and reached');
  assert.ok(near(withDoor.pts.at(-1), [19.6, 3], 2.2) || near(withDoor.pts.at(-1), [19.6, -3], 2.2), 'the way ends at the door');
  const noDoors = planToMark(createRouter({ ...world, doors: undefined }, STILL), { ...world, doors: undefined }, [0, 0, 0], [25, 0]);
  assert.equal(noDoors.door, undefined);
  assert.equal(noDoors.reached, false, 'with no doors it is the nearest it can get');
  assert.ok(near(noDoors.pts.at(-1), [25, 0], 6.6), "which is a wall of the building, nearest the goal");
  const open = planToMark(createRouter(world, STILL), world, [0, 0, 0], [10, 0]);
  assert.equal(open.door, undefined, 'a goal in the open is led to as it is');
});

test('THE LOCAL MAP - a right click sets a destination (or a quest location) as metres from the player; the compass follows it; a click on its flag takes it away', async () => {
  const { default: setupPins } = await import('../source/pins/module.js');
  const h = fakeHandle(); setupPins(h.dfo);
  h.on.mapPick('town', 10, 5, false);
  assert.match(h.said.at(-1), /^No destination/, 'before the player has stood anywhere there is nothing to measure from');
  h.on.questMark(null, [100, 200], 0);
  h.on.mapPick('town', 30, -40, false);
  assert.deepEqual(h.targets.at(-1), [130, 160], 'the player\'s place plus the offset (east, and north is +z)');
  assert.equal(h.said.at(-1), 'Destination set - 50 m');
  h.on.mapPick('automap', -3, 4, true);
  assert.deepEqual(h.targets.at(-1), [97, 204], 'one destination: the last set replaces it');
  assert.equal(h.said.at(-1), 'Quest location set - 5 m');
  h.on.mapPick('automap', null, null, false);
  assert.equal(h.targets.at(-1), null, 'the flag taken away: the compass goes back to the quest');
  assert.equal(h.said.at(-1), 'Destination cleared');
  h.on.mapPick('town', 40, 0, false);
  h.on.questMark(null, [139, 200], 0);   // within 3 m of it
  assert.ok(h.said.includes('Reached your destination'));
  assert.equal(h.targets.at(-1), null);
});

test('THE TRAIL ANSWERS A FRAME - set up, a mark and a world pass with no GL draw nothing and throw nothing; F4 only toggles it, and only while the HUD is up', async () => {
  const { default: setupTrail } = await import('../source/guide-trail/src/setup.js');
  const h = fakeHandle(); setupTrail(h.dfo);
  assert.deepEqual(Object.keys(h.keys).sort(), ['F4', 'Shift+F4'], 'no way-back tier: the keys are on/off and the look');
  h.on.questMark([10, 10], [0, 0], 0);
  h.on.drawFx({ _camPos: [0, 1.6, 0] }, { floor: () => 0, ray: () => null });
  h.keys.F4({});
  assert.equal(h.said.at(-1), 'Guide trail off');
  h.keys.F4({});
  assert.equal(h.said.at(-1), 'Guide trail on');
});

const STILL = { now: () => 0 };   // a clock that never runs out: the router's time budget must not make a loaded machine's test flaky

/** A module's handle for a test: its handlers, keys and what it asked of the game. */

function fakeHandle() {
  const h = { on: {}, keys: {}, said: [], targets: [], kinds: [], tints: [], store: new Map() };
  h.dfo = {
    api: 1, id: 'test',
    on: (e, fn) => { h.on[e] = fn; return () => {}; },
    onKey: (spec, fn) => { h.keys[spec] = fn; },
    say: (t) => h.said.push(t),
    retarget: (xz, kind) => { h.targets.push(xz); h.kinds.push(kind); },
    markColour: (css) => { h.tints.push(css); },
    store: { get: (k, f) => (h.store.has(k) ? h.store.get(k) : f), set: (k, v) => h.store.set(k, v) },
  };
  return h;
}

test('A MARK ON ANOTHER FLOOR - the compass\'s mark carries its height; the trail reaches it only on its own floor, the waypoint stands on that floor and says above or below', async () => {
  const { createRouter } = await import('../source/guide-trail/src/route.js');
  // two floors: the ground (y 0) everywhere, a balcony (y 10) where x < 6; the goal is under the balcony, on the ground
  const world = { floor: (x, y) => (x < 6 && y >= 9 ? 10 : y >= -1 ? 0 : null), ray: () => null };
  const r = createRouter(world, STILL);
  assert.equal(r.plan([1, 11.6, 1], [3, 3]).reached, true, 'with no height, the spot on the balcony above it counts');
  const deep = r.plan([1, 11.6, 1], [3, 3, 0]);
  assert.equal(deep.reached, false, 'with its height, standing above it is not arriving');
  r.reset();
  assert.equal(r.plan([8, 1.6, 1], [3, 3, 0]).reached, true, 'and on its own floor it is reached');
  const wp = read('source/waypoint/module.js');
  assert.ok(wp.includes('const from = mark.ty !== null ? mark.ty + 0.5 : eye[1] - EYE_M;'), 'the diamond stands on the floor of the mark\'s own height');
  assert.ok(wp.includes("level > OTHER_FLOOR_M ? `${tx('module.waypoint.above', 'above')} - ` : level < -OTHER_FLOOR_M ? `${tx('module.waypoint.below', 'below')} - ` : ''"), 'and says when it is on another floor');
  assert.ok(read('source/guide-trail/src/setup.js').includes('Number.isFinite(q[2]) ? [q[0], q[1], q[2]]'), 'the trail keeps the height');
});

test('WORDS IN THE PLAYER\'S LANGUAGE - every word the three modules show goes through dfo.t (the game\'s own text core: the player\'s language, the English where the game has no row), under keys the game\'s table can hold; the distance in the player\'s words', async () => {
  for (const file of ['source/waypoint/module.js', 'source/pins/module.js', 'source/guide-trail/src/setup.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /dfo\.say\((?!tx\(|on \? tx\(|quest \? tx\()/, `${file}: every line said goes through tx`);
    assert.doesNotMatch(src, /\}, '[^']*'\);?\s*$/m, `${file}: every key's label too`);
    for (const [, key] of src.matchAll(/tx\('([^']+)'/g)) assert.match(key, /^module\.[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/, `${file}: ${key} is a key the game's table can hold`);
  }
  const { distLabel } = await import('../source/waypoint/module.js');
  assert.equal(distLabel(1914, (k, en, args) => (k === 'module.waypoint.km' ? `${args.n.replace('.', ',')} km` : en)), '1,9 km', 'the distance in the player\'s words');
  const h = fakeHandle(); h.dfo.t = (key, en, args) => `[${key}]${args?.n ?? ''}`;
  const { default: setupPins } = await import('../source/pins/module.js');
  setupPins(h.dfo);
  h.on.drawFx({ _camPos: [0, 2, 0], _view: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) }, { ray: () => null, floor: () => 0 });
  h.on.questMark(null, [0, 0], 0);
  h.keys.F1();
  assert.equal(h.said.at(-1), '[module.pins.dropped]1', 'a host with a text core is asked for every line');
});

test('THE COMPASS\'S DIAMOND - the waypoint gives the compass\'s diamond its own diamond\'s colour (the player: "the diamond icon should match the diamond compass icon") - the quest\'s look, a place\'s kind - and the trail colours nothing', async () => {
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0;   // the diamond's own drawing loop: not run here
  try {
    const { default: setupWaypoint, MARK_KINDS } = await import('../source/waypoint/module.js');
    const h = fakeHandle(); setupWaypoint(h.dfo);
    h.on.questMark([5, 5], [0, 0], 0, 'quest');
    assert.equal(h.tints.at(-1) ?? null, null, 'the quest in gold: the game\'s own gold');
    h.keys['Shift+F3']();
    assert.equal(h.tints.at(-1), '#f2e6c4', 'the next look, ivory: the compass\'s diamond is ivory too');
    h.on.questMark([5, 5], [0, 0], 0, 'pin');
    assert.equal(h.tints.at(-1), MARK_KINDS.pin.css, 'a pin: the pin\'s sky blue on both');
    h.on.questMark([5, 5], [0, 0], 0, 'exit');
    assert.equal(h.tints.at(-1), MARK_KINDS.exit.css, 'the exit: its teal-green');
    h.keys.F7();
    assert.equal(h.tints.at(-1), null, 'the waypoint off: the game\'s own again');
    h.keys.F7();
    h.on.questMark(null, [0, 0], 0, null);
    assert.equal(h.tints.at(-1), null, 'nothing marked: nothing asked');
  } finally { globalThis.requestAnimationFrame = raf; }
  assert.doesNotMatch(read('source/guide-trail/src/setup.js'), /markColour/, 'the trail colours nothing');
});

test('THE TRAIL DOES NOT STUTTER - a new plan every half second does not make the embers jump: they take over from the old plan over a moment, and the steps the player takes are never eased', async () => {
  const { createStream, trimAhead, createEmberField } = await import('../source/guide-trail/src/embers.js');
  const goal = [0, 0, 200], dt = 1 / 60, V = 5;
  // each plan starts where the player stands, and its cells zigzag a little differently every time
  const plan = (z, seed) => { const pts = []; for (let d = 0; d <= goal[2] - z; d += 1) pts.push([Math.sin((d + seed) * 1.7) * 0.5 * (d < 40 ? 1 : 0), 0, z + d]); pts.push(goal); return pts; };
  const walk = (draw) => {
    let z = 0, path = plan(0, 0), lastPlan = 0, seed = 0, prev = new Map(), worst = 0, live = 0;
    for (let t = 0; t < 8; t += dt) {
      z += V * dt;
      if (t - lastPlan >= 0.5) { lastPlan = t; seed += 3.1; path = plan(z, seed); }
      const { n, embers } = draw(path, [0, 0, z], t);
      live = Math.max(live, n);
      const cur = new Map();
      for (let k = 1; k < n; k += 2) if (embers[k].alpha > 0.15) cur.set(embers[k].size.toFixed(7), [embers[k].pos[0], embers[k].pos[2]]);   // the ones you can see; a spark's size is its id's
      if (t > 1) for (const [id, p] of cur) { const q = prev.get(id); if (q) worst = Math.max(worst, Math.hypot(p[0] - q[0], p[1] - q[1] - V * dt)); }   // what it moved beyond the player's own step
      prev = cur;
    }
    return { worst, live };
  };
  const s = createStream();
  const eased = walk((path, feet, t) => ({ n: s.fill(path, feet, t), embers: s.embers }));
  const f = createEmberField();
  const jumpy = walk((path, feet, t) => { const st = trimAhead(path, feet); return { n: st ? f.fill(st.pts, t, { truncated: st.truncated }) : 0, embers: f.embers }; });
  assert.ok(eased.live > 20, 'the stream is live');
  assert.ok(jumpy.worst > 0.4, 'the test sees a jump when the plans are not blended (' + jumpy.worst.toFixed(2) + ' m)');
  assert.ok(eased.worst < 0.2, 'no ember jumps beyond the step the player takes (the largest was ' + eased.worst.toFixed(3) + ' m)');
});

test('THE TRAIL GOES ROUND A BUILDING WITH ROOM TO SPARE - it keeps off the walls (never grazing a corner), and a plan made a step later lies on the last one', async () => {
  const { createRouter, planToMark } = await import('../source/guide-trail/src/route.js');
  const { smoothPath, nearestOnPath } = await import('../source/guide-trail/src/embers.js');
  // an open plain with a building 10 x 8 m at x 10..20, z -4.2..3.8
  const inBox = (x, z) => x >= 10 && x <= 20 && z >= -4.2 && z <= 3.8;
  const world = {
    floor: (x, y, z) => (inBox(x, z) ? null : 0),
    ray: (o, d, m) => { for (let t = 0; t <= m; t += 0.05) if (inBox(o[0] + d[0] * t, o[2] + d[2] * t)) return t; return null; },
  };
  const router = createRouter(world, STILL), goal = [32, 0.2];
  const clearance = (pts) => Math.min(...pts.map((p) => Math.hypot(Math.max(10 - p[0], 0, p[0] - 20), Math.max(-4.2 - p[2], 0, p[2] - 3.8))));
  const first = smoothPath(planToMark(router, world, [0, 0, 0.3], goal).pts, 2);
  assert.ok(planToMark(router, world, [0, 0, 0.3], goal).reached, 'the way is found round the building');
  assert.ok(clearance(first) >= 0.5, 'the way keeps off the building (' + clearance(first).toFixed(2) + ' m at the nearest)');
  // the player six metres on, standing on the way: the new plan, given the last, lies on it
  const on = first[6], next = smoothPath(planToMark(router, world, [on[0], 0, on[2]], goal, first).pts, 2);
  const worst = Math.max(...next.slice(0, 15).map((p) => nearestOnPath(first, p).d));
  assert.ok(worst < 0.15, 'a plan made a few steps later lies on the last (' + worst.toFixed(2) + ' m off)');
});

test('THE TRAIL FOLLOWS A STEP TO THE SIDE - walking sideways moves the stream with the player, smoothly: no ember jumps, and a new plan (made from where the player now stands) finds it already there', async () => {
  const { createStream } = await import('../source/guide-trail/src/embers.js');
  const dt = 1 / 60, goal = 200;
  const plan = (x, z) => { const pts = []; for (let d = 0; d <= goal - z; d += 1) pts.push([x * Math.max(0, 1 - d / 40), 0, z + d]); pts.push([0, 0, goal]); return pts; };   // from the player, easing back to the line x = 0
  const s = createStream();
  let x = 0, path = plan(0, 0), lastPlan = 0, planX = 0, prev = new Map(), worst = 0, nearX = 0;
  for (let t = 0; t < 4; t += dt) {
    x += 5 * dt;                                         // five metres a second to the side, standing at z = 0
    if (t - lastPlan >= 1.2 || (t - lastPlan >= 0.25 && Math.abs(x - planX) > 2.5)) { lastPlan = t; planX = x; path = plan(x, 0); }   // a new plan, from where the player stands now: every 1.2 s, or sooner once they are 2.5 m off the way (setup.js)
    const n = s.fill(path, [x, 0, 0], t);
    const cur = new Map();
    for (let k = 1; k < n; k += 2) if (s.embers[k].alpha > 0.15) cur.set(s.embers[k].size.toFixed(7), [s.embers[k].pos[0], s.embers[k].pos[2]]);
    if (t > 0.5) for (const [id, p] of cur) { const q = prev.get(id); if (q) worst = Math.max(worst, Math.hypot(p[0] - q[0] - 5 * dt, p[1] - q[1])); }   // beyond the sideways step of the player
    prev = cur;
    if (t > 3.5) nearX = Math.min(...[...cur.values()].map((p) => Math.abs(p[0] - x)));
  }
  assert.ok(worst < 0.25, 'no ember jumps as the player steps aside (the largest was ' + worst.toFixed(3) + ' m)');
  assert.ok(nearX < 1.5, 'the stream is led to the player\'s side (its nearest ember was ' + nearX.toFixed(2) + ' m from them)');
});
