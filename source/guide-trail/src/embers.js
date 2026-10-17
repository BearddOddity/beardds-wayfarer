// The guide trail's embers: pure code, no game imports - a module is one file the page imports from a blob, so what it needs is
// bundled in (tools/build.mjs). The embers are a function of a path and the clock; nothing is simulated.
// (The same code the game's own Guide trail feature carries, systems/guideTrail.js, taken without its game-state switch.)
/** How far ahead of the player the stream shows, along the path (m). */
export const GUIDE_AHEAD_M = 30;
/** Nothing within this of the player along the path - a smear in the face (m). */
export const GUIDE_NEAR_M = 2.5;
/** The gap between embers along the path (m). */
export const GUIDE_SPACING_M = 0.6;
/** How fast the stream moves toward the goal (m/s). */
export const GUIDE_FLOW_MPS = 1.4;
/** How far the stream thins as it reaches the goal, or fades at the window's far end (m). */
export const GUIDE_ARRIVE_M = 2;
export const GUIDE_FADE_M = 8;
/** How many quads one stream can hold: a spark and a floor glow to every slot of the window, and some headroom. */
export const GUIDE_MAX_EMBERS = 2 * Math.ceil(GUIDE_AHEAD_M / GUIDE_SPACING_M) + 8;
/** The rise an ember makes off the floor over its life (m), and the lift it starts at (m). */
export const GUIDE_RISE_M = 0.55;
export const GUIDE_LIFT_M = 0.14;
/** An ember's half-extent range (m): a quad two to four decimetres across - large enough to read on a dark floor from the far end of
 *  the window, small enough to stay a spark and not a lamp. */
export const GUIDE_SIZE_M = Object.freeze([0.1, 0.2]);
/** THE FLOOR'S GLOW: under every spark a soft pool of the ember's orange lying on the floor, so the stream reads as one warm path
 *  from the far end of the window, and not as a few sparks a dark floor swallows - its half-extent (m), its lift off the floor (m)
 *  and its strongest alpha. */
export const GUIDE_POOL_M = 0.3;
export const GUIDE_POOL_LIFT_M = 0.1;
export const GUIDE_POOL_ALPHA = 0.5;
/** How far the stream winds to either side of the path (m). */
export const GUIDE_SNAKE_M = 0.35;
/** The two golds an ember is drawn between: the quest diamond's own light, and an ember's deeper orange. */
export const GUIDE_GOLD = Object.freeze([1, 0.82, 0.38]);
export const GUIDE_EMBER = Object.freeze([1, 0.55, 0.18]);

/** THE LOOKS (Shift+F4 cycles them): the two golds a spark is drawn between, the floor pool's colour, a size and a strength multiplier.
 *  Gold is the game's own; the others are for contrast and colour-blindness (a cyan or a magenta stream reads where gold and snow do not). */
export const GUIDE_STYLES = Object.freeze({
  gold: Object.freeze({ gold: GUIDE_GOLD, ember: GUIDE_EMBER, pool: Object.freeze([1, 0.6, 0.12]), size: 1, alpha: 1 }),
  ivory: Object.freeze({ gold: Object.freeze([1, 0.97, 0.85]), ember: Object.freeze([1, 0.9, 0.65]), pool: Object.freeze([0.85, 0.7, 0.35]), size: 1, alpha: 1 }),
  cyan: Object.freeze({ gold: Object.freeze([0.55, 0.95, 1]), ember: Object.freeze([0.2, 0.75, 1]), pool: Object.freeze([0.05, 0.5, 0.9]), size: 1, alpha: 1 }),
  magenta: Object.freeze({ gold: Object.freeze([1, 0.6, 0.95]), ember: Object.freeze([0.9, 0.25, 0.85]), pool: Object.freeze([0.75, 0.1, 0.7]), size: 1, alpha: 1 }),
  large: Object.freeze({ gold: GUIDE_GOLD, ember: GUIDE_EMBER, pool: Object.freeze([1, 0.6, 0.12]), size: 1.7, alpha: 1.3 }),
});
export const GUIDE_STYLE_ORDER = Object.freeze(Object.keys(GUIDE_STYLES));

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const frac = (x) => x - Math.floor(x);
/** A stable hash of an integer to [0, 1) - three independent ones off one id by the multiplier. @param {number} id @param {number} k */
function hash(id, k) {
  let h = Math.imul((id | 0) + 0x9e3779b9, 0x85ebca6b + k * 0x27d4eb2f);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The length of a polyline (m). @param {number[][]} pts */
export function polylineLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
  return L;
}

