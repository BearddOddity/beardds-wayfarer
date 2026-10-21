// The guide trail's router: a way from where the player stands toward a goal that goes AROUND walls and buildings and lies ON the
// floor. It asks the game's read-only world probe (`world.floor(x, y, z)`, `world.ray(origin, dir, max)`) and nothing else, on a
// one-metre grid: a step is open when the floor is there, no steeper than a hill a player walks up (a metre of rise to a metre of
// ground - a dungeon's humps and ramps climb 0.8) and with no ledge in it (its middle checked too, so a slope passes and a
// table's edge does not), and a waist-high ray (and two more a body's width either side) goes through. A weighted A* runs for a few milliseconds a plan and gives the best it reached - the
// goal, or the closest cell to it - and the answers are kept, so the next plan, from the next cell, costs next to nothing.
// Pure of the game: tests hand it a probe.
const CELL = 1;
const SLOPE = 1;           // the most the floor may rise or fall for each metre walked (the player: "allow trails to go up hills and floor bumps")
const WAIST = 0.9;         // the rays' height over the feet (m)
const SIDE = 0.35;         // the rays either side of the centre line (m)
const WINDOW_M = 45;       // the plan reaches this far toward a farther goal
const MAX_EXPAND = 3000;
const CACHE_MAX = 100000;  // cells remembered per cache; they used to clear only on a jump or a new scene, so a long walk grew them for good
const BUDGET_MS = 6;
const WEIGHT = 1.6;        // >1: head for the goal rather than fill the room
const LEVEL_WEIGHT = 2;    // a metre of height between a cell and a goal on another floor counts as two of ground
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const key = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);

