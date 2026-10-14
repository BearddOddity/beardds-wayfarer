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
 * @typedef {{ pos: number[], size: number, color: number[], alpha: number }} Ember
 */
/**
 * THE POOL: `GUIDE_MAX_EMBERS` embers made once, rewritten by every `fill`. `fill(path, t, { truncated, brightness })`
 * answers how many are live (the first `n` of `embers`); `path` is the stretch ahead already (trimAhead's). Pure of
 * everything but the pool it writes.
 */
export function createEmberField(max = GUIDE_MAX_EMBERS) {
  /** @type {Ember[]} */
  const embers = Array.from({ length: max }, () => ({ pos: [0, 0, 0], size: 0, color: [1, 1, 1], alpha: 0 }));
  return {
    embers,
    /** @param {number[][]|null} path @param {number} t seconds @param {{ truncated?: boolean, brightness?: number, style?: typeof GUIDE_STYLES.gold }} [o] */
    fill(path, t, { truncated = true, brightness = 1, style = GUIDE_STYLES.gold } = {}) {
      if (!path || path.length < 2) return 0;
      const L = polylineLength(path);
      if (!(L > GUIDE_NEAR_M)) return 0;
      const flow = t * GUIDE_FLOW_MPS / GUIDE_SPACING_M, cycle = Math.floor(flow), off = (flow - cycle) * GUIDE_SPACING_M;
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
        const dx = B[0] - A[0], dz = B[2] - A[2], dl = Math.hypot(dx, dz);
        const snake = Math.sin(id * 0.33) * GUIDE_SNAKE_M;   // the whole stream winds a little, the bend riding with its embers
        const sway = ((h1 - 0.5) * 0.5 + Math.sin(t * 0.9 + h2 * TAU) * 0.08) + snake;
        const phase = frac(t * 0.28 + h3);
        const pool = embers[n++];   // the floor's glow under this slot's spark: on the path itself, a slow shimmer
        pool.pos[0] = A[0] + dx * u + (dl > 1e-6 ? -dz / dl * snake : 0); pool.pos[1] = A[1] + (B[1] - A[1]) * u + GUIDE_POOL_LIFT_M; pool.pos[2] = A[2] + dz * u + (dl > 1e-6 ? dx / dl * snake : 0);
        pool.alpha = Math.min(1, env * GUIDE_POOL_ALPHA * style.alpha * brightness * (0.8 + 0.2 * Math.sin(t * 2 + h2 * TAU)));
        pool.size = GUIDE_POOL_M * style.size;
        pool.color[0] = style.pool[0]; pool.color[1] = style.pool[1]; pool.color[2] = style.pool[2];   // a deep amber: the pool is a translucent stain, and amber still reads on snow where a pale gold would not
        const e = embers[n++];
        e.pos[0] = A[0] + dx * u + (dl > 1e-6 ? -dz / dl * sway : 0);
        e.pos[1] = A[1] + (B[1] - A[1]) * u + GUIDE_LIFT_M + phase * GUIDE_RISE_M;
        e.pos[2] = A[2] + dz * u + (dl > 1e-6 ? dx / dl * sway : 0);
        const glow = Math.pow(Math.sin(Math.PI * phase), 0.9) * (0.75 + 0.25 * Math.sin(t * 7 + h2 * 50));
        e.alpha = Math.min(1, env * glow * style.alpha * brightness);
        e.size = (GUIDE_SIZE_M[0] + h1 * (GUIDE_SIZE_M[1] - GUIDE_SIZE_M[0])) * style.size;
        for (let c = 0; c < 3; c++) e.color[c] = style.gold[c] + (style.ember[c] - style.gold[c]) * h2;
      }
      return n;
    },
  };
}

