// MODULE: QUEST WAYPOINT.
//
// A gold diamond over the place the game's own compass marks for the tracked quest, with how far it is - an arrow at the edge
// of the screen when it is off to a side. Needs the game's Quest marks on (and Quest guidance on Exact for the inside of
// dungeons and buildings). Hears `questMark` and `drawFx`, and reaches nothing else. When the game hands over its world probe, the diamond stands over the
// quest's own spot - the floor there (never below it) and a man's height up - seen in true perspective; otherwise it rides at a fixed height.
//
// Keys (only while the game's HUD is up; the player may change them - Shift+F1): F7 on / off, Shift+F3 cycles the look (gold, ivory, cyan, magenta, large). Settings: this module's own store (`fov` - match the game's Field of View setting, default 65 - and `height`).
const GOLD = '#c9962c';        // the game's own quest-mark gold
const HUD_LIVE_MS = 400;       // the HUD draws every frame while the game is played; a menu, a dialog, a map or a loading screen stops it (and the keys)
const ABOVE_FLOOR_M = 2.4;     // the diamond hangs this far over the floor of the mark's spot
const EYE_M = 1.6;             // the eye above the feet
const OTHER_FLOOR_M = 2.5;     // a mark's floor this far above or below the player's is another floor

/** The target's bearing off the player's facing, degrees, + to the right. The game's own compassMarkerLerp, unfolded. */
export function bearing(tx, tz, px, pz, heading01) {
  const dx = px - tx, dz = pz - tz, len = Math.hypot(dx, dz);
  if (!(len > 0)) return 0;
  const ux = dx / len, uz = dz / len, yaw = heading01 * Math.PI * 2;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const signed = Math.atan2(uz * fx - ux * fz, ux * fx + uz * fz) * 180 / Math.PI;
  const a = (180 - signed) / 360;
  return a < 0.5 ? a * 360 : -(1 - a) * 360;
}

/** Where a bearing lands across a W x H view with vertical field of view `fovDeg`, or null when it is off screen. */
export function screenX(relDeg, w, h, fovDeg, margin = 40) {
  if (Math.abs(relDeg) >= 89) return null;
  const focal = (h / 2) / Math.tan((fovDeg * Math.PI / 180) / 2);
  const x = w / 2 + Math.tan(relDeg * Math.PI / 180) * focal;
  return x < margin || x > w - margin ? null : x;
}

/** Where a world point lands on the screen, by the renderer's own view and projection (column-major), or null behind the camera. */
export function project(view, proj, x, y, z, w, h) {
  const vx = view[0] * x + view[4] * y + view[8] * z + view[12], vy = view[1] * x + view[5] * y + view[9] * z + view[13];
  const vz = view[2] * x + view[6] * y + view[10] * z + view[14];
  const cx = proj[0] * vx + proj[4] * vy + proj[8] * vz + proj[12], cy = proj[1] * vx + proj[5] * vy + proj[9] * vz + proj[13];
  const cw = proj[3] * vx + proj[7] * vy + proj[11] * vz + proj[15];
  if (!(cw > 0.05)) return null;
  return { x: (cx / cw * 0.5 + 0.5) * w, y: (0.5 - cy / cw * 0.5) * h };
}

/** THE LOOKS (Shift+F3 cycles them): the diamond's colour and whether it is large. Gold is the game's own quest gold. */
export const WAYPOINT_LOOKS = Object.freeze({
  gold: Object.freeze({ css: GOLD, big: false }),
  ivory: Object.freeze({ css: '#f2e6c4', big: false }),
  cyan: Object.freeze({ css: '#38d0e8', big: false }),
  magenta: Object.freeze({ css: '#e060d0', big: false }),
  large: Object.freeze({ css: GOLD, big: true }),
});
const LOOK_ORDER = Object.keys(WAYPOINT_LOOKS);
/** THE KINDS OF MARK (the player: "change icon colors for the difference between quests, marker pins and exit pins"): the quest keeps
 *  the chosen look; a place another module marked takes its kind's colour (Okabe-Ito's, which colour-blind players tell apart,
 *  brightened for a dark dungeon) and its word before the distance, so the colour is never the only sign. */
export const MARK_KINDS = Object.freeze({
  pin: Object.freeze({ css: '#56b4e9', word: 'Pin' }),
  destination: Object.freeze({ css: '#d58cc0', word: 'Destination' }),
  exit: Object.freeze({ css: '#1fd6a6', word: 'Exit' }),
  waypoint: Object.freeze({ css: '#f07b3f', word: 'Waypoint' }),   // the region map's own, followed (Okabe-Ito's vermilion)
  place: Object.freeze({ css: '#f2e6c4', word: 'Place' }),
});

