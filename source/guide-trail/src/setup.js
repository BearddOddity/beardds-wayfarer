// MODULE: GUIDE TRAIL - warm gold embers along the way to where you are going.
//
// Gold embers drift up off the floor and stream toward the place the game's own compass marks: the tracked quest, or the destination
// you set on the local map or with a pin (another module asks the game to mark it with `retarget`; the trail follows the compass).
// Hears `questMark` and `drawFx`; reaches nothing else.
//
// The way is PLANNED over the game's read-only world probe (route.js): round walls and buildings, on the floor, and - where the
// mark is inside a building and the game hands over the street's doors - by the door that is nearest it.
//
// Keys, only while the game's HUD is up (never in a menu, a dialog or a map, where F4 means something else); the player may
// change them (Shift+F1, the game's keys panel):
//   F4        trail on / off
//   Shift+F4  cycles the look: gold, ivory, cyan, magenta, large - the compass's mark takes the trail's colour while it is on
import { smoothPath, GUIDE_STYLES, GUIDE_STYLE_ORDER } from './embers.js';
import { createGuideTrailFx } from './fx.js';
import { createRouter, planToMark, planKnown } from './route.js';

const EYE_M = 1.6;           // the eye above the feet
const REPLAN_MS = 500;       // the way to the mark is planned again this often
const REPLAN_MOVE_M = 3;     // ...and when the mark moves this far
const MARK_FRESH_MS = 600;   // the compass stops handing over a mark when there is none
const HUD_LIVE_MS = 400;     // the HUD draws every frame while the game is being played; a menu, a dialog or a map stops it
const JUMP_M = 25;           // a camera jump this far is a new place: what the router learned of the old one is dropped

export default function setup(dfo) {
  let on = dfo.store.get('on', true);
  let look = dfo.store.get('look', 'gold');
  if (!GUIDE_STYLES[look]) look = 'gold';
  // the compass's mark in the trail's colour while the trail is on, so the two read as one (gold keeps the game's own gold)
  const tintCompass = () => dfo.markColour?.(on ? GUIDE_STYLES[look].mark : null);
  tintCompass();

  let mark = null;       // { q: [x, z], at: ms }
  let hudSeen = -1e9;    // when the HUD last drew
  dfo.on('questMark', (q) => {
    hudSeen = performance.now();
    mark = q && Number.isFinite(q[0]) ? { q: Number.isFinite(q[2]) ? [q[0], q[1], q[2]] : [q[0], q[1]], at: hudSeen } : null;   // [x, z, y] where the game knows the mark's height
  });
  const playing = () => performance.now() - hudSeen < HUD_LIVE_MS;

  let lastFeet = null;
  let router = null, routerWorld = null, plan = null;
  function jumped(feet) {
    if (lastFeet && Math.hypot(lastFeet[0] - feet[0], lastFeet[1] - feet[1], lastFeet[2] - feet[2]) > JUMP_M) { router?.reset(); plan = null; }
    lastFeet = feet;
  }

  /** Does way `a` end nearer the mark than way `b` (by a metre or more)? */
  const nearer = (a, b, q) => { const end = (p) => { const e = p[p.length - 1]; return Math.hypot(e[0] - q[0], e[2] - q[1], Number.isFinite(q[2]) ? e[1] - q[2] : 0); }; return end(a) + 1 < end(b); };
  // the way to the mark: planned round walls and buildings, over the floor, through the game's read-only world probe
  function wayToMark(feet, world) {
    const now = performance.now();
    if (!mark || now - mark.at > MARK_FRESH_MS) return null;
    if (!world) return [feet, [mark.q[0], feet[1], mark.q[1]]];   // an older host hands no probe: the straight line
    if (routerWorld !== world) { router = createRouter(world); routerWorld = world; plan = null; }
    if (!plan || now - plan.at > REPLAN_MS || Math.hypot(plan.goal[0] - mark.q[0], plan.goal[1] - mark.q[1]) > REPLAN_MOVE_M) {
      const got = planToMark(router, world, feet, mark.q);
      let pts = got?.pts ?? null;
      if (!got?.reached && typeof world.known === 'function') {   // not reached on the floor in sight: the way the map knows - stairs, teleporters, other floors
        const via = planKnown(world.known(), feet, mark.q, world);
        if (via && (via.reached || via.step || !pts || nearer(via.pts, pts, mark.q))) pts = via.pts;
      }
      plan = { at: now, goal: mark.q, pts: pts ? smoothPath(pts, 2) : null };
    }
    return plan.pts;
  }

  let fx = null, fxRenderer = null;
  dfo.on('drawFx', (renderer, world) => {
    const eye = renderer?._camPos;
    if (!eye) return;
    const feet = [eye[0], eye[1] - EYE_M, eye[2]];
    jumped(feet);
    if (!on) return;
    if (fxRenderer !== renderer) {
      try { fx?.dispose(); } catch { /* the old renderer is gone */ }
      fx = createGuideTrailFx({ renderer }); fxRenderer = renderer;
    }
    fx.draw(wayToMark(feet, world), feet, { style: GUIDE_STYLES[look] });
  });

  dfo.onKey('F4', (e) => { if (!playing()) return; e.preventDefault?.(); on = !on; dfo.store.set('on', on); tintCompass(); dfo.say(on ? 'Guide trail on' : 'Guide trail off'); }, 'Guide trail on / off');
  dfo.onKey('Shift+F4', (e) => {
    if (!playing()) return;
    e.preventDefault?.();
    look = GUIDE_STYLE_ORDER[(GUIDE_STYLE_ORDER.indexOf(look) + 1) % GUIDE_STYLE_ORDER.length];
    dfo.store.set('look', look); tintCompass(); dfo.say(`Guide trail look: ${look}`);
  }, 'Guide trail look');
}