/** @param {{ floor: (x: number, y: number, z: number) => number|null, ray: (o: number[], d: number[], max: number) => number|null }} world */
export function createRouter(world, { now = () => performance.now() } = {}) {
  const floors = new Map();   // cell + level -> floor height or null
  const edges = new Map();    // from-cell, direction, level -> open?
  const lvl = (y) => Math.round(y * 2);

  function floorOf(ix, iz, fromY) {
    const k = key(ix, iz) * 64 + (lvl(fromY) & 63);
    let f = floors.get(k);
    if (f === undefined) {
      if (floors.size > CACHE_MAX) { floors.clear(); edges.clear(); }   // walked far with no jump or new scene: start the memory over
      f = world.floor((ix + 0.5) * CELL, fromY, (iz + 0.5) * CELL); floors.set(k, f);
    }
    return f;
  }
  function open(a, d, di) {
    const k = (key(a.ix, a.iz) * 8 + di) * 64 + (lvl(a.y) & 63);
    let r = edges.get(k);
    if (r !== undefined) return r;
    const bx = a.ix + d[0], bz = a.iz + d[1];
    const fb = floorOf(bx, bz, a.y);
    const len = Math.hypot(d[0], d[1]) * CELL, rise = SLOPE * len;
    const ax = (a.ix + 0.5) * CELL, az = (a.iz + 0.5) * CELL;
    r = fb !== null && Math.abs(fb - a.y) <= rise;
    if (r) {   // the step's middle: each half no steeper than the slope either, so a ledge is not a ramp
      const fm = world.floor(ax + d[0] * CELL / 2, Math.max(a.y, fb) + 0.3, az + d[1] * CELL / 2);
      r = fm !== null && Math.abs(fm - a.y) <= rise / 2 + 0.05 && Math.abs(fb - fm) <= rise / 2 + 0.05;
    }
    if (r) {
      const ux = d[0] * CELL / len, uz = d[1] * CELL / len, y = Math.max(a.y, fb) + WAIST;
      for (const s of [0, SIDE, -SIDE]) {
        const hit = world.ray([ax - uz * s, y, az + ux * s], [ux, 0, uz], len);
        if (hit !== null && hit < len - 0.02) { r = false; break; }
      }
    }
    edges.set(k, r);
    return r;
  }

  /** Can the way go from cell `a` in direction `di`: the step open, and a diagonal only where both its sides are (no cutting a
   *  corner). The one rule for the search and for choosing where it starts. */
  function step(a, di) {
    const d = DIRS[di];
    if (di >= 4 && !(open(a, [d[0], 0], d[0] > 0 ? 0 : 1) && open(a, [0, d[1]], d[1] > 0 ? 2 : 3))) return false;
    return open(a, d, di);
  }

  /** A line of sight along the floor from `a` to `b` ([x, y, z]): open at the waist and no step in the floor too tall. */
  function sees(a, b) {
    const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz);
    if (len < 1e-6) return true;
    const ux = dx / len, uz = dz / len;
    const hit = world.ray([a[0], a[1] + WAIST, a[2]], [ux, 0, uz], len);
    if (hit !== null && hit < len - 0.02) return false;
    let y = a[1];
    for (let s = 0.5; s < len; s += 0.5) {
      const f = world.floor(a[0] + ux * s, y, a[2] + uz * s);
      if (f === null || Math.abs(f - y) > SLOPE * 0.5) return false;
      y = f;
    }
    return true;
  }

  return {
    sees,
    /** Forget what the world answered (a new scene, a teleport). */
    reset() { floors.clear(); edges.clear(); },
    /**
     * The way from `feet` ([x, y, z]) toward `goal` ([x, z], or [x, z, y] - then reached only on its own floor): points on the floor, a metre apart. Null when the player stands
     * where there is no floor. `reached` says whether the way ends at the goal or at the nearest the plan came to it.
     * @returns {{ pts: number[][], reached: boolean }|null}
     */
    plan(feet, goal) {
      let gx = goal[0], gz = goal[1];
      const dist = Math.hypot(gx - feet[0], gz - feet[2]);
      if (dist > WINDOW_M) { gx = feet[0] + (gx - feet[0]) * WINDOW_M / dist; gz = feet[2] + (gz - feet[2]) * WINDOW_M / dist; }
      const s0 = { ix: Math.floor(feet[0] / CELL), iz: Math.floor(feet[2] / CELL), y: feet[1] };
      const gix = Math.floor(gx / CELL), giz = Math.floor(gz / CELL);
      const gy = Number.isFinite(goal[2]) ? goal[2] : null;   // the goal's height, when the game knows it: reached on its own floor, not above it
      const h = (ix, iz, y) => Math.hypot(ix - gix, iz - giz, gy === null ? 0 : (y - gy) * LEVEL_WEIGHT);
      // the player stands on the floor below their own feet, whatever height the eye reckons - not the floor at their cell's
      // centre, which can be the top of a heap of rubble beside them (every step down from it read as a ledge)
      const sf = world.floor(feet[0], feet[1], feet[2]) ?? floorOf(s0.ix, s0.iz, feet[1]);
      if (sf !== null) s0.y = sf;
      // THE START: the steps are tested from a cell's centre, and the player stands anywhere in it - where that centre is behind
      // a corner or a pillar every step out of it is shut and the trail vanished until the player moved on. Start instead from
      // the nearest cell the player can see and can step out of.
      if (sf !== null && !DIRS.some((_d, di) => step(s0, di))) {
        const near = [];
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) near.push([s0.ix + dx, s0.iz + dz]);
        near.sort((p, q) => Math.hypot((p[0] + 0.5) * CELL - feet[0], (p[1] + 0.5) * CELL - feet[2]) - Math.hypot((q[0] + 0.5) * CELL - feet[0], (q[1] + 0.5) * CELL - feet[2]));
        for (const [ix, iz] of near) {
          const cy = floorOf(ix, iz, sf);
          const cx = (ix + 0.5) * CELL - feet[0], cz = (iz + 0.5) * CELL - feet[2], cl = Math.hypot(cx, cz);
          if (cy === null || Math.abs(cy - sf) > SLOPE * (cl + 0.5)) continue;
          const hit = world.ray([feet[0], sf + WAIST, feet[2]], [cx / cl, 0, cz / cl], cl);
          if (hit !== null && hit < cl - 0.02) continue;
          const c = { ix, iz, y: cy };
          if (DIRS.some((_d, di) => step(c, di))) { s0.ix = ix; s0.iz = iz; s0.y = cy; break; }
        }
      }
      const nodes = new Map();
      const start = { ix: s0.ix, iz: s0.iz, y: s0.y, g: 0, f: WEIGHT * h(s0.ix, s0.iz, s0.y), from: null, closed: false };
      nodes.set(key(start.ix, start.iz), start);
      const heap = [start];
      const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l].f < heap[m].f) m = l; if (r < heap.length && heap[r].f < heap[m].f) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } }
        return top;
      };
      const t0 = now();
      let best = start, bestH = h(start.ix, start.iz, start.y), goalNode = null, expanded = 0;
      while (heap.length && expanded < MAX_EXPAND) {
        const n = pop();
        if (n.closed) continue;
        n.closed = true; expanded++;
        const hn = h(n.ix, n.iz, n.y);
        if (hn < bestH) { bestH = hn; best = n; }
        if (hn < 1.5) { goalNode = n; break; }
        if ((expanded & 31) === 0 && now() - t0 > BUDGET_MS) break;
        for (let di = 0; di < 8; di++) {
          const d = DIRS[di];
          if (!step(n, di)) continue;
          const ix = n.ix + d[0], iz = n.iz + d[1], k = key(ix, iz);
          const g = n.g + Math.hypot(d[0], d[1]);
          const old = nodes.get(k);
          if (old && old.g <= g) continue;
          const y = floorOf(ix, iz, n.y);
          const node = { ix, iz, y, g, f: g + WEIGHT * h(ix, iz, y), from: n, closed: false };
          nodes.set(k, node); push(node);
        }
      }
      const end = goalNode ?? best;
      /** @type {number[][]} */ const raw = [];
      for (let n = end; n; n = n.from) raw.push([(n.ix + 0.5) * CELL, n.y, (n.iz + 0.5) * CELL]);
      raw.reverse();
      raw[0] = [feet[0], world.floor(feet[0], s0.y, feet[2]) ?? s0.y, feet[2]];
      if (raw.length < 2) return sf === null ? null : { pts: raw, reached: !!goalNode };
      // string-pull: from each point on to the farthest one in sight, so the way cuts across the open and turns only at corners
      const pulled = [raw[0]];
      let i = 0;
      while (i < raw.length - 1) {
        let j = raw.length - 1;
        while (j > i + 1 && !sees(raw[i], raw[j])) j--;
        pulled.push(raw[j]); i = j;
      }
      if (goalNode) pulled.push([gx, pulled[pulled.length - 1][1], gz]);
      // round the corners: each cut back along its two legs (a third, at most 4 m) and joined, twice - a cut kept only where its
      // line is still in sight, so a turn is a curve and never a corner through a wall
      let round = pulled;
      for (let pass = 0; pass < 2 && round.length > 2; pass++) {
        const next = [round[0]];
        for (let k = 1; k < round.length - 1; k++) {
          const p = round[k - 1], q = round[k], r = round[k + 1];
          const back = (o) => { const t = Math.min(0.34, 4 / Math.max(1e-6, Math.hypot(o[0] - q[0], o[2] - q[2]))); return [q[0] + (o[0] - q[0]) * t, q[1] + (o[1] - q[1]) * t, q[2] + (o[2] - q[2]) * t]; };
          const a = back(p), b = back(r);
          if (sees(a, b)) next.push(a, b); else next.push(q);
        }
        next.push(round[round.length - 1]);
        round = next;
      }
      // a point a metre on every straight stretch, lying on the floor
      const pts = [round[0]];
      for (let k = 1; k < round.length; k++) {
        const a = pts[pts.length - 1], b = round[k];
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]), steps = Math.max(1, Math.round(len / CELL));
        let y = a[1];
        for (let s = 1; s <= steps; s++) {
          const t = s / steps, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
          const f = world.floor(x, y, z);
          y = f !== null && Math.abs(f - y) <= SLOPE * CELL ? f : y;
          pts.push([x, y, z]);
        }
      }
      return { pts, reached: !!goalNode && gx === goal[0] && gz === goal[1] };
    },
  };
}