const distText = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`);

/** How far away a spot is, and - when the player is moving - how long at their own pace: "420 m - 2 min". Pure. @param {number} d metres @param {number} mps metres a second (0 when standing) */
export function distLabel(d, mps) {
  const base = distText(d);
  if (!(mps > 0.8) || d < 15) return base;
  const s = d / mps;
  return `${base} - ${s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`}`;
}

export default function setup(dfo) {
  let on = dfo.store.get('on', true);
  let look = dfo.store.get('look', 'gold');
  if (!WAYPOINT_LOOKS[look]) look = 'gold';
  const fov = () => dfo.store.get('fov', 65);
  const height = () => dfo.store.get('height', 0.42);

  let mark = null;      // { tx, tz, px, pz, h, kind } or null when the game marks nothing
  let hudSeen = -1e9;   // when the HUD last drew
  let pace = 0, lastP = null;   // the player's own walking pace (m/s), smoothed
  dfo.on('questMark', (q, p, h, kind) => {
    const now = performance.now();
    if (p && lastP && now > lastP.t) {
      const v = Math.hypot(p[0] - lastP.x, p[1] - lastP.z) / ((now - lastP.t) / 1000);
      if (v < 30) pace += (v - pace) * Math.min(1, (now - lastP.t) / 2000);   // a teleport is not a pace
    }
    lastP = p ? { x: p[0], z: p[1], t: now } : null;
    hudSeen = now;
    mark = q && p && Number.isFinite(h) ? { tx: q[0], tz: q[1], ty: Number.isFinite(q[2]) ? q[2] : null, px: p[0], pz: p[1], h, kind: MARK_KINDS[kind] ?? null } : null;   // an older host says no kind (the quest's look) and no height
  });
  const playing = () => performance.now() - hudSeen < HUD_LIVE_MS;

  let at = null;   // the diamond on the screen by the world's own perspective: { x, y, t, behind } or null
  let level = 0;   // how far the mark's floor is above (+) or below (-) the player's, m
  dfo.on('drawFx', (renderer, world) => {
    at = null;
    const eye = renderer?._camPos, view = renderer?._view, proj = renderer?._proj, canvas = renderer?.gl?.canvas;
    if (!mark || !eye || !view || !proj || !canvas?.getBoundingClientRect) return;
    // the floor of the mark's own level where the game says its height (a many-floored dungeon), else the floor under the spot
    // nearest the player's own - never under the floor
    const from = mark.ty !== null ? mark.ty + 0.5 : eye[1] - EYE_M;
    const floor = world?.floor(mark.tx, from, mark.tz);
    const y = (Number.isFinite(floor) ? floor : from) + ABOVE_FLOOR_M;
    level = y - ABOVE_FLOOR_M - (eye[1] - EYE_M);
    const r = canvas.getBoundingClientRect();
    const p = project(view, proj, mark.tx, y, mark.tz, r.width, r.height);
    // which way the mark lies from the middle of the view (the camera's own right and up): where it cannot stand on the screen -
    // behind, or high over the player's head - the diamond waits at the screen's edge that way
    const dir = [view[0] * mark.tx + view[4] * y + view[8] * mark.tz + view[12], view[1] * mark.tx + view[5] * y + view[9] * mark.tz + view[13]];
    if (!p) { at = { x: NaN, y: NaN, t: performance.now(), behind: false, dir }; return; }
    let behind = false;   // a wall between the eye and the spot: the diamond is drawn dim, never as if it were in plain view
    if (world?.ray) {
      const dx = mark.tx - eye[0], dy = y - eye[1], dz = mark.tz - eye[2], d = Math.hypot(dx, dy, dz);
      if (d > 4) { const hit = world.ray([eye[0], eye[1], eye[2]], [dx / d, dy / d, dz / d], d); behind = hit !== null && hit < d - 2; }
    }
    at = { x: r.left + p.x, y: r.top + p.y, t: performance.now(), behind, dir };
  });

  let ui = null;
  function build() {
    const css = document.createElement('style');
    css.textContent = `
      #dfo-wp { --c: ${GOLD}; position: fixed; left: 0; top: 0; transform: translate(-50%, -50%); text-align: center; white-space: nowrap;
        pointer-events: none; z-index: 2147483000; font: 14px/1.25 "Pixelify Sans", Georgia, serif; color: #f2e6c4;
        text-shadow: 0 0 3px #000, 0 1px 2px #000; }
      #dfo-wp .gem { width: 16px; height: 16px; margin: 0 auto 6px; transform: rotate(45deg);
        border: 3px solid var(--c); background: rgba(10, 12, 17, 0.6); box-shadow: 0 0 6px 2px rgba(0, 0, 0, 0.8); }
      #dfo-wp.big { font-size: 20px; }
      #dfo-wp.big .gem { width: 26px; height: 26px; border-width: 4px; margin-bottom: 10px; }
      #dfo-wp.behind { opacity: 0.45; }
      #dfo-wp.edge .gem { display: none; }
      #dfo-wp .arrow { display: none; font-size: 28px; color: var(--c); }
      #dfo-wp.big .arrow { font-size: 40px; }
      #dfo-wp.edge .arrow { display: block; }`;
    document.head.append(css);
    const wp = document.createElement('div');
    wp.id = 'dfo-wp';
    for (const c of ['gem', 'arrow', 'd']) { const d = document.createElement('div'); d.className = c; wp.append(d); }
    document.body.append(wp);
    ui = { wp, arrow: wp.querySelector('.arrow'), dist: wp.querySelector('.d') };
  }

  function draw() {
    const { wp } = ui;
    if (!playing() || !on || !mark) { wp.style.display = 'none'; return; }
    const w = innerWidth, h = innerHeight;
    const L = WAYPOINT_LOOKS[look];
    wp.style.setProperty('--c', mark.kind?.css ?? L.css);
    wp.classList.toggle('big', L.big);
    wp.style.display = '';
    const dist = distLabel(Math.hypot(mark.tx - mark.px, mark.tz - mark.pz), pace);
    // a mark on another floor says so (the distance is along the ground) - only a mark whose floor the game or a module named: in the
    // open world a far spot's lower ground is no floor (the player: a region waypoint read 'below - 1.9 km')
    const floorWord = mark.ty === null ? '' : level > OTHER_FLOOR_M ? 'above - ' : level < -OTHER_FLOOR_M ? 'below - ' : '';
    ui.dist.textContent = `${mark.kind ? `${mark.kind.word} - ` : ''}${floorWord}${dist}`;
    // THE WORLD'S OWN PERSPECTIVE wherever the camera is handed: on the screen, the diamond stands on the spot; off it (to a side,
    // behind, or high over the player's head) an arrow waits on the screen's edge the way the mark lies, and moves smoothly round
    // it as the player turns (the player: "it keeps moving" - it jumped to the bearing at a fixed height). The bearing and the fov
    // setting only for a host that hands no camera.
    const fresh = at && performance.now() - at.t < HUD_LIVE_MS ? at : null;
    const onScreen = fresh && fresh.x > 40 && fresh.x < w - 40 && fresh.y > 30 && fresh.y < h - 60;
    wp.classList.toggle('behind', !!(onScreen && fresh.behind));
    if (onScreen) {
      wp.classList.remove('edge');
      wp.style.left = `${fresh.x}px`; wp.style.top = `${fresh.y}px`;
    } else if (fresh) {
      const [dx, dy] = fresh.dir, hw = w / 2 - 40, hh = h / 2 - 60, k = Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh) || 1;
      wp.classList.add('edge');
      ui.arrow.textContent = Math.abs(dx) / hw >= Math.abs(dy) / hh ? (dx > 0 ? '▶' : '◀') : dy > 0 ? '▲' : '▼';
      wp.style.left = `${w / 2 + dx / k}px`; wp.style.top = `${h / 2 - dy / k}px`;
    } else {
      const rel = bearing(mark.tx, mark.tz, mark.px, mark.pz, mark.h), x = screenX(rel, w, h, fov());
      wp.classList.toggle('edge', x == null);
      ui.arrow.textContent = rel > 0 ? '▶' : '◀';
      wp.style.left = `${x ?? (rel > 0 ? w - 36 : 36)}px`; wp.style.top = `${h * height()}px`;
    }
  }

  function frame() {
    try {
      if (!ui && document.body) build();
      if (ui) draw();
    } catch (e) { console.warn('[module waypoint] frame failed:', e); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // keys, only while the game's HUD is up: in a menu, a dialog or a map F7 and F3 mean other things
  dfo.onKey('F7', () => { if (!playing()) return; on = !on; dfo.store.set('on', on); dfo.say(on ? 'Quest waypoint on' : 'Quest waypoint off'); }, 'Waypoint on / off');
  dfo.onKey('Shift+F3', () => {
    if (!playing()) return;
    look = LOOK_ORDER[(LOOK_ORDER.indexOf(look) + 1) % LOOK_ORDER.length];
    dfo.store.set('look', look); dfo.say(`Waypoint look: ${look}`);
  }, 'Waypoint look');
}