/**
 * The point of `pts` nearest `p`, by the projection of `p` on each segment: its place, how far along the path it is
 * from the start (`s`, m) and how far `p` stands off it (`d`, m). Null for an empty path. Pure.
 * @param {number[][]} pts @param {number[]} p
 * @returns {{ at: number[], s: number, d: number, seg: number }|null}
 */
export function nearestOnPath(pts, p) {
  if (!pts?.length || !p) return null;
  if (pts.length === 1) return { at: [...pts[0]], s: 0, d: Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]), seg: 0 };
  let best = null, run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const vx = b[0] - a[0], vy = b[1] - a[1], vz = b[2] - a[2], len2 = vx * vx + vy * vy + vz * vz, len = Math.sqrt(len2);
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy + (p[2] - a[2]) * vz) / len2)) : 0;
    const at = [a[0] + vx * t, a[1] + vy * t, a[2] + vz * t];
    const d = Math.hypot(p[0] - at[0], p[1] - at[1], p[2] - at[2]);
    if (!best || d < best.d) best = { at, s: run + len * t, d, seg: i - 1 };
    run += len;
  }
  return best;
}

/**
 * The stretch of `pts` AHEAD of `from`: from `from`'s projection on the path, on to `ahead` metres - or the path's end,
 * said by `truncated: false`. Null when nothing of it is left ahead (the player stands at the goal). Pure.
 * @param {number[][]} pts @param {number[]} from @param {number} [ahead]
 * @returns {{ pts: number[][], truncated: boolean }|null}
 */
export function trimAhead(pts, from, ahead = GUIDE_AHEAD_M) {
  const n = nearestOnPath(pts, from);
  if (!n || pts.length < 2) return null;
  const out = [n.at];
  let run = 0, truncated = false;
  for (let i = n.seg + 1; i < pts.length; i++) {
    const a = out[out.length - 1], b = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (!(len > 1e-6)) continue;
    if (run + len >= ahead) {
      const t = (ahead - run) / len;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      truncated = true;
      break;
    }
    out.push([b[0], b[1], b[2]]);
    run += len;
  }
  return out.length >= 2 && polylineLength(out) > 0.25 ? { pts: out, truncated } : null;
}

/**
 * A path run through a three-point average: a planned way's cells zigzag on a one-metre grid, and a stream down a
 * zigzag reads as a drunk's. The ends stay where they are. Pure.
 * @param {number[][]} pts @param {number} [passes]
 */