const DOOR_RANGE_M = 40;   // a door this near a goal the street cannot reach is the way in
const INSIDE_GAP_M = 4;    // the plan ended this far short of the goal: the goal is shut in

/**
 * The way to `q` ([x, z]) - or, when the goal is shut in (the plan ends INSIDE_GAP_M or more short of it) and the host hands over
 * the street's doors (`world.doors(x, z, range)` -> [x, y, z]), the way to the door nearest the goal that can be reached. Pure but
 * for the router's cache. @param {ReturnType<typeof createRouter>} router @param {any} world @param {number[]} feet @param {number[]} q
 * @returns {{ pts: number[][], reached: boolean, door?: number[] }|null}
 */
export function planToMark(router, world, feet, q) {
  let got = router.plan(feet, q);
  const end = got?.pts[got.pts.length - 1];
  if (got && !got.reached && end && Math.hypot(end[0] - q[0], end[2] - q[1]) > INSIDE_GAP_M && typeof world?.doors === 'function') {
    const doors = world.doors(q[0], q[1], DOOR_RANGE_M).sort((a, b) => Math.hypot(a[0] - q[0], a[2] - q[1]) - Math.hypot(b[0] - q[0], b[2] - q[1]));
    for (const d of doors.slice(0, 3)) {
      const via = router.plan(feet, [d[0], d[2]]);
      if (via && via.reached) { got = { ...via, door: d }; break; }
    }
  }
  return got;
}