export function smoothPath(pts, passes = 2) {
  let cur = pts;
  for (let k = 0; k < passes && cur.length > 2; k++) {
    const next = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) next.push([(cur[i - 1][0] + 2 * cur[i][0] + cur[i + 1][0]) / 4, (cur[i - 1][1] + 2 * cur[i][1] + cur[i + 1][1]) / 4, (cur[i - 1][2] + 2 * cur[i][2] + cur[i + 1][2]) / 4]);
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

/**
 * @typedef {{ pos: number[], size: number, color: number[], alpha: number, k: number }} Ember
 */
/**
 * THE POOL: `GUIDE_MAX_EMBERS` embers made once, rewritten by every `fill`. `fill(path, t, { truncated, brightness })`
 * answers how many are live (the first `n` of `embers`); `path` is the stretch ahead already (trimAhead's). Pure of
 * everything but the pool it writes.
 */
export function createEmberField(max = GUIDE_MAX_EMBERS) {
  /** @type {Ember[]} */
  const embers = Array.from({ length: max }, () => ({ pos: [0, 0, 0], size: 0, color: [1, 1, 1], alpha: 0, k: 0 }));
  return {
    embers,
    /** @param {number[][]|null} path @param {number} t seconds @param {{ truncated?: boolean, brightness?: number, style?: typeof GUIDE_STYLES.gold }} [o] */
    fill(path, t, { truncated = true, brightness = 1, style = GUIDE_STYLES.gold } = {}) {
      if (!path || path.length < 2) return 0;
      const L = polylineLength(path);
      if (!(L > GUIDE_NEAR_M)) return 0;
      const flow = t * GUIDE_FLOW_MPS / GUIDE_SPACING_M, cycle = Math.floor(flow), off = (flow - cycle) * GUIDE_SPACING_M;
      // THE PATH'S DIRECTION AT EACH POINT (flat): the two segments that meet there averaged, and blended along each segment, so an
      // ember's sideways offset turns smoothly round a bend and does not swing when the ember crosses a corner
      const heading = [];
      for (let i = 1; i < path.length; i++) {
        const hx = path[i][0] - path[i - 1][0], hz = path[i][2] - path[i - 1][2], hl = Math.hypot(hx, hz);
        heading.push(hl > 1e-6 ? [hx / hl, hz / hl] : heading[heading.length - 1] ?? [0, 1]);
      }
      const turn = path.map((_, i) => {
        const a = heading[Math.max(0, i - 1)], b = heading[Math.min(heading.length - 1, i)];
        const x = a[0] + b[0], z = a[1] + b[1], l = Math.hypot(x, z);
        return l > 1e-6 ? [x / l, z / l] : b;
      });
      let n = 0, seg = 1, segStart = 0;
      let segLen = Math.hypot(path[1][0] - path[0][0], path[1][1] - path[0][1], path[1][2] - path[0][2]);
      for (let k = 0; n + 2 <= max; k++) {
        const a = k * GUIDE_SPACING_M + off;
        if (a >= L) break;
        while (seg < path.length - 1 && a > segStart + segLen) {
          segStart += segLen; seg++;
          segLen = Math.hypot(path[seg][0] - path[seg - 1][0], path[seg][1] - path[seg - 1][1], path[seg][2] - path[seg - 1][2]);
        }
        const id = k - cycle;   // an ember keeps its id as the stream carries it along
        const h1 = hash(id, 1), h2 = hash(id, 2), h3 = hash(id, 3);
        const env = smooth(GUIDE_NEAR_M * 0.4, GUIDE_NEAR_M, a) * smooth(0, truncated ? GUIDE_FADE_M : GUIDE_ARRIVE_M, L - a);
        if (!(env > 0.01)) continue;
        const A = path[seg - 1], B = path[seg];
        const u = segLen > 1e-6 ? (a - segStart) / segLen : 0;
        const dx = B[0] - A[0], dz = B[2] - A[2];
        const ta = turn[seg - 1], tb = turn[seg];
        const hx = ta[0] + (tb[0] - ta[0]) * u, hz = ta[1] + (tb[1] - ta[1]) * u, hl = Math.hypot(hx, hz) || 1;
        const nx = -hz / hl, nz = hx / hl;   // the side of the path here, turning smoothly along it
        const snake = Math.sin(id * 0.33) * GUIDE_SNAKE_M;   // the whole stream winds a little, the bend riding with its embers
        const sway = ((h1 - 0.5) * 0.5 + Math.sin(t * 0.9 + h2 * TAU) * 0.08) + snake;
        const phase = frac(t * 0.28 + h3);
        const pool = embers[n++]; pool.k = k;   // the floor's glow under this slot's spark: on the path itself, a slow shimmer
        pool.pos[0] = A[0] + dx * u + nx * snake; pool.pos[1] = A[1] + (B[1] - A[1]) * u + GUIDE_POOL_LIFT_M; pool.pos[2] = A[2] + dz * u + nz * snake;
        pool.alpha = Math.min(1, env * GUIDE_POOL_ALPHA * style.alpha * brightness * (0.8 + 0.2 * Math.sin(t * 2 + h2 * TAU)));
        pool.size = GUIDE_POOL_M * style.size;
        pool.color[0] = style.pool[0]; pool.color[1] = style.pool[1]; pool.color[2] = style.pool[2];   // a deep amber: the pool is a translucent stain, and amber still reads on snow where a pale gold would not
        const e = embers[n++]; e.k = k;
        e.pos[0] = A[0] + dx * u + nx * sway;
        e.pos[1] = A[1] + (B[1] - A[1]) * u + GUIDE_LIFT_M + phase * GUIDE_RISE_M;
        e.pos[2] = A[2] + dz * u + nz * sway;
        const glow = Math.pow(Math.sin(Math.PI * phase), 0.9) * (0.75 + 0.25 * Math.sin(t * 7 + h2 * 50));
        e.alpha = Math.min(1, env * glow * style.alpha * brightness);
        e.size = (GUIDE_SIZE_M[0] + h1 * (GUIDE_SIZE_M[1] - GUIDE_SIZE_M[0])) * style.size;
        for (let c = 0; c < 3; c++) e.color[c] = style.gold[c] + (style.ember[c] - style.gold[c]) * h2;
      }
      return n;
    },
  };
}


/** How long a new plan takes to take over from the one before it (s). */
export const GUIDE_BLEND_S = 0.35;
/** A new plan that starts this far (m) from the player's place on the old one is a new place, not a changed way: no blend. */
export const GUIDE_BLEND_NEAR_M = 3;
/** How slowly the stream's anchor is pulled toward the player's nearest point on the path (s): the anchor goes by the player's own
 *  steps, and this only keeps it from drifting. */
export const GUIDE_ANCHOR_S = 0.5;
/** THE LEASH: how far ahead (m) the stream's near end leans toward the player's side before it settles on the planned way. */
export const GUIDE_LEASH_M = 10;
/** The stream is led to a player up to `GUIDE_LEASH_FADE_M` off the way, led less to one farther, and not at all past `GUIDE_LEASH_MAX_M`: that
 *  is a different place, not a sidestep - and the lead fades with the distance, so it never lets go in one step. */
export const GUIDE_LEASH_FADE_M = 4;
export const GUIDE_LEASH_MAX_M = 8;

/** The stretch with its near end led to the player's side: the player's offset from the way (across it, at its start) is added to
 *  the points, fading to nothing over `GUIDE_LEASH_M` of the way. A step to the side moves the stream with the player, smoothly, and a
 *  new plan (which starts where the player stands) finds the stream already there. Pure. @param {number[][]} pts @param {number[]} feet */
export function leashed(pts, feet) {
  if (pts.length < 2) return pts;
  // the way's direction here is the chord of its first few metres, not its first segment: that turns smoothly as the stretch's start
  // moves along the way, where a segment's direction flips at every bend and would throw the offset about
  let ci = 1, cl = 0;
  while (ci < pts.length - 1 && cl < 3) { cl += Math.hypot(pts[ci][0] - pts[ci - 1][0], pts[ci][2] - pts[ci - 1][2]); ci++; }
  const tx0 = pts[ci][0] - pts[0][0], tz0 = pts[ci][2] - pts[0][2], tl = Math.hypot(tx0, tz0);
  if (!(tl > 1e-6)) return pts;
  const tx = tx0 / tl, tz = tz0 / tl, ex = feet[0] - pts[0][0], ez = feet[2] - pts[0][2], along = ex * tx + ez * tz;
  let px = ex - along * tx, pz = ez - along * tz;
  const mag = Math.hypot(px, pz), lead = 1 - smooth(GUIDE_LEASH_FADE_M, GUIDE_LEASH_MAX_M, mag);
  if (!(mag > 1e-4) || !(lead > 0)) return pts;
  px *= lead; pz *= lead;
  let run = 0;
  return pts.map((p, i) => {
    if (i > 0) run += Math.hypot(p[0] - pts[i - 1][0], p[2] - pts[i - 1][2]);
    const x = Math.min(1, run / GUIDE_LEASH_M), w = 1 - x * x * (3 - 2 * x);
    return [p[0] + px * w, p[1], p[2] + pz * w];
  });
}

/** The player this far (m) from the path is somewhere else: the anchor is put at their nearest point at once. */
export const GUIDE_ANCHOR_LOST_M = 6;

/** The stretch of `pts` from `s0` metres along it, on to `ahead` metres - trimAhead's, from a given place along the path and not the
 *  nearest point to a position. Null when little is left. Pure. */
export function trimFrom(pts, s0, ahead = GUIDE_AHEAD_M) {
  if (!pts || pts.length < 2) return null;
  let run = 0, seg = pts.length - 2, from = [...pts[pts.length - 1]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (run + len >= s0 || i === pts.length - 1) {
      const t = len > 1e-9 ? Math.min(1, Math.max(0, (s0 - run) / len)) : 0;
      from = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; seg = i - 1;
      break;
    }
    run += len;
  }
  const out = [from];
  let went = 0, truncated = false;
  for (let i = seg + 1; i < pts.length; i++) {
    const a = out[out.length - 1], b = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (!(len > 1e-6)) continue;
    if (went + len >= ahead) {
      const t = (ahead - went) / len;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      truncated = true;
      break;
    }
    out.push([b[0], b[1], b[2]]);
    went += len;
  }
  return out.length >= 2 && polylineLength(out) > 0.25 ? { pts: out, truncated } : null;
}

/** The unit direction of `pts` at `s` metres along it. Pure. */
function directionAt(pts, s) {
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (run + len >= s || i === pts.length - 1) return len > 1e-9 ? [(b[0] - a[0]) / len, (b[1] - a[1]) / len, (b[2] - a[2]) / len] : [0, 0, 0];
    run += len;
  }
  return [0, 0, 0];
}