// THE KNOWN WAY (the player: "we NEED routes between floors through stairs, hills, walk over rock rubble and teleporters"): the
// grid search looks a window ahead on the floor it can see. Where it cannot reach the mark - another floor, the far side of a
// teleporter - the way runs over what the player's map knows (`world.known()`): every cell the player has stood on, at its own
// height, joined to its neighbours a step up or down (stairs, hills and rubble the player walked are walkable by proof), and each
// teleporter or drop taken a one-way link. The shortest such way leads to the mark - or as near it as the known places go - and
// stops at the first teleporter on it: the trail leads to the teleporter, and from its far end plans again. Nothing unwalked is
// shown, so nothing is spoiled. Pure but for its cache.
// a walked cell's neighbours, and the cells stacked over and under it in its own column: a stair climbed faster than it is crossed
// leaves several heights in one cell, and without them each flight of stairs cut the known way in two (live, Privateer's Hold)
const STACK_DIRS = [[0, 0], ...DIRS];
const KNOWN_RISE = 1.1;       // a walked cell joins a neighbour this much higher or lower (the trail keeps feet to half a metre)
const KNOWN_MAX = 20000;      // cells a known way may settle
const STEP_COST = 2;          // a teleporter or a drop, as metres walked
const _graphs = new WeakMap();
function knownGraph(known) {
  let g = _graphs.get(known);
  if (g) return g;
  /** @type {Map<string, { ix: number, y: number, iz: number, k: string }[]>} */ const at = new Map();
  for (const k of known.walked) {
    const [ix, y, iz] = String(k).split(',').map(Number);
    if (![ix, y, iz].every(Number.isFinite)) continue;
    const c = { ix, y, iz, k };
    const xz = `${ix},${iz}`;
    const list = at.get(xz);
    if (list) list.push(c); else at.set(xz, [c]);
  }
  const nearest = (x, y, z, reach) => {
    let best = null, bd = Infinity;
    const ix = Math.floor(x), iz = Math.floor(z), r = Math.ceil(reach);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) for (const c of at.get(`${ix + dx},${iz + dz}`) ?? []) {
      const d = Math.hypot(c.ix + 0.5 - x, (c.y - y) * 2, c.iz + 0.5 - z);
      if (d < bd && d <= reach * 2) { bd = d; best = c; }
    }
    return best;
  };
  /** @type {Map<string, { from: any, at: number[] }[]>} */ const stepsTo = new Map();
  /** @type {Map<string, { to: any, at: number[] }[]>} */ const stepsFrom = new Map();
  for (const s of known.steps ?? []) {
    const from = nearest(s[0], s[1], s[2], 2), to = nearest(s[3], s[4], s[5], 2);
    if (!from || !to) continue;
    const spot = [s[0], s[1], s[2]];
    (stepsTo.get(to.k) ?? stepsTo.set(to.k, []).get(to.k)).push({ from, at: spot });
    (stepsFrom.get(from.k) ?? stepsFrom.set(from.k, []).get(from.k)).push({ to, at: spot });
  }
  g = { at, stepsTo, stepsFrom, nearest };
  _graphs.set(known, g);
  return g;
}

/**
 * THE FIELD: every known cell's next step toward the goal, made once from the goal outward (walking steps join both ways; a
 * teleporter or a drop is crossed backwards from its far end), so a plan from wherever the player stands only follows the
 * pointers. The targets are the cells at the goal, or - where the known way does not reach it - the known cell nearest it.
 */
function buildField(g, goal) {
  const gy = Number.isFinite(goal[2]) ? goal[2] : null;
  const toGoal = (c) => Math.hypot(c.ix + 0.5 - goal[0], c.iz + 0.5 - goal[1], gy === null ? 0 : (c.y - gy) * LEVEL_WEIGHT);
  /** @type {Map<string, { to: any, via: number[]|null }>} */ const next = new Map();
  /** @type {Map<string, number>} */ const dist = new Map();
  const heap = [];
  const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let nearest = null, nd = Infinity, atGoal = false;
  for (const list of g.at.values()) for (const c of list) {
    const d = toGoal(c);
    if (d < 1.5) { atGoal = true; dist.set(c.k, 0); push([0, c]); }
    if (d < nd) { nd = d; nearest = c; }
  }
  if (!atGoal && nearest) { dist.set(nearest.k, 0); push([0, nearest]); }
  const done = new Set();
  while (heap.length && done.size < KNOWN_MAX) {
    const [d, c] = pop();
    if (done.has(c.k)) continue;
    done.add(c.k);
    const relax = (n, cost, via) => { const v = d + cost; if (v < (dist.get(n.k) ?? Infinity)) { dist.set(n.k, v); next.set(n.k, { to: c, via }); push([v, n]); } };
    for (const [dx, dz] of STACK_DIRS) for (const n of g.at.get(`${c.ix + dx},${c.iz + dz}`) ?? []) {
      const dy = n.y - c.y;
      if (Math.abs(dy) <= KNOWN_RISE) relax(n, Math.hypot(dx, dz, dy), null);
    }
    for (const s of g.stepsTo.get(c.k) ?? []) relax(s.from, STEP_COST, s.at);   // a step taken from s.from lands here
  }
  return { next, dist, atGoal };
}
/**
 * THE FARTHEST THE MAP KNOWS: where the walked cells the player can follow from where they stand do not reach the goal (a new place,
 * the goal's floor not found yet), the way to the one of them nearest the goal - forward from the player, by the same steps (walking
 * either way, a teleporter or a drop from its near end). Never `reached`. Null when that nearest one is where the player stands.
 */
function nearestReachable(g, start, feet, goal, world) {
  const gy = Number.isFinite(goal[2]) ? goal[2] : null;
  const toGoal = (c) => Math.hypot(c.ix + 0.5 - goal[0], c.iz + 0.5 - goal[1], gy === null ? 0 : (c.y - gy) * LEVEL_WEIGHT);
  /** @type {Map<string, { c: any, from: any, via: number[]|null }>} */ const seen = new Map([[start.k, { c: start, from: null, via: null }]]);
  const queue = [start];
  let best = start, bd = toGoal(start);
  for (let i = 0; i < queue.length && seen.size < KNOWN_MAX; i++) {
    const c = queue[i];
    const d = toGoal(c);
    if (d < bd) { bd = d; best = c; }
    const add = (n, via) => { if (!seen.has(n.k)) { seen.set(n.k, { c: n, from: c, via }); queue.push(n); } };
    for (const [dx, dz] of STACK_DIRS) for (const n of g.at.get(`${c.ix + dx},${c.iz + dz}`) ?? []) if (Math.abs(n.y - c.y) <= KNOWN_RISE) add(n, null);
    for (const s of g.stepsFrom.get(c.k) ?? []) add(s.to, s.at);
  }
  if (best === start) return null;
  /** @type {any[]} */ const chain = [];
  for (let e = seen.get(best.k); e && e.from; e = seen.get(e.from.k)) chain.push(e);
  chain.reverse();
  // the way stops at the first teleporter or drop on it, to be planned again from its far end
  /** @type {number[][]} */ const pts = [[feet[0], feet[1], feet[2]]];
  let step = false;
  for (const e of chain) {
    if (e.via) { pts.push([e.via[0], e.via[1], e.via[2]]); step = true; break; }
    const x = e.c.ix + 0.5, z = e.c.iz + 0.5, f = world?.floor?.(x, e.c.y + 0.6, z);
    pts.push([x, Number.isFinite(f) && Math.abs(f - e.c.y) < 1 ? f : e.c.y, z]);
  }
  return { pts, reached: false, step };
}