/**
 * THE STREAM: the embers of one trail, the way `createEmberField` writes them (a stretch ahead of the player, in step with them), with
 * TWO things done for smoothness:
 *  - THE ANCHOR GOES BY THE PLAYER'S STEPS. The embers hang from a point on the path; that point used to be the player's nearest
 *    point on it, and on a path that bends the nearest point jumps along it by a metre while the player walks straight on - every
 *    ember with it. Now the point moves by the distance the player actually moved along the path's own direction, and is only
 *    pulled toward the nearest point slowly (`GUIDE_ANCHOR_S`), so a jump of the nearest point moves nothing you can see.
 *  - A NEW PLAN TAKES OVER OVER A MOMENT. The host plans again every half second, and a plan's cells never zigzag the same way
 *    twice. For `GUIDE_BLEND_S` both plans write their embers, slot for slot (an ember's slot is its index along the stretch, the
 *    same on either plan at the same moment), and each ember is drawn between the two.
 * Nothing the player does is eased, so nothing trails behind them. Pure of everything but its pools.
 */
export function createStream(max = GUIDE_MAX_EMBERS) {
  const field = createEmberField(max), old = createEmberField(max);
  /** @type {{ path: number[][], s: number, feet: number[] }|null} */ let cur = null, prev = null;
  let since = 0, lastT = null;
  const track = (path, feet) => ({ path, s: nearestOnPath(path, feet)?.s ?? 0, feet: [...feet] });
  /** The anchor on one plan, moved by the player's steps and pulled a little toward their nearest point. */
  const advance = (tr, feet, dt) => {
    const near = nearestOnPath(tr.path, feet);
    if (!near) return;
    if (near.d > GUIDE_ANCHOR_LOST_M) { tr.s = near.s; tr.feet = [...feet]; return; }
    const d = directionAt(tr.path, tr.s);
    const pred = tr.s + (feet[0] - tr.feet[0]) * d[0] + (feet[1] - tr.feet[1]) * d[1] + (feet[2] - tr.feet[2]) * d[2];
    tr.s = pred + (near.s - pred) * (1 - Math.exp(-dt / GUIDE_ANCHOR_S));
    tr.feet = [...feet];
  };
  return {
    embers: field.embers,
    /** @param {number[][]|null} path the whole way @param {number[]|null} feet @param {number} t seconds
     *  @param {{ ahead?: number, brightness?: number, style?: typeof GUIDE_STYLES.gold }} [o] @returns {number} how many are live */
    fill(path, feet, t, { ahead = GUIDE_AHEAD_M, brightness = 1, style = GUIDE_STYLES.gold } = {}) {
      if (!path || path.length < 2 || !feet) { cur = prev = null; lastT = null; return 0; }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (!cur || path !== cur.path) {
        const on = cur ? nearestOnPath(cur.path, feet) : null;
        prev = on && on.d <= GUIDE_BLEND_NEAR_M ? cur : null; since = t; cur = track(path, feet);
      } else advance(cur, feet, dt);
      if (prev) advance(prev, feet, dt);
      const stretch = trimFrom(cur.path, cur.s, ahead);
      if (!stretch) return 0;
      const n = field.fill(leashed(stretch.pts, feet), t, { truncated: stretch.truncated, brightness, style });
      const x = prev ? (t - since) / GUIDE_BLEND_S : 1;
      if (!(x < 1)) { prev = null; return n; }
      const before = trimFrom(prev.path, prev.s, ahead);
      if (!before) return n;
      const nOld = old.fill(leashed(before.pts, feet), t, { truncated: before.truncated, brightness, style });
      const w = x <= 0 ? 0 : x * x * (3 - 2 * x), byKey = new Map();
      for (let i = 0; i < nOld; i++) byKey.set(`${i & 1}:${old.embers[i].k}`, old.embers[i]);   // a floor pool is even, a spark odd
      for (let i = 0; i < n; i++) {
        const was = byKey.get(`${i & 1}:${field.embers[i].k}`);
        if (!was) continue;
        const e = field.embers[i];
        for (let c = 0; c < 3; c++) e.pos[c] = was.pos[c] + (e.pos[c] - was.pos[c]) * w;
      }
      return n;
    },
  };
}