const KNOWN_REBUILD_MS = 3000;   // the field is made again at most this often while only the walked map grows
let _field = null;

/**
 * The way from `feet` ([x, y, z]) toward `goal` ([x, z] or [x, z, y]) over the known way, or null when the player stands on no
 * walked cell the way joins. Points on the floor (snapped through `world` where given), a metre apart; `reached` when it ends at
 * the goal, `step` when it ends at a teleporter or a drop to take. Pure but for its caches.
 * @param {{ walked: ReadonlyArray<string>, steps?: ReadonlyArray<ReadonlyArray<number>> }|null|undefined} known
 * @param {number[]} feet @param {number[]} goal @param {any} [world] @param {{ now?: () => number }} [o]
 * @returns {{ pts: number[][], reached: boolean, step: boolean }|null}
 */
export function planKnown(known, feet, goal, world = null, { now = () => performance.now() } = {}) {
  if (!known?.walked?.length) return null;
  const g = knownGraph(known);
  const start = g.nearest(feet[0], feet[1], feet[2], 1.2);
  if (!start || Math.abs(start.y - feet[1]) > 1.2) return null;
  const goalKey = `${Math.round(goal[0])},${Math.round(goal[1])},${Number.isFinite(goal[2]) ? Math.round(goal[2]) : '-'}`;
  const t = now();
  // the field is made again for a new goal, or - while only the walked map grows - at most every KNOWN_REBUILD_MS
  if (!_field || _field.goalKey !== goalKey || (_field.known !== known && t - _field.at >= KNOWN_REBUILD_MS)) _field = { known, goalKey, at: t, f: buildField(g, goal) };
  const { next, dist, atGoal } = _field.f;
  const inField = (c) => next.has(c.k) || dist.get(c.k) === 0;
  // where the player stands, or the nearest cell of the field within a step (a cell walked since the field was made is not in it)
  let from = inField(start) ? start : null;
  if (!from) {
    let bd = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const c of g.at.get(`${start.ix + dx},${start.iz + dz}`) ?? []) {
      const d = Math.hypot(c.ix - start.ix, c.y - start.y, c.iz - start.iz);
      if (inField(c) && Math.abs(c.y - start.y) <= KNOWN_RISE && d < bd) { bd = d; from = c; }
    }
  }
  if (!from) return nearestReachable(g, start, feet, goal, world);   // the known way to the goal does not join where the player stands
  let step = false;
  /** @type {number[][]} */ const pts = [[feet[0], feet[1], feet[2]]];
  if (from !== start) pts.push([from.ix + 0.5, from.y, from.iz + 0.5]);
  for (let c = from, n = 0; n < KNOWN_MAX; n++) {
    const hop = next.get(c.k);
    if (!hop) break;
    if (hop.via) { pts.push([hop.via[0], hop.via[1], hop.via[2]]); step = true; break; }
    c = hop.to;
    const x = c.ix + 0.5, z = c.iz + 0.5;
    const f = world?.floor?.(x, c.y + 0.6, z);
    pts.push([x, Number.isFinite(f) && Math.abs(f - c.y) < 1 ? f : c.y, z]);
  }
  const reached = atGoal && !step;
  if (reached) pts.push([goal[0], pts[pts.length - 1][1], goal[1]]);
  return { pts, reached, step };
}
